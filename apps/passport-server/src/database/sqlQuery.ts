import { getActiveSpan } from "@opentelemetry/api/build/src/trace/context-utils";
import { getErrorMessage, sleep } from "@pcd/util";
import { QueryResult } from "pg";
import { Pool } from "postgres-pool";
import { traced } from "../services/telemetryService";
import { logger } from "../util/logger";

/**
 * This function executes a sql query against the database, and traces
 * its performance. Retries queries that fail due to a connection error.
 */
export function sqlQuery(
  client: Pool,
  query: string,
  args?: any[]
): Promise<QueryResult> {
  return traced("DB", "query", async (span) => {
    span?.setAttribute("query", query);
    try {
      return await execQueryWithRetry(client, query, args);
    } catch (e) {
      span?.setAttribute("error", e + "");

      if ((e as any).code) {
        span?.setAttribute("code", (e as any).code);
      }

      logger(`[ERROR] sql query\n`, `"${query}"\n`, e);
      throw e;
    }
  });
}

async function execQueryWithRetry(
  client: Pool,
  query: string,
  args?: any[]
): Promise<QueryResult> {
  return execWithRetry(
    () => {
      return client.query(query, args);
    },
    (e) => {
      const errorMessage = getErrorMessage(e);
      return errorMessage.includes("Error: Connection terminated unexpectedly");
    },
    3
  );
}

async function execWithRetry<T>(
  task: () => Promise<T>,
  shouldRetry: (e: unknown) => boolean,
  maxTries: number
): Promise<T> {
  const span = getActiveSpan();
  const backoffFactorMs = 100;
  let latestError = undefined;

  span?.setAttribute("max_tries", maxTries);

  for (let i = 0; i < maxTries; i++) {
    span?.setAttribute("try_count", i + 1);

    try {
      const result = await task();
      span?.setAttribute("retry_succeeded", true);
      return result;
    } catch (e) {
      latestError = e;
      if (!shouldRetry(e)) {
        break;
      }
    }

    await sleep(backoffFactorMs * (i + 1));
  }

  span?.setAttribute("retry_succeeded", false);
  throw latestError;
}
