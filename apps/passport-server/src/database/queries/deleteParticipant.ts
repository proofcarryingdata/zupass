import { ClientBase, Pool } from "pg";

export async function deleteParticipant(
  client: ClientBase | Pool,
  email: string
): Promise<void> {
  await client.query(`delete from commitments where participant_email = $1`, [
    email,
  ]);
  await client.query(`delete from pretix_participants where email = $1`, [
    email,
  ]);
}
