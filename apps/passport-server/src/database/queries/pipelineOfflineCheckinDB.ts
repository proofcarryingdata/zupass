import { PipelineOfflineCheckin } from "@pcd/passport-interface";
import { Pool } from "postgres-pool";
import { sqlQuery } from "../sqlQuery";

/**
 * Interface for the storage of offline checkins for asynchronous processing.
 */
export interface IPipelineOfflineCheckinDB {
  addOfflineCheckins(
    pipelineId: string,
    checkerEmail: string,
    ticketId: string[],
    checkinTimestamp: Date
  ): Promise<void>;
  getOfflineCheckinsForPipeline(
    pipelineId: string
  ): Promise<PipelineOfflineCheckin[]>;
  deleteOfflineCheckins(pipelineId: string, ticketIds: string[]): Promise<void>;
  addFailedOfflineCheckin(pipelineId: string, ticketId: string): Promise<void>;
}

/**
 * Manages offline checkins for asynchronous processing.
 */
export class PipelineOfflineCheckinDB implements IPipelineOfflineCheckinDB {
  private db: Pool;

  public constructor(db: Pool) {
    this.db = db;
  }

  /**
   * Add multiple offline check-ins for a given event on a pipeline.
   */
  public async addOfflineCheckins(
    pipelineId: string,
    checkerEmail: string,
    ticketIds: string[],
    checkinTimestamp: Date
  ): Promise<void> {
    await sqlQuery(
      this.db,
      `INSERT INTO generic_issuance_offline_checkins (pipeline_id, checker_email, ticket_id, checkin_timestamp)
      VALUES ${ticketIds
        .map(
          (_, i) =>
            `($${i * 4 + 1},$${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`
        )
        .join(",")}
       ON CONFLICT (ticket_id) DO UPDATE SET
       checker_email = excluded.checker_email, checkin_timestamp = excluded.checkin_timestamp`,
      ticketIds.flatMap((ticketId) => [
        pipelineId,
        checkerEmail,
        ticketId,
        checkinTimestamp
      ])
    );
  }

  /**
   * Get the offline check-ins for a single pipeline.
   */
  public async getOfflineCheckinsForPipeline(
    pipelineId: string
  ): Promise<PipelineOfflineCheckin[]> {
    const result = await sqlQuery(
      this.db,
      `SELECT * FROM generic_issuance_offline_checkins WHERE pipeline_id = $1`,
      [pipelineId]
    );

    return result.rows.map(
      (row): PipelineOfflineCheckin => ({
        pipelineId: row.pipeline_id,
        checkerEmail: row.checker_email,
        ticketId: row.ticket_id,
        attempts: row.attempts,
        checkinTimestamp: row.checkin_timestamp
      })
    );
  }

  /**
   * Delete specific offline check-ins for a given pipeline ID. To be used when
   * these check-ins have been processed by the back-end system.
   */
  public async deleteOfflineCheckins(
    pipelineId: string,
    ticketIds: string[]
  ): Promise<void> {
    await sqlQuery(
      this.db,
      `DELETE FROM generic_issuance_offline_checkins WHERE pipeline_id = $1 AND ticket_id = ANY($2)`,
      [pipelineId, ticketIds]
    );
  }

  /**
   * When a check-in with the back-end system fails, we increment a counter.
   * This would allow us to manually delete offline check-ins which seem to be
   * incapable of succeeding.
   *
   * Once we have more data about this, we might be able to automatically
   * delete offline check-ins that fail too many times; however, we also have
   * to consider the case where a back-end system is down for long enough that
   * many offline check-ins fail.
   */
  public async addFailedOfflineCheckin(
    pipelineId: string,
    ticketId: string
  ): Promise<void> {
    await sqlQuery(
      this.db,
      `UPDATE generic_issuance_offline_checkins SET attempts = attempts + 1 WHERE pipeline_id = $1 AND ticket_id = $2`,
      [pipelineId, ticketId]
    );
  }
}
