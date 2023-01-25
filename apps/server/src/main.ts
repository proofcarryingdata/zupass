import * as dotenv from "dotenv";
import * as path from "path";
import { startServer } from "./routing/server";
import { IS_PROD } from "./util/isProd";

const dotEnvPath = IS_PROD
  ? `/etc/secrets/.env`
  : path.join(process.cwd(), ".env");

console.log(`Loading environment variables from: ${dotEnvPath} `);
dotenv.config({ path: dotEnvPath });
console.log("Starting server");

startServer();
