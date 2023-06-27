import { ClientBase, Pool } from "pg";
import { traced } from "../services/telemetryService";

/**
 * This function executes a sql query against the database, and traces
 * its performance.
 */
export function sqlQuery(
  client: ClientBase | Pool,
  query: string,
  args?: any[]
) {
  return traced("DB", "query", async (span) => {
    span?.setAttribute("query", query);
    return await client.query(query, args);
  });
}
