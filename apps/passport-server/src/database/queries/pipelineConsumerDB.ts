import { PipelineConsumer } from "@pcd/passport-interface";
import { QueryResultRow } from "pg";
import { PoolClient } from "postgres-pool";
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
    client: PoolClient,
    pipelineId: string,
    email: string,
    commitment: string,
    now: Date
  ): Promise<boolean>;
  // Load all consumers whose email addresses are in an array. This is used
  // when we have a list of emails from tickets, and want to find the matching
  // consumers for them (typically so that we can build a Semaphore group).
  loadByEmails(
    client: PoolClient,
    pipelineId: string,
    emailAddresses: string[]
  ): Promise<PipelineConsumer[]>;
  loadAll(client: PoolClient, pipelineId: string): Promise<PipelineConsumer[]>;
}

export class PipelineConsumerDB implements IPipelineConsumerDB {
  /**
   * Save a consumer to the DB.
   * Returns true if an update to the user's Semaphore commitment was recorded.
   */
  public async save(
    client: PoolClient,
    pipelineId: string,
    email: string,
    commitment: string,
    now: Date
  ): Promise<boolean> {
    const result = await sqlQuery(
      client,
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

    // If, after the query, the time_updated time is equal to now, then we know
    // that something was inserted or updated, and return true so that the
    // caller can take the appropriate action (e.g. updating Semaphore groups).
    return now.getTime() === result.rows[0].time_updated.getTime();
  }

  /**
   * Given a list of email addresses, load the consumer data for them, if any
   * exists. Some emails will not have consumer data, because they come from
   * tickets which have not yet been issued via a feed.
   */
  public async loadByEmails(
    client: PoolClient,
    pipelineId: string,
    emailAddresses: string[]
  ): Promise<PipelineConsumer[]> {
    const result = await sqlQuery(
      client,
      `SELECT * FROM generic_issuance_consumers WHERE pipeline_id = $1 AND email = ANY($2)`,
      [pipelineId, emailAddresses]
    );

    return result.rows.map(rowToPipelineConsumer);
  }

  /**
   * Returns all consumers for the pipeline.
   */
  public async loadAll(
    client: PoolClient,
    pipelineId: string
  ): Promise<PipelineConsumer[]> {
    const result = await sqlQuery(
      client,
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
