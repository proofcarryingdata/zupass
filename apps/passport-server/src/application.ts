import { getHoneycombAPI } from "./apis/honeycombAPI";
import { getDB } from "./database/postgresPool";
import { startServer } from "./routing/server";
import { startE2EEService } from "./services/e2eeService";
import { startMetrics as startMetricsService } from "./services/metricsService";
import { startPretixSync as startPretixSyncService } from "./services/pretixSyncService";
import { initProvingService as startProvingService } from "./services/provingService";
import { getRollbar } from "./services/rollbarService";
import { startSemaphoreService } from "./services/semaphoreService";
import { startTelemetry as startTelemetryService } from "./services/telemetryService";
import { startUserService } from "./services/userService";
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

  await startTelemetryService(context);

  startProvingService();
  startMetricsService(context);
  startPretixSyncService(context);

  const semaphoreService = startSemaphoreService(context);
  const userService = startUserService(context, semaphoreService);
  const e2eeService = startE2EEService(context);

  startServer(context, { semaphoreService, userService, e2eeService });
}
