import { Pool } from "postgres-pool";
import { sqlQuery } from "../sqlQuery";

export function kvGet(db: Pool, key: string): Promise<unknown | undefined> {
  return sqlQuery(db, `select v from kv where k = $1;`, [key]).then(
    (res) => res.rows[0]?.v
  );
}

export function kvGetByPrefix(db: Pool, key: string): Promise<unknown[]> {
  return sqlQuery(db, `select v from kv where k like $1;`, [`${key}%`]).then(
    (res) => res.rows.map((row) => row.v)
  );
}

export function kvSet(
  db: Pool,
  key: string,
  value: unknown
): Promise<string | undefined> {
  return sqlQuery(
    db,
    `
insert into kv (k, v) values ($1, $2)
on conflict (k) do update set v = $2;
  `,
    [key, value]
  ).then((res) => res.rows[0]?.v);
}
