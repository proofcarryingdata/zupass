import { OfflineTickets } from "@pcd/passport-interface";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import { randomUUID } from "crypto";
import "mocha";
import { step } from "mocha-steps";
import MockDate from "mockdate";
import { Pool } from "postgres-pool";
import { checkInOfflineTickets } from "../src/database/multitableQueries/checkInOfflineTickets";
import { fetchOfflineTicketsForChecker } from "../src/database/multitableQueries/fetchOfflineTickets";
import { getDB } from "../src/database/postgresPool";
import { insertDevconnectPretixTicket } from "../src/database/queries/devconnect_pretix_tickets/insertDevconnectPretixTicket";
import { insertPretixEventsInfo } from "../src/database/queries/pretixEventInfo";
import { insertPretixItemsInfo } from "../src/database/queries/pretixItemInfo";
import {
  insertPretixEventConfig,
  insertPretixOrganizerConfig
} from "../src/database/queries/pretix_config/insertConfiguration";
import { upsertUser } from "../src/database/queries/saveUser";
import { overrideEnvironment, testingEnv } from "./util/env";
import { randomEmail } from "./util/util";

interface TestUser {
  email: string;
  identity: Identity;
  fullName: string;
}

function makeTestUser(): TestUser {
  return {
    email: randomEmail(),
    identity: new Identity(),
    fullName: "test name"
  };
}

describe("offline checkin database queries should work", function () {
  this.timeout(15_000);

  let db: Pool;

  const user1 = makeTestUser();
  const user2 = makeTestUser();
  const user3 = makeTestUser();

  this.beforeAll(async () => {
    await overrideEnvironment(testingEnv);
    db = await getDB();
  });

  step("database should initialize", async function () {
    expect(db).to.not.eq(null);
  });

  step("inserting some test users", async function () {
    await upsertUser(db, {
      email: user1.email,
      commitment: user1.identity.commitment.toString(),
      encryptionKey: undefined,
      salt: undefined,
      terms_agreed: 1,
      extra_issuance: false
    });

    await upsertUser(db, {
      email: user2.email,
      commitment: user2.identity.commitment.toString(),
      encryptionKey: undefined,
      salt: undefined,
      terms_agreed: 1,
      extra_issuance: false
    });

    await upsertUser(db, {
      email: user3.email,
      commitment: user3.identity.commitment.toString(),
      encryptionKey: undefined,
      salt: undefined,
      terms_agreed: 1,
      extra_issuance: false
    });
  });

  step(
    "checking that users only get their appropriate offline tickets",
    async function () {
      const superItemName = "superuser";
      const gaItemName = "ga";
      const progCryptoEventName = "progcrypto";
      const awEventName = "aw";

      const oxparc = await insertPretixOrganizerConfig(db, "test.com", "test");
      const progCrypto = await insertPretixEventConfig(
        db,
        oxparc,
        ["1", "1000"],
        ["1000"],
        progCryptoEventName
      );
      const progCryptoInfo = await insertPretixEventsInfo(
        db,
        progCryptoEventName,
        progCrypto,
        "0"
      );
      const progCryptoGA = await insertPretixItemsInfo(
        db,
        "1",
        progCryptoInfo,
        gaItemName
      );
      const progCryptoSuper = await insertPretixItemsInfo(
        db,
        "1000",
        progCryptoInfo,
        superItemName
      );
      const aw = await insertPretixEventConfig(
        db,
        oxparc,
        ["2", "2000"],
        ["2000"],
        awEventName
      );
      const awInfo = await insertPretixEventsInfo(db, awEventName, aw, "0");
      const awGA = await insertPretixItemsInfo(db, "2", awInfo, gaItemName);
      const awSuper = await insertPretixItemsInfo(
        db,
        "2000",
        awInfo,
        superItemName
      );

      let positionId = 0;

      const user1ProgCryptoGA = await insertDevconnectPretixTicket(db, {
        checker: null,
        devconnect_pretix_items_info_id: progCryptoGA,
        email: user1.email,
        full_name: user1.fullName,
        is_consumed: false,
        is_deleted: false,
        position_id: positionId++ + "",
        pretix_checkin_timestamp: null,
        secret: randomUUID(),
        zupass_checkin_timestamp: null,
        pretix_events_config_id: progCrypto
      });
      const user1AwGA = await insertDevconnectPretixTicket(db, {
        checker: null,
        devconnect_pretix_items_info_id: awGA,
        email: user1.email,
        full_name: user1.fullName,
        is_consumed: false,
        is_deleted: false,
        position_id: positionId++ + "",
        pretix_checkin_timestamp: null,
        secret: randomUUID(),
        zupass_checkin_timestamp: null,
        pretix_events_config_id: aw
      });
      const user2ProgCryptoGA = await insertDevconnectPretixTicket(db, {
        checker: null,
        devconnect_pretix_items_info_id: progCryptoGA,
        email: user2.email,
        full_name: user2.fullName,
        is_consumed: false,
        is_deleted: false,
        position_id: positionId++ + "",
        pretix_checkin_timestamp: null,
        secret: randomUUID(),
        zupass_checkin_timestamp: null,
        pretix_events_config_id: progCrypto
      });
      const user2ProgCryptoSuper = await insertDevconnectPretixTicket(db, {
        checker: null,
        devconnect_pretix_items_info_id: progCryptoSuper,
        email: user2.email,
        full_name: user2.fullName,
        is_consumed: false,
        is_deleted: false,
        position_id: positionId++ + "",
        pretix_checkin_timestamp: null,
        secret: randomUUID(),
        zupass_checkin_timestamp: null,
        pretix_events_config_id: progCrypto
      });
      const user2AwSuper = await insertDevconnectPretixTicket(db, {
        checker: null,
        devconnect_pretix_items_info_id: awSuper,
        email: user2.email,
        full_name: user2.fullName,
        is_consumed: false,
        is_deleted: false,
        position_id: positionId++ + "",
        pretix_checkin_timestamp: null,
        secret: randomUUID(),
        zupass_checkin_timestamp: null,
        pretix_events_config_id: aw
      });
      const user3AwSuper = await insertDevconnectPretixTicket(db, {
        checker: null,
        devconnect_pretix_items_info_id: awSuper,
        email: user3.email,
        full_name: user3.fullName,
        is_consumed: false,
        is_deleted: false,
        position_id: positionId++ + "",
        pretix_checkin_timestamp: null,
        secret: randomUUID(),
        zupass_checkin_timestamp: null,
        pretix_events_config_id: aw
      });

      expectOfflineTickets(
        await fetchOfflineTicketsForChecker(
          db,
          user1.identity.commitment.toString()
        ),
        {
          devconnectTickets: []
        }
      );

      expectOfflineTickets(
        await fetchOfflineTicketsForChecker(
          db,
          user2.identity.commitment.toString()
        ),
        {
          devconnectTickets: [
            {
              id: user1ProgCryptoGA.id,
              attendeeEmail: user1.email,
              attendeeName: user1.fullName,
              eventName: progCryptoEventName,
              ticketName: gaItemName,
              checkinTimestamp: undefined,
              checker: null,
              is_consumed: false
            },
            {
              id: user1AwGA.id,
              attendeeEmail: user1.email,
              attendeeName: user1.fullName,
              eventName: awEventName,
              ticketName: gaItemName,
              checkinTimestamp: undefined,
              checker: null,
              is_consumed: false
            },
            {
              id: user2ProgCryptoGA.id,
              attendeeEmail: user2.email,
              attendeeName: user2.fullName,
              eventName: progCryptoEventName,
              ticketName: gaItemName,
              checkinTimestamp: undefined,
              checker: null,
              is_consumed: false
            },
            {
              id: user2ProgCryptoSuper.id,
              attendeeEmail: user2.email,
              attendeeName: user2.fullName,
              eventName: progCryptoEventName,
              ticketName: superItemName,
              checkinTimestamp: undefined,
              checker: null,
              is_consumed: false
            },
            {
              id: user2AwSuper.id,
              attendeeEmail: user2.email,
              attendeeName: user2.fullName,
              eventName: awEventName,
              ticketName: superItemName,
              checkinTimestamp: undefined,
              checker: null,
              is_consumed: false
            },
            {
              id: user3AwSuper.id,
              attendeeEmail: user3.email,
              attendeeName: user3.fullName,
              eventName: awEventName,
              ticketName: superItemName,
              checkinTimestamp: undefined,
              checker: null,
              is_consumed: false
            }
          ]
        }
      );

      expectOfflineTickets(
        await fetchOfflineTicketsForChecker(
          db,
          user3.identity.commitment.toString()
        ),
        {
          devconnectTickets: [
            {
              id: user1AwGA.id,
              attendeeEmail: user1.email,
              attendeeName: user1.fullName,
              eventName: awEventName,
              ticketName: gaItemName,
              checkinTimestamp: undefined,
              checker: null,
              is_consumed: false
            },
            {
              id: user2AwSuper.id,
              attendeeEmail: user2.email,
              attendeeName: user2.fullName,
              eventName: awEventName,
              ticketName: superItemName,
              checkinTimestamp: undefined,
              checker: null,
              is_consumed: false
            },
            {
              id: user3AwSuper.id,
              attendeeEmail: user3.email,
              attendeeName: user3.fullName,
              eventName: awEventName,
              ticketName: superItemName,
              checkinTimestamp: undefined,
              checker: null,
              is_consumed: false
            }
          ]
        }
      );

      const now = new Date();
      MockDate.set(now);

      await checkInOfflineTickets(db, user3.identity.commitment.toString(), [
        user1AwGA.id,
        user1AwGA.id, // 2nd checkin of same ticket does not cause an error, just a log
        user2AwSuper.id, // checking in multiple tickets should work
        user1ProgCryptoGA.id // checkin of ticket to an event the user doesn't have a superuser ticket to should be ignored
      ]);

      // after checking in, the right tickets should be removed from the user's
      // offline mode ticket list
      expectOfflineTickets(
        await fetchOfflineTicketsForChecker(
          db,
          user3.identity.commitment.toString()
        ),
        {
          devconnectTickets: [
            {
              id: user1AwGA.id,
              attendeeEmail: user1.email,
              attendeeName: user1.fullName,
              eventName: awEventName,
              ticketName: gaItemName,
              checkinTimestamp: now.toISOString(),
              checker: user3.email,
              is_consumed: true
            },
            {
              id: user2AwSuper.id,
              attendeeEmail: user2.email,
              attendeeName: user2.fullName,
              eventName: awEventName,
              ticketName: superItemName,
              checkinTimestamp: now.toISOString(),
              checker: user3.email,
              is_consumed: true
            },
            {
              id: user3AwSuper.id,
              attendeeEmail: user3.email,
              attendeeName: user3.fullName,
              eventName: awEventName,
              ticketName: superItemName,
              checkinTimestamp: undefined,
              checker: null,
              is_consumed: false
            }
          ]
        }
      );
    }
  );
});

function expectOfflineTickets(
  actual: OfflineTickets,
  expected: OfflineTickets
): void {
  expect(actual.devconnectTickets).to.deep.equalInAnyOrder(
    expected.devconnectTickets
  );
}
