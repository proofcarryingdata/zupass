import dotenv from "dotenv";
import path from "path";
import { startApplication } from "./application";
import { IS_PROD } from "./util/isProd";
import { logger } from "./util/logger";

const dotEnvPath = IS_PROD
  ? `/etc/secrets/.env`
  : path.join(process.cwd(), ".env");

logger(`[INIT] Loading environment variables from: ${dotEnvPath} `);
dotenv.config({ path: dotEnvPath });
logger("[INIT] Starting application");

startApplication();
