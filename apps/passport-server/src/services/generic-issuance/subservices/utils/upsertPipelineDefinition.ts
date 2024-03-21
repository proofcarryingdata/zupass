import { getActiveSpan } from "@opentelemetry/api/build/src/trace/context-utils";
import {
  PipelineDefinition,
  PipelineDefinitionSchema,
  isCSVPipelineDefinition
} from "@pcd/passport-interface";
import { str } from "@pcd/util";
import _ from "lodash";
import { v4 as uuidv4 } from "uuid";
import { PCDHTTPError } from "../../../../routing/pcdHttpError";
import { logger } from "../../../../util/logger";
import { tracePipeline, traceUser } from "../../honeycombQueries";
import { PipelineUser } from "../../pipelines/types";
import { PipelineExecutorSubservice } from "../PipelineExecutorSubservice";
import { PipelineSubservice } from "../PipelineSubservice";
import { UserSubservice } from "../UserSubservice";

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
  editor: PipelineUser,
  newDefinition: PipelineDefinition,
  userSubservice: UserSubservice,
  pipelineSubservice: PipelineSubservice,
  executorSubservice: PipelineExecutorSubservice
): Promise<UpsertPipelineResult> {
  traceUser(editor);
  // TODO: do this in a transaction
  const existingPipelineDefinition =
    await pipelineSubservice.loadPipelineDefinition(newDefinition.id);
  const existingSlot = executorSubservice
    .getAllPipelineSlots()
    .find((slot) => slot.definition.id === existingPipelineDefinition?.id);

  if (existingPipelineDefinition) {
    getActiveSpan()?.setAttribute("is_new", false);
    pipelineSubservice.ensureUserHasPipelineDefinitionAccess(
      editor,
      existingPipelineDefinition
    );

    if (
      existingPipelineDefinition.ownerUserId !== newDefinition.ownerUserId &&
      !editor.isAdmin
    ) {
      throw new PCDHTTPError(400, "Cannot change owner of pipeline");
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
    newDefinition.id = uuidv4();
    newDefinition.timeCreated = new Date().toISOString();
    newDefinition.timeUpdated = new Date().toISOString();

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
  await pipelineSubservice.saveDefinition(validatedNewDefinition, editor.id);
  if (existingSlot) {
    existingSlot.owner = await userSubservice.getUserById(
      validatedNewDefinition.ownerUserId
    );
  }
  await pipelineSubservice.saveLoadSummary(
    validatedNewDefinition.id,
    undefined
  );
  await pipelineSubservice.clearAtomsForPipeline(validatedNewDefinition.id);

  // purposely not awaited as this also performs a Pipeline load,
  // which can take an arbitrary amount of time.
  const restartPromise = executorSubservice.restartPipeline(
    validatedNewDefinition.id
  );

  return {
    definition: validatedNewDefinition,
    restartPromise
  } satisfies UpsertPipelineResult;
}
