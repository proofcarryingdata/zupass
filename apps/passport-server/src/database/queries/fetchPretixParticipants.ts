import { ClientBase, Pool } from "pg";
import { PretixParticipant } from "../models";

export async function fetchPretixParticipants(
  client: ClientBase | Pool
): Promise<PretixParticipant[]> {
  const result = await client.query(`select * from pretix_participants;`);
  return result.rows;
}
