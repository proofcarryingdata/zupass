import { Pool } from "postgres-pool";
import { sqlQuery } from "../sqlQuery";

export interface IPipelineCheckinDB {
  // Fetch a check-in record
  getByTicketId(
    pipelineId: string,
    ticketId: string
  ): Promise<PipelineCheckin | undefined>;
  // Fetch all check-ins for a pipeline
  getByPipelineId(pipelineId: string): Promise<PipelineCheckin[]>;
  // Add a check-in record for a ticket ID
  checkIn(pipelineId: string, ticketId: string, timestamp: Date): Promise<void>;
  // Delete check-in for a ticket ID
  checkOut(pipelineId: string, ticketId: string): Promise<number>;
}

/**
 * Manages the database of check-ins, currently only used for "manual tickets"
 * which are created via Pipeline configuration rather than imported from a
 * back-end system.
 */
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
   * Retrieve all check-ins for a pipeline.
   */
  public async getByPipelineId(pipelineId: string): Promise<PipelineCheckin[]> {
    const result = await sqlQuery(
      this.db,
      `SELECT * FROM generic_issuance_checkins WHERE pipeline_id = $1`,
      [pipelineId]
    );

    return result.rows.map((row) => {
      return {
        ticketId: row.ticket_id,
        timestamp: row.checkin_timestamp
      } satisfies PipelineCheckin;
    });
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

/**
 * A record of a check-in.
 */
export interface PipelineCheckin {
  ticketId: string;
  timestamp: Date;
}
