import * as path from "path";
import { PoolClient } from "pg";
import { migrate } from "postgres-migrations";

const MIGRATIONS_PATH = path.join(process.cwd(), "migrations");

export async function migrateDatabase(client: PoolClient): Promise<void> {
  console.log(`[INIT] Executing migrations from directory ${MIGRATIONS_PATH}`);

  await migrate({ client }, MIGRATIONS_PATH);

  console.log(`[INIT] Migrations completed successfully`);
}
