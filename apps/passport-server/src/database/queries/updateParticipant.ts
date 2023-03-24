import { ClientBase, Pool } from "pg";

export async function updateParticipant(
  client: ClientBase | Pool,
  params: { email: string; role: string }
): Promise<number> {
  const result = await client.query(
    `\
update pretix_participants
set role=$2
where email=$1;`,
    [params.email, params.role]
  );
  return result.rowCount;
}
