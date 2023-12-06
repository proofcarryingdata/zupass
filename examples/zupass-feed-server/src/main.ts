import dotenv from "dotenv";
import path from "path";
import Application from "./app";

const dotEnvPath = path.join(process.cwd(), ".env");
dotenv.config({ path: dotEnvPath });

export const ZUPASS_PUBLIC_KEY = JSON.parse(
  process.env.ZUPASS_PUBLIC_KEY as string
);

new Application().start({ port: parseInt(process.env.PORT ?? "3100") });
