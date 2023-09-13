/* eslint-disable */
import * as dotenv from "dotenv";
import * as path from "path";
import yargs from "yargs";

import { DevconnectPretixAPI } from "../src/apis/devconnect/devconnectPretixAPI";
import { getDB } from "../src/database/postgresPool";
import { insertDevconnectPretixTicket } from "../src/database/queries/devconnect_pretix_tickets/insertDevconnectPretixTicket";
import { insertPretixEventsInfo } from "../src/database/queries/pretixEventInfo";
import { insertPretixItemsInfo } from "../src/database/queries/pretixItemInfo";
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
      const orgUrl: string = process.env.ORG_URL!;
      const token: string = process.env.PRETIX_TOKEN!;

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
    "new-dev-event [name]",
    "Create a new event for development",
    (yargs) =>
      yargs.positional("name", {
        type: "string",
        default: "Zero Nexus: Exploring the Frontiers of Zero-Knowledge",
        describe: "the name of the event"
      }),
    async function (argv) {
      const db = await getDB();
      const organizerConfigId = await insertPretixOrganizerConfig(
        db,
        "http://localhost",
        "pretix_dummy_token_1234"
      );
      logger(`organizerConfigId: ${organizerConfigId}`);
      const eventConfigId = await insertPretixEventConfig(
        db,
        organizerConfigId,
        ["1"],
        [],
        "dummy_pretix_event_id_123"
      );
      logger(`eventConfigId: ${eventConfigId}`);
      const pretixEventId = await insertPretixEventsInfo(
        db,
        argv.name as string,
        eventConfigId,
        "0"
      );
      logger(`pretixEventId: ${pretixEventId}`);
      const pretixItemId = await insertPretixItemsInfo(
        db,
        "1",
        pretixEventId,
        "Ticket"
      );
      logger(`pretixItemId: ${pretixItemId}`);
    }
  )
  .command(
    "new-dev-ticket <email> <name> [event-item]",
    "Create a new ticket for development",
    (yargs) =>
      yargs
        .positional("email", {
          type: "string",
          demandOption: true,
          describe: "the email of the ticket holder"
        })
        .positional("name", {
          type: "string",
          demandOption: true,
          describe: "the name of the ticket holder"
        })
        .positional("eventItem", {
          type: "string",
          describe:
            "the event item id of the ticket. if missing, first item in db will be used"
        }),
    async function (argv) {
      const db = await getDB();
      const pretixItemId = await new Promise<string>(
        async (resolve, reject) => {
          if (argv.eventItem) {
            const result = await db.query(
              `select id from devconnect_pretix_items_info where item_id = $1`,
              [argv.eventItem]
            );
            if (result.rowCount) {
              resolve(result.rows[0].id);
            } else {
              reject(new Error(`item id ${argv.eventItem} not found`));
            }
          }

          const result = await db.query(
            `select id from devconnect_pretix_items_info limit 1`
          );
          if (result.rowCount) {
            resolve(result.rows[0].id);
          } else {
            reject(new Error(`no items found`));
          }
        }
      );

      insertDevconnectPretixTicket(db, {
        checker: "dummy_checker",
        email: argv.email as string,
        full_name: argv.name as string,
        devconnect_pretix_items_info_id: pretixItemId,
        pcdpass_checkin_timestamp: null,
        is_consumed: false,
        is_deleted: false,
        position_id: "0",
        pretix_checkin_timestamp: null,
        secret: ""
      });
    }
  )
  .help().argv;
