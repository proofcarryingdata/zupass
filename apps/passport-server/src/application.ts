import * as path from "path";
import { IEmailAPI, sendEmail } from "./apis/emailAPI";
import { getHoneycombAPI } from "./apis/honeycombAPI";
import { getPretixAPI, PretixAPI } from "./apis/pretixAPI";
import { getDB } from "./database/postgresPool";
import { startServer } from "./routing/server";
import { startE2EEService } from "./services/e2eeService";
import { startEmailService } from "./services/emailService";
import { startEmailTokenService } from "./services/emailTokenService";
import { startMetrics as startMetricsService } from "./services/metricsService";
import { startPretixSyncService } from "./services/pretixSyncService";
import { startProvingService } from "./services/provingService";
import { startRollbarService } from "./services/rollbarService";
import { startSemaphoreService } from "./services/semaphoreService";
import { startTelemetry as startTelemetryService } from "./services/telemetryService";
import { startUserService } from "./services/userService";
import { APIs, ApplicationContext, GlobalServices, PCDPass } from "./types";

export async function startApplication(
  apiOverrides?: Partial<APIs>
): Promise<PCDPass> {
  const apis = await getOverridenApis(apiOverrides);
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

  const provingService = await startProvingService();
  const emailService = startEmailService(
    context,
    rollbarService,
    apis.emailAPI
  );
  const emailTokenService = startEmailTokenService(context);
  const semaphoreService = startSemaphoreService(context);
  const pretixSyncService = startPretixSyncService(
    context,
    rollbarService,
    semaphoreService,
    apis.pretixAPI
  );
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
    pretixSyncService,
  };

  const expressServer = await startServer(context, globalServices);

  return { context, globalServices, apis, expressContext: expressServer };
}

export async function stopApplication(app?: PCDPass) {
  if (!app) return;

  app.expressContext.server.close();
  app.globalServices.provingService.stop();
  app.globalServices.semaphoreService.stop();
  app.globalServices.pretixSyncService?.stop();
}

async function getOverridenApis(apiOverrides?: Partial<APIs>): Promise<APIs> {
  let emailAPI: IEmailAPI | null = null;

  if (apiOverrides?.emailAPI) {
    console.log("[INIT] overriding email client");
    emailAPI = apiOverrides.emailAPI;
  } else {
    if (process.env.MAILGUN_API_KEY === undefined) {
      console.log("[EMAIL] Missing environment variable: MAILGUN_API_KEY");
      emailAPI = null;
    } else {
      emailAPI = { send: sendEmail };
    }
  }

  let pretixAPI: PretixAPI | null = null;

  if (apiOverrides?.pretixAPI) {
    console.log("[INIT] overriding pretix api");
    pretixAPI = apiOverrides.pretixAPI;
  } else {
    pretixAPI = getPretixAPI();
  }

  return {
    emailAPI,
    pretixAPI,
  };
}
