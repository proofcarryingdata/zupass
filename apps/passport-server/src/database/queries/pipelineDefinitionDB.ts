import _ from "lodash";
import { Pool, PoolClient } from "postgres-pool";
import {
  PipelineDefinition,
  PipelineType
} from "../../services/generic-issuance/pipelines/types";
import { GenericIssuancePipelineDB } from "../models";
import { sqlQuery, sqlTransaction } from "../sqlQuery";

/**
 * This doesn't follow the general convention we've had so far of queries
 * being functions exported from js modules, but I've done it this way to
 * facilitate simpler prototyping while we figure out what the schemas for
 * stuff should be. I actually kind of like encapsulating stuff like this in
 * interfaces, but it doesn't strictly have to end up that way for production.
 */
export interface IPipelineDefinitionDB {
  loadPipelineDefinitions(): Promise<PipelineDefinition[]>;
  clearAllDefinitions(): Promise<void>;
  getDefinition(definitionID: string): Promise<PipelineDefinition | undefined>;
  setDefinition(definition: PipelineDefinition): Promise<void>;
  setDefinitions(definitions: PipelineDefinition[]): Promise<void>;
}

/**
 * Implements the above interface with the Postgres DB as back-end.
 * In reality we are probably going to want more fine-grained APIs - rather
 * than updating the entire definition, we are going to want to do things like
 * "change owner", "add editor" or "remove editor". The approach below is
 * simply for the MVP.
 */
export class PipelineDefinitionDB implements IPipelineDefinitionDB {
  private db: Pool;

  public constructor(db: Pool) {
    this.db = db;
  }

  public async loadPipelineDefinitions(): Promise<PipelineDefinition[]> {
    const result = await sqlQuery(
      this.db,
      `
      SELECT p.*, ARRAY_AGG(e.editor_id) AS editor_user_ids
      FROM generic_issuance_pipelines p
      INNER JOIN generic_issuance_pipeline_editors e
      ON p.id = e.pipeline_id
      GROUP BY p.id`
    );

    return result.rows.map((row: GenericIssuancePipelineDB) => ({
      id: row.id,
      ownerUserId: row.owner_user_id,
      editorUserIds: row.editor_user_ids,
      type: row.pipeline_type as PipelineType,
      options: row.config
    }));
  }

  public async clearAllDefinitions(): Promise<void> {
    await sqlQuery(this.db, "DELETE FROM pipeline_definitions");
  }

  public async getDefinition(
    definitionID: string
  ): Promise<PipelineDefinition | undefined> {
    const result = await sqlQuery(
      this.db,
      `
      SELECT p.*, ARRAY_AGG(e.editor_id) AS editor_user_ids
      FROM generic_issuance_pipelines p
      INNER JOIN generic_issuance_pipeline_editors e
      ON p.id = e.pipeline_id
      WHERE p.id = $1
      GROUP BY p.id`,
      [definitionID]
    );

    if (result.rowCount === 0) {
      return undefined;
    } else {
      const row = result.rows[0];
      return {
        id: row.id,
        ownerUserId: row.owner_user_id,
        editorUserIds: row.editor_user_ids,
        type: row.pipeline_type,
        options: row.config
      };
    }
  }

  /**
   * Sets a pipeline definition. This is used to either insert or update a
   * definition. If inserting, the caller is responsible for generating a UUID
   * as the pipeline ID.
   */
  public async setDefinition(definition: PipelineDefinition): Promise<void> {
    await sqlTransaction(
      this.db,
      "Insert or update pipeline definition",
      async (client: PoolClient) => {
        const pipeline: GenericIssuancePipelineDB = (
          await client.query(
            `
        INSERT INTO generic_issuance_pipelines (id, owner_user_id, pipeline_type, config) VALUES($1, $2, $3, $4)
        ON CONFLICT(id) DO UPDATE
        SET (owner_user_id, pipeline_type, config) = ($2, $3, $4)
        RETURNING *
        `,
            [
              definition.id,
              definition.type,
              definition.ownerUserId,
              definition.options
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

          await client.query(
            `DELETE FROM generic_issuance_pipeline_editors WHERE editor_id = ANY($1)`,
            [[editorsToRemove]]
          );

          for (const editorId of editorsToAdd) {
            await client.query(
              "INSERT INTO generic_issuance_pipeline_editors (pipeline_id, editor_id) VALUES($1, $2)",
              [pipeline.id, editorId]
            );
          }
        }
      }
    );
  }

  public async setDefinitions(
    definitions: PipelineDefinition[]
  ): Promise<void> {
    for (const definition of definitions) {
      await this.setDefinition(definition);
    }
  }
}
