import { Pool } from "postgres-pool";
import { sqlQuery } from "../sqlQuery";

export interface IPipelineCheckinDB {
  // Fetch a check-in record
  getByTicketId(
    pipelineId: string,
    ticketId: string
  ): Promise<PipelineCheckin | undefined>;
  // Add a check-in record for a ticket ID
  checkIn(pipelineId: string, ticketId: string, timestamp: Date): Promise<void>;
  // Delete check-in for a ticket ID
  checkOut(pipelineId: string, ticketId: string): Promise<number>;
}

export class PipelineCheckinDB implements IPipelineCheckinDB {
  private db: Pool;

  public constructor(db: Pool) {
    this.db = db;
  }

  /**
   * Retrieve a check-in for a single ticket.
   */
  public async getByTicketId(
    pipelineId: string,
    ticketId: string
  ): Promise<PipelineCheckin | undefined> {
    const result = await sqlQuery(
      this.db,
      `SELECT * FROM generic_issuance_checkins WHERE pipeline_id = $1 AND ticket_id = $2`,
      [pipelineId, ticketId]
    );

    if (result.rowCount === 0) {
      return undefined;
    } else {
      return {
        ticketId: result.rows[0].ticket_id,
        timestamp: result.rows[0].checkin_timestamp
      };
    }
  }

  /**
   * Check a ticket in. Because the insert does not handle conflicts, this will
   * throw an error if the ticket is already checked in.
   */
  public async checkIn(
    pipelineId: string,
    ticketId: string,
    timestamp: Date
  ): Promise<void> {
    await sqlQuery(
      this.db,
      `
    INSERT INTO generic_issuance_checkins (pipeline_id, ticket_id, checkin_timestamp) VALUES($1, $2, $3)
    `,
      [pipelineId, ticketId, timestamp]
    );
  }

  /**
   * Delete a check-in. Returns the number of affected rows, which should be
   * exactly 1 if the ticket was previously checked in.
   */
  public async checkOut(pipelineId: string, ticketId: string): Promise<number> {
    const result = await sqlQuery(
      this.db,
      `
    DELETE FROM generic_issuance_checkins WHERE pipeline_id = $1 AND ticket_id = $2
    `,
      [pipelineId, ticketId]
    );

    return result.rowCount;
  }
}

export interface PipelineCheckin {
  ticketId: string;
  timestamp: Date;
}
