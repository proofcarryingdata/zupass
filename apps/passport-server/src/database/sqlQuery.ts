import { getErrorMessage } from "@pcd/util";
import { DatabaseError, QueryResult } from "pg";
import { Pool, PoolClient } from "postgres-pool";
import { traced } from "../services/telemetryService";
import { logger } from "../util/logger";
import { execWithRetry } from "../util/retry";

/**
 * Executes a sql query against the database, and traces its performance.
 * Retries queries that fail due to a connection error.
 */
export function sqlQuery(
  client: PoolClient,
  query: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args?: any[],
  maxRetries: number = 3
): Promise<QueryResult> {
  return traced("DB", "query", async (span) => {
    span?.setAttribute("query", query);
    try {
      return await execQueryWithRetry(client, query, args, maxRetries);
    } catch (e) {
      span?.setAttribute("error", e + "");

      if (e instanceof DatabaseError && e.code) {
        span?.setAttribute("code", e.code);
      }

      logger(`[ERROR] sql query\n`, `"${query}"\n`, e);
      throw e;
    }
  });
}

async function execQueryWithRetry(
  pool: Pool | PoolClient,
  query: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args?: any[],
  maxRetries?: number
): Promise<QueryResult> {
  return execWithRetry(
    () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return pool.query(query, args);
    },
    (e) => {
      const errorMessage = getErrorMessage(e);
      return errorMessage.includes("Connection terminated unexpectedly");
    },
    maxRetries ?? 3
  );
}

export function sqlTransaction<T>(
  pool: Pool,
  func: (client: PoolClient) => Promise<T>
): Promise<T> {
  return namedSqlTransaction(pool, "execWithClient", async (client) =>
    func(client)
  );
}

/**
 * Executes a given function inside a transaction against the database, and
 * traces its performance.  Retries queries that fail due to a connection error.
 * The transaction will be committed if the txn function returns a value, or
 * rolled back if it throws/rejects.
 */
export function namedSqlTransaction<T>(
  pool: Pool,
  txn_desc: string,
  txn: (client: PoolClient) => Promise<T>,
  maxRetries?: number
): Promise<T> {
  return traced("DB", "transaction", async (span) => {
    span?.setAttribute("txn", txn_desc);
    try {
      return await execTransactionWithRetry(pool, txn, maxRetries);
    } catch (e) {
      span?.setAttribute("error", e + "");

      if (e instanceof DatabaseError && e.code) {
        span?.setAttribute("code", e.code);
      }

      logger(`[ERROR] sql transaction\n`, `"${txn_desc}"\n`, e);
      throw e;
    }
  });
}

async function execTransactionWithRetry<T>(
  pool: Pool,
  txn: (client: PoolClient) => Promise<T>,
  maxRetries?: number
): Promise<T> {
  return execWithRetry(
    async () => {
      // Based on recommended transaction flow, where queries are isolated to a
      // particular client: https://node-postgres.com/features/transactions
      const txClient = await pool.connect();
      try {
        await txClient.query("BEGIN");
        const result = await txn(txClient);
        await txClient.query("COMMIT");
        return result;
      } catch (queryError) {
        try {
          await txClient.query("ROLLBACK");
        } catch (rollbackError) {
          logger(`Rollback failed: ${rollbackError}`);
        }
        throw queryError;
      } finally {
        txClient.release();
      }
    },
    (e) => {
      const errorMessage = getErrorMessage(e);
      return errorMessage.includes("Connection terminated unexpectedly");
    },
    maxRetries ?? 3
  );
}
