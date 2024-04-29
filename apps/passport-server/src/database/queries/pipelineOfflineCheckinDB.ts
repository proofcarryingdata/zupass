import { Pool } from "postgres-pool";
import { sqlQuery } from "../sqlQuery";

export const MAX_CHECKIN_ATTEMPTS = 10;

/**
 * Stores check-in records for "manual tickets". These are tickets which are
 * not fetched from remote back-end systems and are therefore not remotely
 * checked-in. Instead, they are specified in the pipeline configuration and
 * are checked in by updating records in the DB.
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
 * Manages the database of check-ins, currently only used for "manual tickets"
 * which are created via Pipeline configuration rather than imported from a
 * back-end system.
 */
export class PipelineOfflineCheckinDB implements IPipelineOfflineCheckinDB {
  private db: Pool;

  public constructor(db: Pool) {
    this.db = db;
  }

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
        .join(",")}`,
      ticketIds.flatMap((ticketId) => [
        pipelineId,
        checkerEmail,
        ticketId,
        checkinTimestamp
      ])
    );
  }

  public async getOfflineCheckinsForPipeline(
    pipelineId: string
  ): Promise<PipelineOfflineCheckin[]> {
    const result = await sqlQuery(
      this.db,
      `SELECT * FROM generic_issuance_offline_checkins WHERE pipeline_id = $1 AND attempts < ${MAX_CHECKIN_ATTEMPTS}`,
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

export interface PipelineOfflineCheckin {
  pipelineId: string;
  ticketId: string;
  checkerEmail: string;
  checkinTimestamp: Date;
  attempts: number;
}
