import { Pool } from "pg";
import { getDatabaseConfiguration } from "./postgresConfiguration";
import { migrateDatabase } from "./postgresMigrations";

export async function getDB(): Promise<Pool> {
  console.log("[INIT] Initializing Postgres client");

  const pool = new Pool(getDatabaseConfiguration());
  const client = await pool.connect();
  await migrateDatabase(client);
  client.release();

  return pool;
}
