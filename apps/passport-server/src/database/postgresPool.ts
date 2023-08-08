import { Pool } from "pg";
import { logger } from "../util/logger";
import { getDatabaseConfiguration } from "./postgresConfiguration";
import { migrateDatabase } from "./postgresMigrations";

export async function getDB(): Promise<Pool> {
  logger("[INIT] Initializing Postgres client");

  const pool = new Pool(getDatabaseConfiguration());

  const client = await pool.connect();
  await migrateDatabase(client);
  client.release();

  return pool;
}
