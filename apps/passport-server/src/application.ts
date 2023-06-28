import * as dotenv from "dotenv";
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
import {
  APIs,
  ApplicationContext,
  EnvironmentVariables,
  GlobalServices,
  PCDPass,
} from "./types";
import { IS_PROD } from "./util/isProd";

export async function startApplication(
  envOverrides?: Partial<EnvironmentVariables>,
  apiOverrides?: () => Partial<APIs>
): Promise<PCDPass> {
  const dotEnvPath = IS_PROD
    ? `/etc/secrets/.env`
    : path.join(process.cwd(), ".env");

  console.log(`[INIT] Loading environment variables from: ${dotEnvPath} `);
  dotenv.config({ path: dotEnvPath });
  console.log("[INIT] Starting application");

  overrideEnvironment(envOverrides);
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

  const pretixSyncService = startPretixSyncService(
    context,
    rollbarService,
    apis.pretixAPI
  );
  const provingService = await startProvingService();
  const emailService = startEmailService(
    context,
    rollbarService,
    apis.emailAPI
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

function overrideEnvironment(envOverrides?: Partial<EnvironmentVariables>) {
  console.log("[INIT] overriding environment variables");
  for (const entry of Object.entries(envOverrides ?? {})) {
    process.env[entry[0]] = entry[1];
    console.log(
      "[INIT] overriding environment variable",
      entry[0],
      "with",
      entry[1]
    );
    if (entry[1] === undefined) {
      delete process.env[entry[0]];
    }
  }
  console.log("[INIT] finished overriding environment variables");
}

async function getOverridenApis(
  apiOverrides?: () => Partial<APIs>
): Promise<APIs> {
  const overriden = apiOverrides && apiOverrides();

  let emailAPI: IEmailAPI | null = null;

  if (overriden?.emailAPI) {
    console.log("[INIT] overriding email client");
    emailAPI = overriden.emailAPI;
  } else {
    if (process.env.MAILGUN_API_KEY === undefined) {
      console.log("[EMAIL] Missing environment variable: MAILGUN_API_KEY");
      emailAPI = null;
    } else {
      emailAPI = { send: sendEmail };
    }
  }

  let pretixAPI: PretixAPI | null = null;

  if (overriden?.pretixAPI) {
    console.log("[INIT] overriding pretix api");
    pretixAPI = overriden.pretixAPI;
  } else {
    pretixAPI = getPretixAPI();
  }

  return {
    emailAPI,
    pretixAPI,
  };
}
