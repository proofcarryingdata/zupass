import { ClientBase, Pool } from "pg";

export async function fetchParticipantEmails(
  client: ClientBase | Pool
): Promise<string[]> {
  const result = await client.query(`select email from pretix_participants;`);
  return result.rows.map((row) => row.email);
}
