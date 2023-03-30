import { ClientBase, Pool } from "pg";
import { Confessions } from "../models";

export async function insertConfession(
  client: ClientBase | Pool,
  params: Confessions
): Promise<number> {
  const result = await client.query(
    `\
insert into confessions (body, groupUrl, proof)
values ($1, $2, $3)
on conflict do nothing;`,
    [params.body, params.semaphoreGroupUrl, params.proof]
  );
  return result.rowCount;
}
