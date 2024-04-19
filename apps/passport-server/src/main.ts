// This file is the entry point of the server in development and production
// but not testing. Its main purpose is to load environment variables
// from a configuration file, and then just start the application immediately
// after that.

import dotenv from "dotenv";
import path from "path";
import { startApplication } from "./application";
import { IS_PROD } from "./util/isProd";
import { logger } from "./util/logger";

const dotEnvPath = IS_PROD
  ? path.join(process.cwd(), "../../", ".env")
  : path.join(process.cwd(), ".env");

logger(
  `[INIT] cwd:${process.cwd()}; Loading environment variables from: ${dotEnvPath} `
);
dotenv.config({ path: dotEnvPath });
logger("[INIT] Starting application");

startApplication();
