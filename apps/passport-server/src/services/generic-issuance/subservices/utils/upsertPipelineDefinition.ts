import { getActiveSpan } from "@opentelemetry/api/build/src/trace/context-utils";
import {
  PipelineDefinition,
  PipelineDefinitionSchema,
  isCSVPipelineDefinition
} from "@pcd/passport-interface";
import { onlyDefined, str } from "@pcd/util";
import _ from "lodash";
import { PoolClient } from "postgres-pool";
import { v4 as uuidv4 } from "uuid";
import { PCDHTTPError } from "../../../../routing/pcdHttpError";
import { logger } from "../../../../util/logger";
import { tracePipeline, traceUser } from "../../honeycombQueries";
import { PipelineUser } from "../../pipelines/types";
import { PipelineExecutorSubservice } from "../PipelineExecutorSubservice";
import { PipelineSubservice } from "../PipelineSubservice";
import { UserSubservice } from "../UserSubservice";
import { uniqueIdsForPipelineDefinition } from "./pipelineUniqueIds";

const LOG_TAG = "upsertPipelineDefinition";

export interface UpsertPipelineResult {
  definition: PipelineDefinition;
  restartPromise: Promise<void>;
}

/**
 * Extracted from {@link PipelineExecutorSubservice} for readability.
 *
 * Attempts to upsert the given {@link PipelineDefinition} on behalf of the given
 * {@link PipelineUser}, and (re)starts the corresponding {@link Pipeline} as
 * represented in {@link PipelineExecutorSubservice} by a {@link PipelineSlot}.
 */
export async function upsertPipelineDefinition(
  client: PoolClient,
  editor: PipelineUser,
  newDefinition: PipelineDefinition,
  userSubservice: UserSubservice,
  pipelineSubservice: PipelineSubservice,
  executorSubservice: PipelineExecutorSubservice
): Promise<UpsertPipelineResult> {
  traceUser(editor);
  const ids = uniqueIdsForPipelineDefinition(newDefinition);
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      throw new PCDHTTPError(
        401,
        `ID ${id} is used more than once in this pipeline`
      );
    }
    seen.add(id);
  }

  const otherPipelines = (
    await pipelineSubservice.loadPipelineDefinitions(client)
  ).filter((definition) => definition.id !== newDefinition.id);

  for (const definition of otherPipelines) {
    const otherPipelineIds = new Set(
      uniqueIdsForPipelineDefinition(definition).values()
    );

    for (const id of ids) {
      if (otherPipelineIds.has(id)) {
        const otherPipelineName = definition.options.name
          ? `${definition.options.name} (${definition.id})`
          : `pipeline ${definition.id}`;
        throw new PCDHTTPError(
          401,
          `ID ${id} is already in use by ${otherPipelineName} and cannot be used by this pipeline`
        );
      }
    }
  }

  const existingPipelineDefinition =
    await pipelineSubservice.loadPipelineDefinition(client, newDefinition.id);
  const existingSlot = executorSubservice
    .getAllPipelineSlots()
    .find((slot) => slot.definition.id === existingPipelineDefinition?.id);

  if (existingPipelineDefinition) {
    if (existingPipelineDefinition.timeUpdated !== newDefinition.timeUpdated) {
      throw new PCDHTTPError(
        400,
        "this pipeline was updated by someone else while you were editing it.\n\n" +
          "please refresh and try again.\n\n" +
          "your edit timestamp: " +
          newDefinition.timeUpdated +
          "\n" +
          "server edit timestamp: " +
          existingPipelineDefinition.timeUpdated
      );
    }
    getActiveSpan()?.setAttribute("is_new", false);
    pipelineSubservice.ensureUserHasPipelineDefinitionAccess(
      editor,
      existingPipelineDefinition
    );

    if (existingPipelineDefinition.ownerUserId !== newDefinition.ownerUserId) {
      if (!editor.isAdmin) {
        throw new PCDHTTPError(400, "Cannot change owner of pipeline");
      }
      if (
        (await userSubservice.getUserById(
          client,
          newDefinition.ownerUserId
        )) === undefined
      ) {
        throw new PCDHTTPError(
          400,
          "Cannot change owner of pipeline to user that doesn't exist"
        );
      }
    }

    if (
      !editor.isAdmin &&
      !_.isEqual(
        existingPipelineDefinition.options.alerts,
        newDefinition.options.alerts
      )
    ) {
      throw new PCDHTTPError(400, "Cannot change alerts of pipeline");
    }
  } else {
    // NEW PIPELINE!
    getActiveSpan()?.setAttribute("is_new", true);
    newDefinition.ownerUserId = editor.id;
    if (!newDefinition.id) {
      newDefinition.id = uuidv4();
    }
    newDefinition.editorUserIds = (
      await Promise.all(
        newDefinition.editorUserIds.map((id) =>
          userSubservice.getUserById(client, id)
        )
      ).then(onlyDefined)
    ).map((u) => u.id);

    if (!editor.isAdmin && !!newDefinition.options.alerts) {
      throw new PCDHTTPError(400, "Cannot create pipeline with alerts");
    }
  }

  let validatedNewDefinition: PipelineDefinition = newDefinition;

  try {
    validatedNewDefinition = PipelineDefinitionSchema.parse(
      newDefinition
    ) as PipelineDefinition;
  } catch (e) {
    logger(LOG_TAG, "invalid pipeline definition", e);
    throw new PCDHTTPError(400, `Invalid Pipeline Definition: ${e}`);
  }

  if (isCSVPipelineDefinition(validatedNewDefinition)) {
    if (validatedNewDefinition.options.csv.length > 80000) {
      throw new Error("csv too large");
    }
  }

  logger(
    LOG_TAG,
    `executing upsert of pipeline ${str(validatedNewDefinition)}`
  );
  tracePipeline(validatedNewDefinition);
  await pipelineSubservice.saveDefinition(
    client,
    validatedNewDefinition,
    editor.id
  );

  if (existingSlot) {
    const lastLoadSummary = await pipelineSubservice.getLastLoadSummary(
      newDefinition.id
    );
    if (lastLoadSummary && !lastLoadSummary?.success) {
      await pipelineSubservice.saveLoadSummary(
        validatedNewDefinition.id,
        undefined
      );
    } else if (validatedNewDefinition.options.paused) {
      // it's important that we clear the loadPromise before stopping the pipeline,
      // so that the `AbortError` that is thrown by the `stop()` method can be
      // handled properly upstream.
      if (existingSlot.instance && !existingSlot.instance.isStopped()) {
        await existingSlot.instance?.stop();
        existingSlot.loading = false;
      }

      if (validatedNewDefinition.options.disableCache) {
        await pipelineSubservice.saveLoadSummary(
          validatedNewDefinition.id,
          undefined
        );
        await pipelineSubservice.clearAtoms(validatedNewDefinition.id);
      }
    } else {
      // TODO: maybe still keep these around until the load finishes even without
      // the caching feature enabled? Alternately, make the env var toggle actually
      // writing to the file system vs. turning off the intra-instance caching.
      if (validatedNewDefinition.options.disableCache) {
        await pipelineSubservice.saveLoadSummary(
          validatedNewDefinition.id,
          undefined
        );
        await pipelineSubservice.clearAtoms(validatedNewDefinition.id);
      } else {
        await pipelineSubservice.resetToCache(validatedNewDefinition.id);
      }
    }

    existingSlot.loading = true;
    existingSlot.owner = await userSubservice.getUserById(
      client,
      validatedNewDefinition.ownerUserId
    );
  }

  // purposely not awaited as this also performs a Pipeline load,
  // which can take an arbitrary amount of time.
  const restartPromise = executorSubservice.restartPipeline(
    client,
    validatedNewDefinition.id,
    true
  );

  // To get accurate timestamps, we need to load the pipeline definition
  const savedDefinition = await pipelineSubservice.getPipeline(
    client,
    validatedNewDefinition.id
  );
  if (savedDefinition === undefined) {
    throw new PCDHTTPError(
      400,
      `Unable to load pipeline ${validatedNewDefinition.id} from database`
    );
  } else {
    return {
      definition: savedDefinition,
      restartPromise
    } satisfies UpsertPipelineResult;
  }
}
