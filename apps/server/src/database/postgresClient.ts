import { Client } from "pg";
import { getDatabaseConfiguration } from "./postgresConfiguration";
import { migrateDatabase } from "./postgresMigrations";

export async function getDBClient(): Promise<Client> {
  console.log("[INIT] Initializing Postgres client");

  const client = new Client(getDatabaseConfiguration());
  await client.connect();
  await migrateDatabase(client);

  return client;
}
