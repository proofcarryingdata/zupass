/* eslint-disable */
import * as dotenv from "dotenv";
import * as path from "path";
import yargs from "yargs";

import { DevconnectPretixAPI } from "../src/apis/devconnect/devconnectPretixAPI";
import { getDB } from "../src/database/postgresPool";
import { fetchPretixEventInfo } from "../src/database/queries/pretixEventInfo";
import {
  insertPretixEventConfig,
  insertPretixOrganizerConfig
} from "../src/database/queries/pretix_config/insertConfiguration";
import { logger } from "../src/util/logger";

dotenv.config({ path: path.join(__dirname, "..", ".env") });

yargs
  .scriptName("yarn scratch")
  .usage("$0 <cmd> [args]")
  .command(
    "fetch",
    "Fetch all events and items from pretix",
    (yargs) => {},
    async function (argv) {
      const orgUrl: string = process.env.SCRATCH_PRETIX_ORG_URL!;
      const token: string = process.env.SCRATCH_PRETIX_TOKEN!;

      if (!orgUrl || !token) {
        throw new Error(`missing orgUrl or pretix token`);
      }

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
        const itemsStr = `  ITEMS: {${items.map((i) => i.id).join(", ")}}`;
        logger(itemsStr);
      }

      logger();
    }
  )
  .command(
    "new-dev-event [token] [orgUrl] [eventId] [activeItemIds]",
    "Create a new event for development",
    (yargs) =>
      yargs
        .positional("token", {
          type: "string",
          demandOption: true,
          describe:
            "Pretix auth token (see https://docs.pretix.eu/en/latest/api/tokenauth.html)"
        })
        .positional("orgUrl", {
          type: "string",
          default: "https://pretix.eu/api/v1/organizers/pcd-0xparc",
          describe:
            "the org url for the event (ex: https://pretix.eu/api/v1/organizers/pcd-0xparc)"
        })
        .positional("eventId", {
          type: "string",
          default: "progcrypto",
          describe: "the id of the event (ex: progcrypto)"
        })
        .positional("activeItemIds", {
          type: "string",
          default: "369803,369805,369804,374045,374043",
          describe:
            "Comma separated list of active item ids ex: 369803,369805,374045"
        }),
    async function (argv) {
      logger(
        `Creating event with org: ${argv.orgUrl} id: ${argv.eventId} and active items: ${argv.activeItemIds}`
      );

      const db = await getDB();

      const organizerConfigId = await insertPretixOrganizerConfig(
        db,
        argv.orgUrl,
        argv.token
      );
      logger(`organizerConfigId: ${organizerConfigId}`);

      const eventConfigId = await insertPretixEventConfig(
        db,
        organizerConfigId,
        argv.activeItemIds.split(","),
        [],
        argv.eventId
      );
      logger(`eventConfigId: ${eventConfigId}`);

      const eventInfo = await fetchPretixEventInfo(db, eventConfigId);
      if (!eventInfo)
        logger(
          `The event for eventConfigId ${eventConfigId} has not been found yet. Make sure the passport-server is running and has synced the latest Pretix info`
        );
      else {
        logger(
          `You have successfully added ${eventInfo.event_name} to your local DB.\nTo link this event with Telegram, create a new private group, add your bot to the channel, then type:`
        );
        logger(`\/link ${eventInfo.event_name}`);
      }
      await db.end();
    }
  )
  .help().argv;

if (process.argv.slice(2).length === 0) {
  yargs.showHelp();
}
