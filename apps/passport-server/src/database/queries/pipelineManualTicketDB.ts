import { ManualTicket } from "@pcd/passport-interface";
import { QueryResultRow } from "pg";
import { Pool } from "postgres-pool";
import { logger } from "../../util/logger";

export interface IPipelineManualTicketDB {
  save(pipelineId: string, ticket: ManualTicket): Promise<void>;
  loadByEmails(
    pipelineId: string,
    emailAddresses: string[]
  ): Promise<ManualTicket[]>;
  loadAll(pipelineId: string): Promise<ManualTicket[]>;
}

export class PipelineManualTicketDB implements IPipelineManualTicketDB {
  private db: Pool;

  public constructor(db: Pool) {
    this.db = db;
  }

  /**
   * Save a consumer to the DB.
   * Returns true if an update to the user's Semaphore commitment was recorded.
   */
  public async save(pipelineId: string, ticket: ManualTicket): Promise<void> {
    logger(pipelineId, ticket);
  }

  /**
   * Given a list of email addresses, load the consumer data for them, if any
   * exists. Some emails will not have consumer data, because they come from
   * tickets which have not yet been issued via a feed.
   */
  public async loadByEmails(
    _pipelineId: string,
    _emailAddresses: string[]
  ): Promise<ManualTicket[]> {
    return [];
  }

  /**
   * Returns all consumers for the pipeline.
   */
  public async loadAll(_pipelineId: string): Promise<ManualTicket[]> {
    return [];
  }
}

function _rowToManualTicket(_row: QueryResultRow): ManualTicket | undefined {
  // return {
  //   email: row.email,
  //   commitment: row.commitment,
  //   timeCreated: row.time_created,
  //   timeUpdated: row.time_updated
  // };

  return undefined;
}
