import {
  PipelineConsumer,
  PipelineConsumerWithoutTimestamps
} from "@pcd/passport-interface";
import { QueryResultRow } from "pg";
import { Pool } from "postgres-pool";
import { sqlQuery } from "../sqlQuery";

/**
 * Provides an interface to the DB of consumers of a pipeline. These are Zupass
 * users who have authenticated with the pipeline, e.g. by requesting a feed.
 */
export interface IPipelineConsumerDB {
  // Save a consumer. Should update the commitment for a given email if the
  // email already exists for a consumer, and if the commitment is different.
  // If there is no change then there is no need to update anything, and the
  // consumer's `timeUpdated` field should not change.
  save(
    pipelineId: string,
    email: string,
    commitment: string,
    now: Date
  ): Promise<PipelineConsumer>;
  // Load all consumers whose email addresses are in an array. This is used
  // when we have a list of emails from tickets, and want to find the matching
  // consumers for them (typically so that we can build a Semaphore group).
  loadByEmails(
    pipelineId: string,
    emailAddresses: string[]
  ): Promise<PipelineConsumerWithoutTimestamps[]>;
  loadAll(pipelineId: string): Promise<PipelineConsumer[]>;
}

export class PipelineConsumerDB implements IPipelineConsumerDB {
  private db: Pool;

  public constructor(db: Pool) {
    this.db = db;
  }

  /**
   * Save a consumer to the DB.
   * If the commitment has changed, then `time_updated` will be set to `now`.
   * This allows the caller to schedule a reload of the Semaphore group when a
   * commitment is changed. `time_updated` will always be `now` on an insert of
   * a new consumer record.
   */
  public async save(
    pipelineId: string,
    email: string,
    commitment: string,
    now: Date
  ): Promise<PipelineConsumer> {
    const result = await sqlQuery(
      this.db,
      `
    INSERT INTO generic_issuance_consumers (pipeline_id, email, commitment, time_created, time_updated)
    VALUES($1, $2, $3, $4, $4)
    ON CONFLICT (pipeline_id, email) DO
    UPDATE SET
      commitment = $3,
      time_updated = CASE
        WHEN generic_issuance_consumers.commitment = $3 THEN generic_issuance_consumers.time_updated
        ELSE $4
      END
    RETURNING *
    `,
      [pipelineId, email, commitment, now]
    );

    return rowToPipelineConsumer(result.rows[0]);
  }

  /**
   * Given a list of email addresses, load the consumer data for them, if any
   * exists. Some emails will not have consumer data, because they come from
   * tickets which have not yet been issued via a feed.
   */
  public async loadByEmails(
    pipelineId: string,
    emailAddresses: string[]
  ): Promise<PipelineConsumerWithoutTimestamps[]> {
    const result = await sqlQuery(
      this.db,
      `SELECT email, commitment FROM generic_issuance_consumers WHERE pipeline_id = $1 AND email = ANY($2)`,
      [pipelineId, emailAddresses]
    );

    return result.rows;
  }

  /**
   * Returns all consumers for the pipeline.
   */
  public async loadAll(pipelineId: string): Promise<PipelineConsumer[]> {
    const result = await sqlQuery(
      this.db,
      `SELECT * FROM generic_issuance_consumers WHERE pipeline_id = $1`,
      [pipelineId]
    );

    return result.rows.map(rowToPipelineConsumer);
  }
}

function rowToPipelineConsumer(row: QueryResultRow): PipelineConsumer {
  return {
    email: row.email,
    commitment: row.commitment,
    timeCreated: row.time_created,
    timeUpdated: row.time_updated
  };
}
