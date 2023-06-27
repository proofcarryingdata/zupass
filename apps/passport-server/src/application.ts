import * as dotenv from "dotenv";
import * as path from "path";
import { getHoneycombAPI } from "./apis/honeycombAPI";
import { getDB } from "./database/postgresPool";
import { startServer } from "./routing/server";
import { startE2EEService } from "./services/e2eeService";
import { startEmailTokenService } from "./services/emailTokenService";
import { startMetrics as startMetricsService } from "./services/metricsService";
import { startPretixSync as startPretixSyncService } from "./services/pretixSyncService";
import { initProvingService as startProvingService } from "./services/provingService";
import { getRollbar } from "./services/rollbarService";
import { startSemaphoreService } from "./services/semaphoreService";
import { startTelemetry as startTelemetryService } from "./services/telemetryService";
import { startUserService } from "./services/userService";
import { ApplicationContext, GlobalServices, PCDPass } from "./types";
import { IS_PROD } from "./util/isProd";

export async function startApplication(): Promise<PCDPass> {
  const dotEnvPath = IS_PROD
    ? `/etc/secrets/.env`
    : path.join(process.cwd(), ".env");

  console.log(`[INIT] Loading environment variables from: ${dotEnvPath} `);
  dotenv.config({ path: dotEnvPath });
  console.log("[INIT] Starting application");

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

  const emailTokenService = startEmailTokenService(context);
  const semaphoreService = startSemaphoreService(context);
  const userService = startUserService(
    context,
    semaphoreService,
    emailTokenService
  );
  const e2eeService = startE2EEService(context);

  const globalServices: GlobalServices = {
    semaphoreService,
    userService,
    e2eeService,
    emailTokenService,
  };

  startServer(context, globalServices);

  return { context, globalServices };
}
