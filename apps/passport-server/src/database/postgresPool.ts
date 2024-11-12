import { Pool } from "postgres-pool";
import { logger } from "../util/logger";
import { getDatabaseConfiguration } from "./postgresConfiguration";
import { migrateDatabase } from "./postgresMigrations";

export async function getDB(overwriteMaxConnections?: number): Promise<Pool> {
  logger("[INIT] Initializing Postgres client");

  try {
    const pool = new Pool(getDatabaseConfiguration(overwriteMaxConnections));
    const client = await pool.connect();
    await migrateDatabase(client);
    client.release();
    return pool;
  } catch (e) {
    logger(
      `
[ERROR] couldn't connect to the database. 
- if you're developing locally, try running 'yarn localdb:up'
- if you've never initialized a postgres database for the zupass monorepo, ` +
        `run 'yarn localdb:init' first.`
    );
    throw e;
  }
}
