import { ZUCONNECT_PRODUCT_ID_MAPPINGS } from "@pcd/passport-interface";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import { randomUUID } from "crypto";
import "mocha";
import { step } from "mocha-steps";
import { Pool } from "postgres-pool";
import {
  fetchOfflineTicketsForChecker,
  OfflineTickets
} from "../src/database/multitableQueries/fetchOfflineTickets";
import { getDB } from "../src/database/postgresPool";
import { insertDevconnectPretixTicket } from "../src/database/queries/devconnect_pretix_tickets/insertDevconnectPretixTicket";
import { insertPretixEventsInfo } from "../src/database/queries/pretixEventInfo";
import { insertPretixItemsInfo } from "../src/database/queries/pretixItemInfo";
import {
  insertPretixEventConfig,
  insertPretixOrganizerConfig
} from "../src/database/queries/pretix_config/insertConfiguration";
import { upsertUser } from "../src/database/queries/saveUser";
import { upsertZuconnectTicket } from "../src/database/queries/zuconnect/insertZuconnectTicket";
import { overrideEnvironment, testingEnv } from "./util/env";
import { randomEmail } from "./util/util";

interface TestUser {
  email: string;
  identity: Identity;
  fullName: string;
  uuid?: string;
}

function makeTestUser(): TestUser {
  return {
    email: randomEmail(),
    identity: new Identity(),
    fullName: "test name"
  };
}

describe.only("offline checkin database queries should work", function () {
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
    const uuid = await upsertUser(db, {
      email: user1.email,
      commitment: user1.identity.commitment.toString(),
      encryptionKey: undefined,
      salt: undefined
    });
    user1.uuid = uuid;

    const uuid2 = await upsertUser(db, {
      email: user2.email,
      commitment: user2.identity.commitment.toString(),
      encryptionKey: undefined,
      salt: undefined
    });
    user2.uuid = uuid2;

    const uuid3 = await upsertUser(db, {
      email: user3.email,
      commitment: user3.identity.commitment.toString(),
      encryptionKey: undefined,
      salt: undefined
    });
    user3.uuid = uuid3;
  });

  step(
    "checking that users only get their appropriate offline tickets",
    async function () {
      if (!user1.uuid || !user2.uuid || !user3.uuid) {
        throw new Error("expected users to have db ids");
      }

      const oxparc = await insertPretixOrganizerConfig(db, "test.com", "test");
      const progCrypto = await insertPretixEventConfig(
        db,
        oxparc,
        ["1", "1000"],
        ["1000"],
        "event-1"
      );
      const progCryptoInfo = await insertPretixEventsInfo(
        db,
        "progcrypto",
        progCrypto,
        "0"
      );
      const progCryptoGA = await insertPretixItemsInfo(
        db,
        "1",
        progCryptoInfo,
        "normal"
      );
      const progCryptoSuper = await insertPretixItemsInfo(
        db,
        "1000",
        progCryptoInfo,
        "superuser"
      );
      const aw = await insertPretixEventConfig(
        db,
        oxparc,
        ["2", "2000"],
        ["2000"],
        "event-2"
      );
      const awInfo = await insertPretixEventsInfo(db, "aw", aw, "0");
      const awGA = await insertPretixItemsInfo(db, "2", awInfo, "normal");
      const awSuper = await insertPretixItemsInfo(
        db,
        "2000",
        awInfo,
        "superuser"
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
        zupass_checkin_timestamp: null
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
        zupass_checkin_timestamp: null
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
        zupass_checkin_timestamp: null
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
        zupass_checkin_timestamp: null
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
        zupass_checkin_timestamp: null
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
        zupass_checkin_timestamp: null
      });
      const user3Zuconnect = await upsertZuconnectTicket(db, {
        attendee_email: user3.email,
        attendee_name: user3.fullName,
        external_ticket_id: randomUUID(),
        is_deleted: false,
        is_mock_ticket: false,
        product_id: ZUCONNECT_PRODUCT_ID_MAPPINGS["ZuConnect Resident Pass"].id
      });
      const user2Zuconnect = await upsertZuconnectTicket(db, {
        attendee_email: user2.email,
        attendee_name: user2.fullName,
        external_ticket_id: randomUUID(),
        is_deleted: false,
        is_mock_ticket: false,
        product_id: ZUCONNECT_PRODUCT_ID_MAPPINGS["ZuConnect Resident Pass"].id
      });

      expectOfflineTickets(
        await fetchOfflineTicketsForChecker(db, user1.uuid),
        {
          devconnectTickets: [],
          zuconnectTickets: []
        }
      );

      expectOfflineTickets(
        await fetchOfflineTicketsForChecker(db, user2.uuid),
        {
          devconnectTickets: [
            { id: user1ProgCryptoGA.id },
            { id: user1AwGA.id },
            { id: user2ProgCryptoGA.id },
            { id: user2ProgCryptoSuper.id },
            { id: user2AwSuper.id },
            { id: user3AwSuper.id }
          ],
          zuconnectTickets: [
            { id: user3Zuconnect.id },
            { id: user2Zuconnect.id }
          ]
        }
      );

      expectOfflineTickets(
        await fetchOfflineTicketsForChecker(db, user3.uuid),
        {
          devconnectTickets: [
            { id: user1AwGA.id },
            { id: user2AwSuper.id },
            { id: user3AwSuper.id }
          ],
          zuconnectTickets: [
            { id: user3Zuconnect.id },
            { id: user2Zuconnect.id }
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
  expect(actual.zuconnectTickets).to.deep.equalInAnyOrder(
    expected.zuconnectTickets
  );
}
