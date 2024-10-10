import { PoolClient } from "postgres-pool";
import { sqlQuery } from "../sqlQuery";

/**
 * Stores check-in records for "manual tickets". These are tickets which are
 * not fetched from remote back-end systems and are therefore not remotely
 * checked-in. Instead, they are specified in the pipeline configuration and
 * are checked in by updating records in the DB.
 */
export interface IPipelineCheckinDB {
  // Fetch a check-in record
  getByTicketId(
    client: PoolClient,
    pipelineId: string,
    ticketId: string
  ): Promise<PipelineCheckin | undefined>;
  getByTicketIds(
    client: PoolClient,
    pipelineId: string,
    ticketIds: string[]
  ): Promise<PipelineCheckin[]>;
  // Fetch all check-ins for a pipeline
  getByPipelineId(
    client: PoolClient,
    pipelineId: string
  ): Promise<PipelineCheckin[]>;
  // Add a check-in record for a ticket ID
  checkIn(
    client: PoolClient,
    pipelineId: string,
    ticketId: string,
    timestamp: Date,
    checkerEmail: string
  ): Promise<void>;
  // Delete check-in for a ticket ID
  deleteCheckIn(
    client: PoolClient,
    pipelineId: string,
    ticketId: string
  ): Promise<number>;
}

/**
 * Manages the database of check-ins, currently only used for "manual tickets"
 * which are created via Pipeline configuration rather than imported from a
 * back-end system.
 */
export class PipelineCheckinDB implements IPipelineCheckinDB {
  /**
   * Retrieve a check-in for a single ticket.
   */
  public async getByTicketId(
    client: PoolClient,
    pipelineId: string,
    ticketId: string
  ): Promise<PipelineCheckin | undefined> {
    const result = await sqlQuery(
      client,
      `SELECT * FROM generic_issuance_checkins WHERE pipeline_id = $1 AND ticket_id = $2`,
      [pipelineId, ticketId]
    );

    if (result.rowCount === 0) {
      return undefined;
    } else {
      return {
        ticketId: result.rows[0].ticket_id,
        timestamp: result.rows[0].checkin_timestamp
      } satisfies PipelineCheckin;
    }
  }

  /**
   * Retrieves check-ins for multiple tickets on a single pipeline.
   */
  public async getByTicketIds(
    client: PoolClient,
    pipelineId: string,
    ticketIds: string[]
  ): Promise<PipelineCheckin[]> {
    const result = await sqlQuery(
      client,
      `SELECT * FROM generic_issuance_checkins WHERE pipeline_id = $1 AND ticket_id = ANY($2)`,
      [pipelineId, ticketIds]
    );

    return result.rows.map(
      (row) =>
        ({
          ticketId: row.ticket_id,
          timestamp: row.checkin_timestamp
        }) satisfies PipelineCheckin
    );
  }

  /**
   * Retrieve all check-ins for a pipeline.
   */
  public async getByPipelineId(
    client: PoolClient,
    pipelineId: string
  ): Promise<PipelineCheckin[]> {
    const result = await sqlQuery(
      client,
      `SELECT * FROM generic_issuance_checkins WHERE pipeline_id = $1`,
      [pipelineId]
    );

    return result.rows.map((row) => {
      return {
        ticketId: row.ticket_id,
        timestamp: row.checkin_timestamp,
        checkerEmail: row.checker_email ?? undefined
      } satisfies PipelineCheckin;
    });
  }

  /**
   * Check a ticket in. Because the insert does not handle conflicts, this will
   * throw an error if the ticket is already checked in.
   */
  public async checkIn(
    client: PoolClient,
    pipelineId: string,
    ticketId: string,
    timestamp: Date,
    checkerEmail: string
  ): Promise<void> {
    await sqlQuery(
      client,
      `
    INSERT INTO generic_issuance_checkins (pipeline_id, ticket_id, checkin_timestamp, checker_email) VALUES($1, $2, $3, $4)
    `,
      [pipelineId, ticketId, timestamp, checkerEmail]
    );
  }

  /**
   * Delete a check-in. Returns the number of affected rows, which should be
   * exactly 1 if the ticket was previously checked in.
   */
  public async deleteCheckIn(
    client: PoolClient,
    pipelineId: string,
    ticketId: string
  ): Promise<number> {
    const result = await sqlQuery(
      client,
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
  checkerEmail?: string;
}
