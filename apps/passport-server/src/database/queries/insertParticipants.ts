import { ClientBase, Pool } from "pg";
import { PretixParticipant } from "../types";

export async function insertParticipants(
  client: ClientBase | Pool,
  params: PretixParticipant
): Promise<number> {
  const result = await client.query(
    `\
insert into pretix_participants (email, name, role, residence, order_id)
values ($1, $2, $3, $4, $5)
on conflict do nothing;`,
    [params.email, params.name, params.role, params.residence, params.order_id]
  );
  return result.rowCount;
}
