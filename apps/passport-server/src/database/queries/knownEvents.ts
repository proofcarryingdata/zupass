import { Pool } from "postgres-pool";
import { KnownEvent } from "../models";
import { sqlQuery } from "../sqlQuery";

export async function setKnownEvent(
  client: Pool,
  eventId: string
): Promise<KnownEvent> {
  const result = await sqlQuery(
    client,
    `INSERT INTO known_events VALUES($1::UUID)
    ON CONFLICT DO NOTHING`,
    [eventId]
  );
  return result.rows[0];
}
