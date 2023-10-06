/* eslint-disable */
import { POST } from "@pcd/passport-interface";
import { sleep } from "@pcd/util";
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
    "load-test",
    "hit the server with a bunch of concurrent and expensive requests",
    (yargs) => {},
    async function (argv) {
      async function feedRequest(): Promise<void> {
        try {
          // intercept a request to a feed from your browser
          // to local zupass, and replace the value of this variable
          // with those contents to be able to make a successful request
          //
          // DO NOT COPY FROM PRODUCTION AND THEN PUSH UP TO GITHUB
          const body = {
            feedId: "1",
            pcd: {
              type: "semaphore-signature-pcd",
              pcd: '{"type":"semaphore-signature-pcd","id":"921d98d2-48b0-44b1-8bc7-040e9f574dee","claim":{"identityCommitment":"6368576203261280148459489981293616186042049665423978700256955226059762108897","signedMessage":"Issue me PCDs please.","nullifierHash":"10926647402999285739140477893106952445693492788887386568698432014509862263494"},"proof":["14391771359848494044394873244088885176143176472000485743800015364978497527339","10124192264369239174163667668462015581731397216964704235804314046160012774090","16061224285589265512667308844285814232964384232420985149046546017339745255094","3108694103257144957620543534461116575494758498969366904176746652523663542203","20123947622811386025559944337478018455051425944096959166962382396427608303238","7988631303086803965885415538780191840705391042376700794903795653015450202386","4237928369589108381493006148930766810367253498664187784147830474852186719939","6135326456291074402601364133367746708926397152317455158769043809217947461198"]}'
            }
          };

          const url = "http://localhost:3002/feeds";
          console.log(`making request to ${url}`);
          const res = await fetch(url, {
            ...POST,
            body: JSON.stringify(body)
          });
          console.log(`got a result from ${url}`);
          const resText = await res.text();
          console.log(resText.substring(0, Math.min(300, resText.length - 2)));
        } catch (e) {
          console.log(e);
        }
      }

      const sleepBetweenRuns = 0;
      const sleepBetweenRequests = 0;
      const perIterationCount = 100;
      let i = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        console.log("%%%%%%%%%%%%%%%%%%%%%%%");
        console.log("STARTING ITERATION " + ++i);
        console.log("%%%%%%%%%%%%%%%%%%%%%%%");
        const promises = [];
        for (let i = 0; i < perIterationCount; i++) {
          promises.push(feedRequest());
          await sleep(sleepBetweenRequests);
        }
        await Promise.allSettled(promises);
        await sleep(sleepBetweenRuns);
      }
    }
  )
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
