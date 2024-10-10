import { QueryResultRow } from "pg";
import { PoolClient } from "postgres-pool";
import { sqlQuery } from "../sqlQuery";

/**
 * Implements storage for Semaphore group histories. From a data storage
 * perspective, a group is the sum of its history records, with the most recent
 * history entry being the current state of the group.
 */
export interface IPipelineSemaphoreHistoryDB {
  /**
   * Groups belong to pipelines. This method should return the latest history
   * entry for each group belonging to the pipeline.
   */
  getLatestGroupsForPipeline(
    client: PoolClient,
    pipelineId: string
  ): Promise<PipelineSemaphoreGroupHistory[]>;
  /**
   * Adds a history entry.
   */
  addGroupHistoryEntry(
    client: PoolClient,
    pipelineId: string,
    groupId: string,
    rootHash: string,
    serializedGroup: string
  ): Promise<void>;
  /**
   * Gets the latest history entry for a specific group.
   */
  getLatestHistoryForGroup(
    client: PoolClient,
    pipelineId: string,
    groupId: string
  ): Promise<PipelineSemaphoreGroupHistory | undefined>;
  /**
   * Gets the history entry for a group with a specific root hash.
   */
  getHistoricalGroup(
    client: PoolClient,
    pipelineId: string,
    groupId: string,
    rootHash: string
  ): Promise<PipelineSemaphoreGroupHistory | undefined>;
  /**
   * Deletes all history for a group.
   */
  deleteGroupHistory(
    client: PoolClient,
    pipelineId: string,
    groupId: string
  ): Promise<void>;
}

export class PipelineSemaphoreHistoryDB implements IPipelineSemaphoreHistoryDB {
  /**
   * Gets the latest Semaphore group data for each group on a pipeline.
   */
  public async getLatestGroupsForPipeline(
    client: PoolClient,
    pipelineId: string
  ): Promise<PipelineSemaphoreGroupHistory[]> {
    const result = await sqlQuery(
      client,
      `
      SELECT DISTINCT ON (group_id) id, pipeline_id, group_id, root_hash, serialized_group, time_created
      FROM generic_issuance_semaphore_history
      WHERE pipeline_id = $1
      ORDER BY group_id, id DESC`,
      [pipelineId]
    );

    return result.rows.map(rowToGroupHistory);
  }

  /**
   * Returns the latest history entry for a specific group.
   */
  public async getLatestHistoryForGroup(
    client: PoolClient,
    pipelineId: string,
    groupId: string
  ): Promise<PipelineSemaphoreGroupHistory | undefined> {
    const result = await sqlQuery(
      client,
      `
      SELECT DISTINCT ON (group_id) id, pipeline_id, group_id, root_hash, serialized_group, time_created
      FROM generic_issuance_semaphore_history
      WHERE pipeline_id = $1 AND group_id = $2
      ORDER BY group_id, id DESC`,
      // Pipeline ID is technically redundant here since group IDs are already
      // globally unique.
      [pipelineId, groupId]
    );

    return result.rowCount === 0
      ? undefined
      : rowToGroupHistory(result.rows[0]);
  }

  /**
   * Adds a new entry to the history for a group, becoming the latest entry.
   * Causes the serial `id` field to increment, which is used to determine the
   * order of historic entries for the `getLatestGroups` query.
   */
  public async addGroupHistoryEntry(
    client: PoolClient,
    pipelineId: string,
    groupId: string,
    rootHash: string,
    serializedGroup: string
  ): Promise<void> {
    await sqlQuery(
      client,
      `
    INSERT INTO generic_issuance_semaphore_history (pipeline_id, group_id, root_hash, serialized_group, time_created)
    VALUES($1, $2, $3, $4, $5)
    `,
      [pipelineId, groupId, rootHash, serializedGroup, new Date()]
    );
  }

  /**
   * Deletes the history of a Semaphore group.
   */
  public async deleteGroupHistory(
    client: PoolClient,
    pipelineId: string,
    groupId: string
  ): Promise<void> {
    await sqlQuery(
      client,
      "DELETE FROM generic_issuance_semaphore_history WHERE pipeline_id = $1 AND group_id = $2",
      [pipelineId, groupId]
    );
  }

  /**
   * Gets a historic Semaphore group, identified by the root hash.
   */
  public async getHistoricalGroup(
    client: PoolClient,
    pipelineId: string,
    groupId: string,
    rootHash: string
  ): Promise<PipelineSemaphoreGroupHistory | undefined> {
    const result = await sqlQuery(
      client,
      `
      SELECT * FROM generic_issuance_semaphore_history
      WHERE pipeline_id = $1 AND group_id = $2 AND root_hash = $3
      `,
      // Pipeline ID is technically redundant here since group IDs are already
      // globally unique.
      [pipelineId, groupId, rootHash]
    );

    return result.rowCount === 0
      ? undefined
      : rowToGroupHistory(result.rows[0]);
  }
}

function rowToGroupHistory(row: QueryResultRow): PipelineSemaphoreGroupHistory {
  return {
    id: row.id,
    pipelineId: row.pipeline_id,
    groupId: row.groupId,
    rootHash: row.root_hash,
    serializedGroup: row.serialized_group,
    timeCreated: row.time_created
  };
}

/**
 * A Semaphore Group history belonging to a pipeline.
 */
export interface PipelineSemaphoreGroupHistory {
  id: number;
  pipelineId: string;
  groupId: string;
  rootHash: string;
  serializedGroup: string;
  timeCreated: Date;
}
