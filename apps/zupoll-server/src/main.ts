// prettier-ignore
import * as dotenv from "dotenv";
import * as path from "path";
import { LOGO, logger } from "./util/logger";

const dotEnvPath =
  process.env.NODE_ENV === "production"
    ? `/etc/secrets/.env`
    : path.join(process.cwd(), ".env");
dotenv.config({ path: dotEnvPath });

import { IS_PROD } from "./env";

logger.info(LOGO);
logger.info(`mode: ${IS_PROD ? "production" : "development"}`);
logger.info(`[INIT] Loading environment variables from: `);
logger.info(`[INIT]`, dotEnvPath);
logger.info("[INIT] Starting Zupoll");

import { startApplication } from "./application";
startApplication();
