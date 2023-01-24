import * as dotenv from "dotenv";
import * as path from "path";
import { startAPI } from "./api/api";

const dotEnvPath = path.join(process.cwd(), ".env");

console.log(`Loading environment variables from: ${dotEnvPath} `);
dotenv.config({ path: dotEnvPath });
console.log("Starting server");

startAPI();
