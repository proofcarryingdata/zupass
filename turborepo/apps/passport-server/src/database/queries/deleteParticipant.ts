import { ClientBase, Pool } from "pg";
import { query } from "../query";

export async function deleteParticipant(
  client: ClientBase | Pool,
  email: string
): Promise<void> {
  await query(client, `delete from commitments where participant_email = $1`, [
    email,
  ]);
  await query(client, `delete from pretix_participants where email = $1`, [
    email,
  ]);
}
