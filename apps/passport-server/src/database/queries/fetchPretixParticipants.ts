import { ClientBase, Pool } from "pg";
import { PretixParticipant } from "../models";
import { query } from "../query";

export async function fetchPretixParticipants(
  client: ClientBase | Pool
): Promise<PretixParticipant[]> {
  const result = await query(client, `select * from pretix_participants;`);
  return result.rows;
}
