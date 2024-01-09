import * as path from "path";
import { PoolClient } from "pg";
import { migrate } from "postgres-migrations";
import { traced } from "../services/telemetryService";
import { logger } from "../util/logger";

const MIGRATIONS_PATH = path.join(process.cwd(), "migrations");

export async function migrateDatabase(client: PoolClient): Promise<void> {
  await traced("DB", "migrate", async () => {
    logger(`[INIT] Executing migrations from directory ${MIGRATIONS_PATH}`);
    await migrate({ client }, MIGRATIONS_PATH);
    logger(`[INIT] Migrations completed successfully`);
  });
}
