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
  for (const e of events) {
    const items = await api.fetchItems(orgUrl, token, e.slug);
    logger(`EVENT name: '${e.name.en}'; slug: '${e.slug}'`);
    items.forEach((i) => {
      logger(`  ITEM id: '${i.id}'; name: '${i.name.en}'`);
    });
  }

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
