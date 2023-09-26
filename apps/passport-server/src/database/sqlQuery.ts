import { QueryResult } from "pg";
import { Pool } from "postgres-pool";
import { traced } from "../services/telemetryService";
import { logger } from "../util/logger";

/**
 * This function executes a sql query against the database, and traces
 * its performance.
 */
export function sqlQuery(
  client: Pool,
  query: string,
  args?: any[]
): Promise<QueryResult> {
  return traced("DB", "query", async (span) => {
    span?.setAttribute("query", query);
    try {
      return await client.query(query, args);
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
