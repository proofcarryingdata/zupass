import * as dotenv from "dotenv";
import * as path from "path";
import { sendEmail } from "./apis/emailAPI";
import { getHoneycombAPI } from "./apis/honeycombAPI";
import { getDB } from "./database/postgresPool";
import { startServer } from "./routing/server";
import { startE2EEService } from "./services/e2eeService";
import { EmailClient, startEmailService } from "./services/emailService";
import { startEmailTokenService } from "./services/emailTokenService";
import { startMetrics as startMetricsService } from "./services/metricsService";
import { startPretixSyncService } from "./services/pretixSyncService";
import { startProvingService } from "./services/provingService";
import { startRollbarService } from "./services/rollbarService";
import { startSemaphoreService } from "./services/semaphoreService";
import { startTelemetry as startTelemetryService } from "./services/telemetryService";
import { startUserService } from "./services/userService";
import { APIs, ApplicationContext, GlobalServices, PCDPass } from "./types";
import { IS_PROD } from "./util/isProd";

export async function startApplication(
  apiOverrides?: Partial<APIs>
): Promise<PCDPass> {
  const dotEnvPath = IS_PROD
    ? `/etc/secrets/.env`
    : path.join(process.cwd(), ".env");

  console.log(`[INIT] Loading environment variables from: ${dotEnvPath} `);
  dotenv.config({ path: dotEnvPath });
  console.log("[INIT] Starting application");

  const apis = Object.assign(await defaultAPIs(), apiOverrides ?? {});
  const dbPool = await getDB();
  const honeyClient = getHoneycombAPI();

  const context: ApplicationContext = {
    dbPool,
    honeyClient,
    isZuzalu: process.env.IS_ZUZALU === "true" ? true : false,
    resourcesDir: path.join(process.cwd(), "resources"),
  };

  await startTelemetryService(context);
  const rollbarService = startRollbarService();

  startProvingService();
  startMetricsService(context);
  startPretixSyncService(context, rollbarService);

  const provingService = await startProvingService();
  const emailService = startEmailService(
    context,
    rollbarService,
    apis.emailClient
  );
  const emailTokenService = startEmailTokenService(context);
  const semaphoreService = startSemaphoreService(context);
  const userService = startUserService(
    context,
    semaphoreService,
    emailTokenService,
    emailService,
    rollbarService
  );
  const e2eeService = startE2EEService(context, rollbarService);

  const globalServices: GlobalServices = {
    semaphoreService,
    userService,
    e2eeService,
    emailTokenService,
    rollbarService,
    provingService,
  };

  const expressServer = await startServer(context, globalServices);

  return { context, globalServices, expressContext: expressServer };
}

export async function stopApplication(app?: PCDPass) {
  if (!app) return;

  app.expressContext.server.close();
  app.globalServices.provingService.stop();
  app.globalServices.semaphoreService.stop();
}

async function defaultAPIs(): Promise<APIs> {
  let emailClient: EmailClient | null = null;

  if (process.env.MAILGUN_API_KEY === undefined) {
    console.log("[EMAIL] Missing environment variable: MAILGUN_API_KEY");
    emailClient = null;
  } else {
    emailClient = { send: sendEmail };
  }

  return {
    emailClient: emailClient,
  };
}
