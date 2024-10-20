/* eslint-disable */
import { POST } from "@pcd/passport-interface";
import { getErrorMessage, sleep } from "@pcd/util";
import * as dotenv from "dotenv";
import * as path from "path";
import yargs from "yargs";

import { Group } from "@semaphore-protocol/group";
import { Identity } from "@semaphore-protocol/identity";
import { randomUUID } from "crypto";
import { DevconnectPretixAPI } from "../src/apis/devconnect/devconnectPretixAPI";
import { getDB } from "../src/database/postgresPool";
import {
  fetchPretixEventInfo,
  insertPretixEventsInfo
} from "../src/database/queries/pretixEventInfo";
import {
  insertPretixEventConfig,
  insertPretixOrganizerConfig
} from "../src/database/queries/pretix_config/insertConfiguration";
import { logger } from "../src/util/logger";
import { FROG_SLUG } from "../src/util/telegramHelpers";
import {
  ESMERALDA_TICKET_TYPES,
  parseTicketTypeEntry
} from "./esmeralda-events";

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

      const pool = await getDB();
      const db = await pool.connect();

      const organizerConfigId = await insertPretixOrganizerConfig(
        db,
        argv.orgUrl,
        argv.token,
        false
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
  .command(
    "nothing",
    "like a repl but w/ convenient access to all project and package functions",
    () => {},
    async function () {
      try {
        throw new Error("Connection terminated unexpectedly");
      } catch (e) {
        console.log(getErrorMessage(e));
        console.log(e);
      }
    }
  )
  .command(
    "frogs-assets [frog-data-json-path] [frog-images-src] [frog-images-dest]",
    "copy the frog images from <id>.png to <uuid>.png",
    (yargs) =>
      yargs
        .positional("frogDataJsonPath", {
          type: "string",
          demandOption: true,
          describe: "path to the frog data json file"
        })
        .positional("frogImagesSrc", {
          type: "string",
          demandOption: true,
          describe: "path to the frog images directory to read"
        })
        .positional("frogImagesDest", {
          type: "string",
          demandOption: true,
          describe: "path to the frog images directory to save"
        }),
    async function (argv) {
      const frogData = require(argv.frogDataJsonPath);
      const fs = require("fs");
      const path = require("path");

      const frogImagesSrc = path.resolve(argv.frogImagesSrc);
      const frogImagesDest = path.resolve(argv.frogImagesDest);

      for (const frog of frogData) {
        const src = path.join(
          frogImagesSrc,
          `${String(frog.frogId).padStart(2, "0")}.png`
        );
        const dest = path.join(frogImagesDest, `${frog.uuid}.png`);
        try {
          fs.copyFileSync(src, dest, fs.constants.COPYFILE_FICLONE);
        } catch (e) {
          console.error(`Error copying ${src} to ${dest}: ${e}`);
        }
      }
    }
  )
  .command(
    "new-fake-frog-event",
    "Create a new fake event for frog owners",
    () => {},
    async function () {
      const orgUrl = "frogs.org";
      const token = "frogs-token";
      const eventId = "frog-owners-event-id";
      const eventName = "frog-owners-event-" + FROG_SLUG;
      const itemId = "1";
      const activeItemIds = [itemId];
      const checkinListId = "0";

      const pool = await getDB();
      const db = await pool.connect();

      const organizerConfigId = await insertPretixOrganizerConfig(
        db,
        orgUrl,
        token,
        false
      );
      logger(`organizerConfigId: ${organizerConfigId}`);

      const eventConfigId = await insertPretixEventConfig(
        db,
        organizerConfigId,
        activeItemIds,
        [],
        eventId
      );
      logger(`eventConfigId: ${eventConfigId}`);

      const eventsInfoId = await insertPretixEventsInfo(
        db,
        eventName,
        eventConfigId,
        checkinListId
      );
      logger(`eventsInfoId: ${eventsInfoId}`);

      await db.end();
    }
  )
  .command(
    "semaphore-group-load",
    "",
    async function (yargs) {},
    async function (argv) {
      let commitments = [];
      let group: Group = new Group("1", 16);

      const runs = 3;

      let start = performance.now();

      for (let j = 0; j < runs; j++) {
        commitments = [];
        for (let i = 0; i < 5000; i++) {
          const identity = new Identity();
          commitments.push(identity.commitment.toString());
        }

        group = new Group("1", 16, commitments);
      }

      let finish = performance.now();

      console.log(
        `Average time to create 5000-member semaphore group is ${
          (finish - start) / runs
        } ms`
      );

      start = performance.now();

      const numberOfMembersToChange = 40;

      for (let k = 0; k < runs; k++) {
        // Cut off the first n commitments
        commitments = commitments.slice(numberOfMembersToChange);

        // Add n new commitments
        for (let i = 0; i < numberOfMembersToChange; i++) {
          const identity = new Identity();
          commitments.push(identity.commitment.toString());
        }

        const existingMembers = new Set(
          group.members.map((item) => item.toString())
        );
        const membersToAdd = commitments.filter(
          (id) => !existingMembers.has(id)
        );
        const latestMembers = new Set(commitments);
        const membersToRemove = group.members.filter(
          (id) => !latestMembers.has(id.toString())
        );

        for (const newId of membersToAdd) {
          group.addMember(BigInt(newId));
        }

        for (const deletedId of membersToRemove) {
          group.removeMember(group.indexOf(BigInt(deletedId)));
        }
      }

      finish = performance.now();

      console.log(
        `Average time to remove and insert ${numberOfMembersToChange} members of a 5000-member semaphore group is ${
          (finish - start) / runs
        } ms`
      );
    }
  )
  .command(
    "parse-edge-esmeralda-events",
    "",
    async function (yargs) {},
    async function (argv) {
      const parsed = ESMERALDA_TICKET_TYPES.map(parseTicketTypeEntry);
      console.log(
        parsed.map((parsed) => ({
          genericIssuanceProductId: randomUUID(),
          externalId: parsed?.id,
          isSuperUser: false,
          name: parsed?.name
        }))
      );
    }
  )
  .help().argv;

if (process.argv.slice(2).length === 0) {
  yargs.showHelp();
}
