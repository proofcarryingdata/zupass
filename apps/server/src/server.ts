import * as dotenv from "dotenv";
import * as path from "path";
import { startAPI } from "./api/api";
import { IS_PROD } from "./isProd";

// in production, the .env file is placed at the root of the project,
// rather than being under `apps/server`
const dotEnvPath = IS_PROD
  ? path.join(process.cwd(), ".env")
  : path.join(process.cwd(), "../../.env");

console.log(`Loading environment variables from: ${dotEnvPath} `);
dotenv.config({ path: dotEnvPath });
console.log("Starting server");

startAPI();
