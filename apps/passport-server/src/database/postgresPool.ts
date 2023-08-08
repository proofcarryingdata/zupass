import { native, Pool } from "pg";
import { logger } from "../util/logger";
import { getDatabaseConfiguration } from "./postgresConfiguration";
import { migrateDatabase } from "./postgresMigrations";

export async function getDB(): Promise<Pool> {
  logger("[INIT] Initializing Postgres client");

  if (!native) {
    throw new Error("Postgres native bindings not available");
  }

  const pool = new native.Pool(getDatabaseConfiguration());

  const client = await pool.connect();
  await migrateDatabase(client);
  client.release();

  return pool;
}
