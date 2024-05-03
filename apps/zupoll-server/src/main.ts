// prettier-ignore
import * as dotenv from "dotenv";
import * as path from "path";
import { LOGO, logger } from "./util/logger";

process
  .on("unhandledRejection", (reason, p) => {
    console.error(reason, "Unhandled Rejection at Promise", p);
  })
  .on("uncaughtException", (err) => {
    console.error(err, "Uncaught Exception thrown");
    process.exit(1);
  });

const dotEnvPath =
  process.env.NODE_ENV === "production"
    ? `/etc/secrets/.env`
    : path.join(process.cwd(), ".env");
dotenv.config({ path: dotEnvPath });

import { IS_PROD } from "./env";

logger.info(LOGO);
logger.info(`[INIT] mode: ${IS_PROD ? "production" : "development"}`);
logger.info(`[INIT] Loading environment variables from: `);
logger.info(`[INIT]`, dotEnvPath);
logger.info("[INIT] Starting Zupoll");

import { startApplication } from "./application";
startApplication();
