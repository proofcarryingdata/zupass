import { PoolClient } from "postgres-pool";
import { sqlQuery } from "../sqlQuery";

export function kvGet(
  client: PoolClient,
  key: string
): Promise<unknown | undefined> {
  return sqlQuery(client, `select v from kv where k = $1;`, [key]).then(
    (res) => res.rows[0]?.v
  );
}

export function kvGetByPrefix(
  client: PoolClient,
  prefix: string
): Promise<unknown[]> {
  return sqlQuery(client, `select v from kv where k like $1;`, [
    `${prefix}%`
  ]).then((res) => res.rows.map((row) => row.v));
}

export function kvSet(
  client: PoolClient,
  key: string,
  value: unknown
): Promise<string | undefined> {
  return sqlQuery(
    client,
    `
insert into kv (k, v) values ($1, $2)
on conflict (k) do update set v = $2;
  `,
    [key, value]
  ).then((res) => res.rows[0]?.v);
}
