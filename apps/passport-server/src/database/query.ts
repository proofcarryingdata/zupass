import { ClientBase, Pool } from "pg";
import { traced } from "../services/telemetry";

/**
 * This function executes a sql query against the database, and traces
 * its performance.
 */
export function query(
  client: ClientBase | Pool,
  query: string,
  args: string[]
) {
  return traced("DB", "query", async (span) => {
    span?.setAttribute("query", query);
    return await client.query(query, args);
  });
}
