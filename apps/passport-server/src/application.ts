import { getHoneycombAPI } from "./apis/honeycombAPI";
import { getDB } from "./database/postgresPool";
import { startServer } from "./routing/server";
import { startMetrics } from "./services/metricsService";
import { startPretixSync } from "./services/pretixSyncService";
import { getRollbar } from "./services/rollbarService";
import { startSemaphoreService } from "./services/semaphoreService";
import { startTelemetry } from "./services/telemetryService";
import { ApplicationContext } from "./types";

export async function startApplication() {
  const dbPool = await getDB();
  const honeyClient = getHoneycombAPI();
  const rollbar = getRollbar();

  const context: ApplicationContext = {
    dbPool,
    honeyClient,
    rollbar,
    isZuzalu: process.env.IS_ZUZALU === "true" ? true : false,
  };

  await startTelemetry(context);

  startMetrics(context);
  startPretixSync(context);
  const semaphoreService = startSemaphoreService(context);
  startServer(context, { semaphoreService });
}
