import {
  PipelineDefinition,
  PipelineHistoryEntry,
  PipelineLoadSummary,
  PipelineType
} from "@pcd/passport-interface";
import _ from "lodash";
import { PoolClient } from "postgres-pool";
import { GenericIssuancePipelineRow } from "../models";
import { sqlQuery } from "../sqlQuery";

/**
 * This doesn't follow the general convention we've had so far of queries
 * being functions exported from js modules, but I've done it this way to
 * facilitate simpler prototyping while we figure out what the schemas for
 * stuff should be. I actually kind of like encapsulating stuff like this in
 * interfaces, but it doesn't strictly have to end up that way for production.
 */
export interface IPipelineDefinitionDB {
  loadPipelineDefinitions(client: PoolClient): Promise<PipelineDefinition[]>;
  deleteDefinition(client: PoolClient, pipelineId: string): Promise<void>;
  deleteAllDefinitions(client: PoolClient): Promise<void>;
  getDefinition(
    client: PoolClient,
    pipelineId: string
  ): Promise<PipelineDefinition | undefined>;
  upsertDefinition(
    client: PoolClient,
    definition: PipelineDefinition,
    editorUserId: string | undefined
  ): Promise<void>;
  upsertDefinitions(
    client: PoolClient,
    definitions: PipelineDefinition[]
  ): Promise<void>;
  saveLoadSummary(
    client: PoolClient,
    pipelineId: string,
    lastRunInfo?: PipelineLoadSummary
  ): Promise<void>;
  getLastLoadSummary(
    client: PoolClient,
    pipelineId: string
  ): Promise<PipelineLoadSummary | undefined>;
  appendToEditHistory(
    client: PoolClient,
    pipelineDefinition: PipelineDefinition,
    editorUserId: string
  ): Promise<void>;
  getEditHistory(
    client: PoolClient,
    pipelineId: string,
    maxQuantity?: number
  ): Promise<PipelineHistoryEntry[]>;
}

/**
 * Implements the above interface with the Postgres DB as back-end.
 */
export class PipelineDefinitionDB implements IPipelineDefinitionDB {
  private runInfos: Record<string, PipelineLoadSummary | undefined> = {};

  /**
   * Gets the last {@link PipelineLoadSummary} from an in-memory store for the
   * {@link Pipeline} identified by the @param pipelineId.
   */
  public async getLastLoadSummary(
    client: PoolClient,
    pipelineId: string
  ): Promise<PipelineLoadSummary | undefined> {
    return this.runInfos[pipelineId];
  }

  /**
   * Saves a {@link PipelineLoadSummary} to in-memory store for a {@link Pipeline}
   * identified by the @param pipelineId.
   */
  public async saveLoadSummary(
    client: PoolClient,
    pipelineId: string,
    lastRunInfo: PipelineLoadSummary | undefined
  ): Promise<void> {
    this.runInfos[pipelineId] = lastRunInfo;
  }

  /**
   * Loads all {@link PipelineDefinition}s from the database.
   *
   * @todo use `zod` to ensure these are properly formatted.
   */
  public async loadPipelineDefinitions(
    client: PoolClient
  ): Promise<PipelineDefinition[]> {
    const result = await sqlQuery(
      client,
      `
      SELECT p.*, ARRAY_AGG(e.editor_id) AS editor_user_ids
      FROM generic_issuance_pipelines p
      LEFT JOIN generic_issuance_pipeline_editors e
      ON p.id = e.pipeline_id
      GROUP BY p.id`
    );

    return result.rows.map(
      (row: GenericIssuancePipelineRow): PipelineDefinition =>
        ({
          id: row.id,
          ownerUserId: row.owner_user_id,
          editorUserIds: row.editor_user_ids.filter(
            (editorId: unknown) => typeof editorId === "string"
          ),
          timeCreated: row.time_created.toISOString(),
          timeUpdated: row.time_updated.toISOString(),
          type: row.pipeline_type as PipelineType,
          options: row.config
        }) satisfies PipelineDefinition
    );
  }

  /**
   * Deletes all {@link PipelineDefinition} from the database.
   */
  public async deleteAllDefinitions(client: PoolClient): Promise<void> {
    await sqlQuery(client, "DELETE FROM generic_issuance_pipeline_editors");
    await sqlQuery(client, "DELETE FROM generic_issuance_pipelines");
  }

  /**
   * Deletes a particular {@link PipelineDefinition} from the database.
   */
  public async deleteDefinition(
    client: PoolClient,
    pipelineId: string
  ): Promise<void> {
    await client.query(
      "DELETE FROM generic_issuance_pipeline_editors WHERE pipeline_id = $1",
      [pipelineId]
    );
    await client.query("DELETE FROM generic_issuance_pipelines WHERE id = $1", [
      pipelineId
    ]);
  }

  /**
   * Loads a particular {@link PipelineDefinition} from the database, if one
   * exists.
   *
   * @todo use `zod` to parse this.
   */
  public async getDefinition(
    client: PoolClient,
    definitionID: string
  ): Promise<PipelineDefinition | undefined> {
    const result = await sqlQuery(
      client,
      `
      SELECT p.*, ARRAY_AGG(e.editor_id) AS editor_user_ids
      FROM generic_issuance_pipelines p
      LEFT JOIN generic_issuance_pipeline_editors e
      ON p.id = e.pipeline_id
      WHERE p.id = $1
      GROUP BY p.id`,
      [definitionID]
    );

    if (result.rowCount === 0) {
      return undefined;
    } else {
      const row: GenericIssuancePipelineRow = result.rows[0];
      return {
        id: row.id,
        ownerUserId: row.owner_user_id,
        editorUserIds: row.editor_user_ids.filter(
          (editorId: unknown) => typeof editorId === "string"
        ),
        timeCreated: row.time_created.toISOString(),
        timeUpdated: row.time_updated.toISOString(),
        type: row.pipeline_type as PipelineType,
        options: row.config
      };
    }
  }

  /**
   * Sets a pipeline definition. This is used to either insert or update a
   * definition. If inserting, the caller is responsible for generating a UUID
   * as the pipeline ID.
   */
  public async upsertDefinition(
    client: PoolClient,
    definition: PipelineDefinition,
    editorUserId: string | undefined
  ): Promise<void> {
    await this.appendToEditHistory(client, definition, editorUserId);

    const pipeline: GenericIssuancePipelineRow = (
      await client.query(
        `
        INSERT INTO generic_issuance_pipelines (id, owner_user_id, pipeline_type, config) VALUES($1, $2, $3, $4)
        ON CONFLICT(id) DO UPDATE
        SET (owner_user_id, pipeline_type, config, time_updated) = ($2, $3, $4, NOW())
        RETURNING *
        `,
        [
          definition.id,
          definition.ownerUserId,
          definition.type,
          JSON.stringify(definition.options)
        ]
      )
    ).rows[0];

    pipeline.editor_user_ids = (
      await client.query(
        `SELECT editor_id FROM generic_issuance_pipeline_editors WHERE pipeline_id = $1`,
        [definition.id]
      )
    ).rows.map((row) => row.editor_id);

    if (!_.isEqual(pipeline.editor_user_ids, definition.editorUserIds)) {
      const editorsToRemove = _.difference(
        pipeline.editor_user_ids,
        definition.editorUserIds
      );
      const editorsToAdd = _.difference(
        definition.editorUserIds,
        pipeline.editor_user_ids
      );

      if (editorsToRemove.length > 0) {
        await client.query(
          `DELETE FROM generic_issuance_pipeline_editors WHERE editor_id = ANY($1)`,
          [[editorsToRemove]]
        );
      }

      if (editorsToAdd.length > 0) {
        for (const editorId of editorsToAdd) {
          await client.query(
            "INSERT INTO generic_issuance_pipeline_editors (pipeline_id, editor_id) VALUES($1, $2)",
            [pipeline.id, editorId]
          );
        }
      }
    }
  }

  /**
   * Bulk version of {@link upsertDefinition}.
   */
  public async upsertDefinitions(
    client: PoolClient,
    definitions: PipelineDefinition[]
  ): Promise<void> {
    for (const definition of definitions) {
      await this.upsertDefinition(client, definition, undefined);
    }
  }

  public async appendToEditHistory(
    client: PoolClient,
    pipelineDefinition: PipelineDefinition,
    editorUserId?: string
  ): Promise<void> {
    await client.query(
      `
    insert into podbox_edit_history
    (pipeline, editor_user_id, time_created)
    values
    ($1, $2, $3);`,
      [pipelineDefinition, editorUserId, new Date()]
    );
  }

  public async getEditHistory(
    client: PoolClient,
    pipelineId: string,
    maxQuantity?: number
  ): Promise<PipelineHistoryEntry[]> {
    const res = await client.query(
      `
    select * from podbox_edit_history
    where pipeline->>'id' = $1
    order by time_created asc
    limit $2`,
      [pipelineId, maxQuantity ?? 20]
    );
    return res.rows.map(
      (row: PipelineHistoryRow) =>
        ({
          id: row.id,
          pipeline: row.pipeline,
          timeCreated: row.time_created.toISOString(),
          editorUserId: row.editor_user_id ?? undefined
        }) satisfies PipelineHistoryEntry
    );
  }
}

interface PipelineHistoryRow {
  id: string;
  pipeline: PipelineDefinition;
  time_created: Date;
  editor_user_id?: string;
}
