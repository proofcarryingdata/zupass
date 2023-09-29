import process from "node:process";
import * as path from "path";
import { getDevconnectPretixAPI } from "./apis/devconnect/devconnectPretixAPI";
import { IEmailAPI, mailgunSendEmail } from "./apis/emailAPI";
import { getHoneycombAPI } from "./apis/honeycombAPI";
import { getZuzaluPretixAPI, ZuzaluPretixAPI } from "./apis/zuzaluPretixAPI";
import { getDB } from "./database/postgresPool";
import { startHttpServer, stopHttpServer } from "./routing/server";
import { startServices, stopServices } from "./services";
import { DevconnectPretixAPIFactory } from "./services/devconnectPretixSyncService";
import { APIs, ApplicationContext, Zupass } from "./types";
import { logger } from "./util/logger";
import { trapSigTerm } from "./util/terminate";
import { getCommitHash, getCommitMessage } from "./util/util";

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
  apiOverrides?: Partial<APIs>
): Promise<Zupass> {
  const dbPool = await getDB();
  const honeyClient = getHoneycombAPI();

  const context: ApplicationContext = {
    dbPool,
    honeyClient,
    resourcesDir: path.join(process.cwd(), "resources"),
    publicResourcesDir: path.join(process.cwd(), "public"),
    gitCommitHash: await getCommitHash()
  };

  const apis = await getOverridenApis(context, apiOverrides);
  const services = await startServices(context, apis);
  const expressServer = await startHttpServer(context, services);

  const commitMessage = await getCommitMessage();
  const discordAlertMessage = `Server \`${
    process.env.ROLLBAR_ENV_NAME
  }\` started at [\`${context.gitCommitHash.substring(
    0,
    8
  )}\`](https://github.com/proofcarryingdata/zupass/commit/${
    context.gitCommitHash
  })\n\`\`\`\n${commitMessage}\n\`\`\``;
  services.rollbarService?.log("Server started.");
  services.discordService?.sendAlert(discordAlertMessage);
  console.log(discordAlertMessage);

  process.exit(0);

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
    if (process.env.MAILGUN_API_KEY === undefined) {
      logger("[EMAIL] Missing environment variable: MAILGUN_API_KEY");
      emailAPI = null;
    } else {
      emailAPI = { send: mailgunSendEmail };
    }
  }

  let zuzaluPretixAPI: ZuzaluPretixAPI | null = null;

  if (apiOverrides?.zuzaluPretixAPI) {
    logger("[INIT] overriding pretix api");
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

  return {
    emailAPI,
    zuzaluPretixAPI,
    devconnectPretixAPIFactory
  };
}
