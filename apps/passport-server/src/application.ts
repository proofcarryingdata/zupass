import { getCommitHash, getCommitMessage } from "@pcd/server-shared";
import { ZUPASS_GITHUB_REPOSITORY_URL } from "@pcd/util";
import sendgrid from "@sendgrid/mail";
import process from "node:process";
import * as path from "path";
import urljoin from "url-join";
import { getDevconnectPretixAPI } from "./apis/devconnect/devconnectPretixAPI";
import { IEmailAPI, createEmailAPI } from "./apis/emailAPI";
import { getHoneycombAPI } from "./apis/honeycombAPI";
import { ILemonadeAPI, getLemonadeAPI } from "./apis/lemonade/lemonadeAPI";
import {
  IGenericPretixAPI,
  getGenericPretixAPI
} from "./apis/pretix/genericPretixAPI";
import { ZuzaluPretixAPI, getZuzaluPretixAPI } from "./apis/zuzaluPretixAPI";
import { getDB } from "./database/postgresPool";
import { startHttpServer, stopHttpServer } from "./routing/server";
import { startServices, stopServices } from "./services";
import { DevconnectPretixAPIFactory } from "./services/devconnectPretixSyncService";
import { APIs, ApplicationContext, ServerMode, Zupass } from "./types";
import { logger } from "./util/logger";
import { trapSigTerm } from "./util/terminate";

process.on("unhandledRejection", (reason) => {
  if (reason instanceof Error) {
    logger("[ERROR] unhandled rejection \n" + reason.stack);
  } else {
    logger("[ERROR] unhandled rejection " + reason);
  }
});

/**
 * Starts the server, all the appropriate services, routes, and instantiates
 * the appropriate APIs if they have not been overriden by the caller.
 */
export async function startApplication(
  mode: ServerMode,
  apiOverrides?: Partial<APIs>
): Promise<Zupass> {
  logger(`[INIT] Starting application in mode ${mode}`);

  const dbPool = await getDB();
  const honeyClient = getHoneycombAPI();

  const context: ApplicationContext = {
    dbPool,
    honeyClient,
    resourcesDir: path.join(process.cwd(), "resources"),
    publicResourcesDir: path.join(process.cwd(), "public"),
    gitCommitHash: await getCommitHash(),
    mode
  };

  const apis = await getOverridenApis(context, apiOverrides);
  const services = await startServices(context, apis);
  const expressServer = await startHttpServer(context, services);

  const commitMessage = await getCommitMessage();
  const discordAlertMessage = `Server \`${
    process.env.ROLLBAR_ENV_NAME
  }\` started at [\`${context.gitCommitHash.substring(0, 8)}\`](<${urljoin(
    ZUPASS_GITHUB_REPOSITORY_URL,
    "commit",
    context.gitCommitHash
  )}>)\n\`\`\`\n${commitMessage}\n\`\`\``;
  services.rollbarService?.log("Server started.");
  services.discordService?.sendAlert(discordAlertMessage);

  if (!process.env.PASSPORT_SERVER_URL) {
    throw new Error("expected process.env.PASSPORT_SERVER_URL");
  }

  const zupass: Zupass = {
    context,
    services,
    apis,
    expressContext: expressServer
  };

  trapSigTerm(zupass);

  return zupass;
}

export async function stopApplication(app?: Zupass): Promise<void> {
  if (!app) return;
  await stopServices(app.services);
  await stopHttpServer(app);
  await app.context.dbPool.end();
}

async function getOverridenApis(
  context: ApplicationContext,
  apiOverrides?: Partial<APIs>
): Promise<APIs> {
  let emailAPI: IEmailAPI | null = null;

  if (apiOverrides?.emailAPI) {
    logger("[INIT] overriding email client");
    emailAPI = apiOverrides.emailAPI;
  } else {
    if (process.env.SENDGRID_API_KEY === undefined) {
      logger("[EMAIL] Missing environment variable: SENDGRID_API_KEY");
      emailAPI = null;
    } else {
      sendgrid.setApiKey(process.env.SENDGRID_API_KEY);
      emailAPI = await createEmailAPI();
    }
  }

  let zuzaluPretixAPI: ZuzaluPretixAPI | null = null;

  if (apiOverrides?.zuzaluPretixAPI) {
    logger("[INIT] overriding zuzalu pretix api");
    zuzaluPretixAPI = apiOverrides.zuzaluPretixAPI;
  } else {
    zuzaluPretixAPI = getZuzaluPretixAPI();
  }

  let devconnectPretixAPIFactory: DevconnectPretixAPIFactory | null = null;

  if (apiOverrides?.devconnectPretixAPIFactory) {
    logger("[INIT] overriding devconnect pretix api factory");
    devconnectPretixAPIFactory = apiOverrides.devconnectPretixAPIFactory;
  } else {
    devconnectPretixAPIFactory = getDevconnectPretixAPI;
  }

  let lemonadeAPI: ILemonadeAPI | null = null;

  if (apiOverrides?.lemonadeAPI) {
    logger("[INIT] overriding Lemonade API");
    lemonadeAPI = apiOverrides.lemonadeAPI;
  } else {
    lemonadeAPI = getLemonadeAPI();
  }

  let genericPretixAPI: IGenericPretixAPI | null = null;

  if (apiOverrides?.genericPretixAPI) {
    logger("[INIT] overriding Generic Pretix API");
    genericPretixAPI = apiOverrides.genericPretixAPI;
  } else {
    genericPretixAPI = getGenericPretixAPI();
  }

  return {
    emailAPI,
    zuzaluPretixAPI,
    devconnectPretixAPIFactory,
    lemonadeAPI,
    genericPretixAPI
  };
}
