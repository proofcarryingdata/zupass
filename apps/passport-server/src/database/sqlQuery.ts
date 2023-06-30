import { Pool, QueryResult } from "pg";
import { traced } from "../services/telemetryService";

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
    return await client.query(query, args);
  });
}
