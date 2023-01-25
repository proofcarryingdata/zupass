import * as dotenv from "dotenv";
import * as path from "path";
import { startApplication } from "./application";
import { IS_PROD } from "./util/isProd";

const dotEnvPath = IS_PROD
  ? `/etc/secrets/.env`
  : path.join(process.cwd(), ".env");

console.log(`[INIT] Loading environment variables from: ${dotEnvPath} `);
dotenv.config({ path: dotEnvPath });
console.log("[INIT] Starting application");

startApplication();
