import * as dotenv from "dotenv";
import * as path from "path";
import { startAPI } from "./api/api";
import { IS_PROD } from "./isProd";

const dotEnvPath = IS_PROD
  ? `/etc/secrets/.env`
  : path.join(process.cwd(), ".env");

console.log(`Loading environment variables from: ${dotEnvPath} `);
dotenv.config({ path: dotEnvPath });
console.log("Starting server");

startAPI();
