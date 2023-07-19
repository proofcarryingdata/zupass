/* eslint-disable turbo/no-undeclared-env-vars */
import { DevconnectPretixAPI } from "../src/apis/devconnect/devconnectPretixAPI";
import { logger } from "../src/util/logger";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, ".env") });

const orgUrl: string = process.env.ORG_URL!;
const token: string = process.env.PRETIX_TOKEN!;

if (!orgUrl || !token) {
  logger(`missing orgUrl or pretix token`);
  process.exit(0);
}

async function scratch(): Promise<void> {
  const api = new DevconnectPretixAPI();
  const events = await api.fetchAllEvents(orgUrl, token);

  logger();
  logger(`EVENTS: ${orgUrl}`);
  events.forEach((e) => {
    logger(`EVENT: name: '${e.name.en}'; 'slug: ${e.slug}'`);
  });
  logger();
}

scratch()
  .then(() => {
    logger("DONE");
    process.exit(0);
  })
  .catch((e) => {
    logger(e);
    process.exit(0);
  });
