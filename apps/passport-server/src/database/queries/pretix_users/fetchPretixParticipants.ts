import { ClientBase, Pool } from "pg";
import { PretixParticipant } from "../../models";
import { sqlQuery } from "../../sqlQuery";

export async function fetchPretixParticipants(
  client: ClientBase | Pool
): Promise<PretixParticipant[]> {
  const result = await sqlQuery(client, `select * from pretix_participants;`);
  return result.rows;
}
