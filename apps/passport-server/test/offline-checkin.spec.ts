import {
  KnownTicketGroup,
  OfflineTickets,
  ZUCONNECT_PRODUCT_ID_MAPPINGS
} from "@pcd/passport-interface";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import { randomUUID } from "crypto";
import "mocha";
import { step } from "mocha-steps";
import { Pool } from "postgres-pool";
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
import { upsertZuconnectTicket } from "../src/database/queries/zuconnect/insertZuconnectTicket";
import { ZUPASS_TICKET_PUBLIC_KEY_NAME } from "../src/services/issuanceService";
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
    await upsertUser(db, {
      email: user1.email,
      commitment: user1.identity.commitment.toString(),
      encryptionKey: undefined,
      salt: undefined,
      terms_agreed: 1
    });

    await upsertUser(db, {
      email: user2.email,
      commitment: user2.identity.commitment.toString(),
      encryptionKey: undefined,
      salt: undefined,
      terms_agreed: 1
    });

    await upsertUser(db, {
      email: user3.email,
      commitment: user3.identity.commitment.toString(),
      encryptionKey: undefined,
      salt: undefined,
      terms_agreed: 1
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
      const user3Zuconnect = await upsertZuconnectTicket(db, {
        attendee_email: user3.email,
        attendee_name: user3.fullName,
        external_ticket_id: randomUUID(),
        is_deleted: false,
        is_mock_ticket: false,
        product_id: ZUCONNECT_PRODUCT_ID_MAPPINGS["ZuConnect Resident Pass"].id,
        extra_info: []
      });
      const user2Zuconnect = await upsertZuconnectTicket(db, {
        attendee_email: user2.email,
        attendee_name: user2.fullName,
        external_ticket_id: randomUUID(),
        is_deleted: false,
        is_mock_ticket: false,
        product_id: ZUCONNECT_PRODUCT_ID_MAPPINGS["ZuConnect Resident Pass"].id,
        extra_info: []
      });

      expectOfflineTickets(
        await fetchOfflineTicketsForChecker(
          db,
          user1.identity.commitment.toString()
        ),
        {
          devconnectTickets: [],
          secondPartyTickets: []
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
              checker: null
            },
            {
              id: user1AwGA.id,
              attendeeEmail: user1.email,
              attendeeName: user1.fullName,
              eventName: awEventName,
              ticketName: gaItemName,
              checkinTimestamp: undefined,
              checker: null
            },
            {
              id: user2ProgCryptoGA.id,
              attendeeEmail: user2.email,
              attendeeName: user2.fullName,
              eventName: progCryptoEventName,
              ticketName: gaItemName,
              checkinTimestamp: undefined,
              checker: null
            },
            {
              id: user2ProgCryptoSuper.id,
              attendeeEmail: user2.email,
              attendeeName: user2.fullName,
              eventName: progCryptoEventName,
              ticketName: superItemName,
              checkinTimestamp: undefined,
              checker: null
            },
            {
              id: user2AwSuper.id,
              attendeeEmail: user2.email,
              attendeeName: user2.fullName,
              eventName: awEventName,
              ticketName: superItemName,
              checkinTimestamp: undefined,
              checker: null
            },
            {
              id: user3AwSuper.id,
              attendeeEmail: user3.email,
              attendeeName: user3.fullName,
              eventName: awEventName,
              ticketName: superItemName,
              checkinTimestamp: undefined,
              checker: null
            }
          ],
          secondPartyTickets: [
            {
              id: user3Zuconnect.id,
              group: KnownTicketGroup.Zuconnect23,
              publicKeyName: ZUPASS_TICKET_PUBLIC_KEY_NAME,
              productId:
                ZUCONNECT_PRODUCT_ID_MAPPINGS["ZuConnect Resident Pass"].id
            },
            {
              id: user2Zuconnect.id,
              group: KnownTicketGroup.Zuconnect23,
              publicKeyName: ZUPASS_TICKET_PUBLIC_KEY_NAME,
              productId:
                ZUCONNECT_PRODUCT_ID_MAPPINGS["ZuConnect Resident Pass"].id
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
              checker: null
            },
            {
              id: user2AwSuper.id,
              attendeeEmail: user2.email,
              attendeeName: user2.fullName,
              eventName: awEventName,
              ticketName: superItemName,
              checkinTimestamp: undefined,
              checker: null
            },
            {
              id: user3AwSuper.id,
              attendeeEmail: user3.email,
              attendeeName: user3.fullName,
              eventName: awEventName,
              ticketName: superItemName,
              checkinTimestamp: undefined,
              checker: null
            }
          ],
          secondPartyTickets: [
            {
              id: user3Zuconnect.id,
              group: KnownTicketGroup.Zuconnect23,
              publicKeyName: ZUPASS_TICKET_PUBLIC_KEY_NAME,
              productId:
                ZUCONNECT_PRODUCT_ID_MAPPINGS["ZuConnect Resident Pass"].id
            },
            {
              id: user2Zuconnect.id,
              group: KnownTicketGroup.Zuconnect23,
              publicKeyName: ZUPASS_TICKET_PUBLIC_KEY_NAME,
              productId:
                ZUCONNECT_PRODUCT_ID_MAPPINGS["ZuConnect Resident Pass"].id
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
  expect(actual.secondPartyTickets).to.deep.equalInAnyOrder(
    expected.secondPartyTickets
  );
}
