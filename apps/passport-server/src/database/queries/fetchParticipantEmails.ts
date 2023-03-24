import { ClientBase, Pool } from "pg";

export async function fetchParticipantEmails(
  client: ClientBase | Pool
): Promise<{ email: string; role: string }[]> {
  const result = await client.query(
    `select email, role from pretix_participants;`
  );
  return result.rows;
}
