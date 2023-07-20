import { expect } from "chai";
import "mocha";
import { step } from "mocha-steps";
import { Pool } from "pg";
import { v4 as uuid } from "uuid";
import { DevconnectPretixTicket } from "../src/database/models";
import { getDB } from "../src/database/postgresPool";
import {
  fetchDevconnectPretixTicketsByEmail,
  fetchDevconnectPretixTicketsByEvent,
  fetchDevconnectSuperusers,
  fetchDevconnectSuperusersForEvent
} from "../src/database/queries/devconnect_pretix_tickets/fetchDevconnectPretixTicket";
import { insertDevconnectPretixTicket } from "../src/database/queries/devconnect_pretix_tickets/insertDevconnectPretixTicket";
import {
  consumeDevconnectPretixTicket,
  updateDevconnectPretixTicket
} from "../src/database/queries/devconnect_pretix_tickets/updateDevconnectPretixTicket";
import {
  fetchPretixEventInfo,
  insertPretixEventsInfo
} from "../src/database/queries/pretixEventInfo";
import { insertPretixItemsInfo } from "../src/database/queries/pretixItemInfo";
import { fetchPretixConfiguration } from "../src/database/queries/pretix_config/fetchPretixConfiguration";
import {
  getAllOrganizers,
  insertPretixEventConfig,
  insertPretixOrganizerConfig
} from "../src/database/queries/pretix_config/insertConfiguration";
import { overrideEnvironment, pcdpassTestingEnv } from "./util/env";

describe.only("database reads and writes for devconnect ticket features", function () {
  this.timeout(15_000);

  let db: Pool;

  const testOrganizers = [
    {
      expectedInternalId: 1,
      token: uuid(),
      organizerUrl: "https://www.example.com/0xparc-organizer"
    },
    {
      expectedInternalId: 2,
      token: uuid(),
      organizerUrl: "https://www.example.com/thirdparty-organizer"
    }
  ];

  const testEvents = [
    {
      expectedInternalId: 1,
      expectedInternalInfoId: 1,
      organizerInternalId: 1,
      eventId: "progcrypto",
      eventName: "ProgCrypto"
    },
    {
      expectedInternalId: 2,
      expectedInternalInfoId: 2,
      organizerInternalId: 1,
      eventId: "aw",
      eventName: "AW"
    },
    {
      expectedInternalId: 3,
      expectedInternalInfoId: 3,
      organizerInternalId: 2,
      eventId: "third-party",
      eventName: "ThirdParty Event"
    }
  ];

  const testItems = [
    {
      id: "1",
      name: "ProgCrypto GA",
      isSuperUser: false,
      internalEventId: 1,
      expectedInternalItemId: 1
    },
    {
      id: "2",
      name: "ProgCrypto Guest",
      isSuperUser: false,
      internalEventId: 1,
      expectedInternalItemId: 2
    },
    {
      id: "3",
      name: "ProgCrypto Builder",
      isSuperUser: false,
      internalEventId: 1,
      expectedInternalItemId: 3
    },
    {
      id: "4",
      name: "ProgCrypto Organizer",
      isSuperUser: true,
      internalEventId: 1,
      expectedInternalItemId: 4
    },
    {
      id: "5",
      name: "ThirdParty Attendee",
      isSuperUser: false,
      internalEventId: 3,
      expectedInternalItemId: 5
    },
    {
      id: "6",
      name: "ThirdParty Super",
      isSuperUser: true,
      internalEventId: 3,
      expectedInternalItemId: 6
    }
  ];

  const testTickets = [
    {
      name: "UserFirst UserLast",
      email: "user-one@test.com",
      internalItemInfoId: 1
    },
    {
      name: "Super User1",
      email: "user-two@test.com",
      internalItemInfoId: 4
    },
    {
      name: "ThirdParty Attendee",
      email: "thirdparty-attendee@test.com",
      internalItemInfoId: 5
    },
    {
      name: "ThirdParty SuperUser",
      email: "thirdparty-attendee@test.com",
      internalItemInfoId: 6
    }
  ];

  this.beforeAll(async () => {
    await overrideEnvironment(pcdpassTestingEnv);
    db = await getDB();
  });

  this.afterAll(async () => {
    await db.end();
  });

  step("database should initialize", async function () {
    expect(db).to.not.eq(null);
  });

  step("should be able to insert organizers", async function () {
    for (const organizer of testOrganizers) {
      const id = await insertPretixOrganizerConfig(
        db,
        organizer.organizerUrl,
        organizer.token
      );
      expect(id).to.eq(organizer.expectedInternalId);
    }
    const allOrganizers = await getAllOrganizers(db);
    expect(allOrganizers.length).to.eq(testOrganizers.length);
  });

  step("should be able to insert corresponding events", async function () {
    for (const event of testEvents) {
      const eventId = await insertPretixEventConfig(
        db,
        event.organizerInternalId,
        testItems
          .filter((item) => item.internalEventId === event.expectedInternalId)
          .map((item) => item.id),
        testItems
          .filter((item) => item.internalEventId === event.expectedInternalId)
          .filter((item) => item.isSuperUser)
          .map((item) => item.id),
        event.eventId
      );
      expect(eventId).to.eq(event.expectedInternalId);
    }
  });

  step("should be able to get pretix configuration", async function () {
    const configs = await fetchPretixConfiguration(db);
    expect(configs.length).to.eq(testOrganizers.length);

    for (const organizer of testOrganizers) {
      const inDb = configs.find((c) => c.id === organizer.expectedInternalId);
      if (!inDb) {
        throw new Error("expected a corresponding config in the database");
      }
      expect(inDb.id).to.eq(organizer.expectedInternalId);
      expect(inDb.token).to.eq(organizer.token);
      expect(inDb.organizer_url).to.eq(organizer.organizerUrl);
      expect(inDb.events).to.deep.eq(
        testEvents
          .filter((e) => e.organizerInternalId === organizer.expectedInternalId)
          .map((e) => ({
            id: e.expectedInternalId,
            pretix_organizers_config_id: organizer.expectedInternalId,
            active_item_ids: testItems
              .filter((item) => item.internalEventId === e.expectedInternalId)
              .map((item) => item.id),
            event_id: e.eventId,
            superuser_item_ids: testItems
              .filter(
                (item) =>
                  item.internalEventId === e.expectedInternalId &&
                  item.isSuperUser
              )
              .map((item) => item.id)
          }))
      );
    }
  });

  step("should be able to insert pretix event information", async function () {
    for (const event of testEvents) {
      const eventsInfoId = await insertPretixEventsInfo(
        db,
        event.eventName,
        event.expectedInternalId
      );
      expect(eventsInfoId).to.eq(event.expectedInternalInfoId);
      const eventsInfoFromDb = await fetchPretixEventInfo(db, eventsInfoId);
      expect(eventsInfoFromDb?.event_name).to.eq(event.eventName);
      expect(eventsInfoFromDb?.pretix_events_config_id).to.eq(
        event.expectedInternalInfoId
      );
    }
  });

  step("should be able to insert pretix item information", async function () {
    for (const itemInfo of testItems) {
      const itemInfoId = await insertPretixItemsInfo(
        db,
        itemInfo.id,
        itemInfo.internalEventId,
        itemInfo.name
      );
      expect(itemInfoId).to.eq(itemInfo.expectedInternalItemId);
    }
  });

  step("should be able to add tickets", async function () {
    for (const ticket of testTickets) {
      const insertedTicket = await insertDevconnectPretixTicket(db, {
        devconnect_pretix_items_info_id: ticket.internalItemInfoId,
        email: ticket.email,
        full_name: ticket.name,
        is_deleted: false
      });
      expect(insertedTicket.devconnect_pretix_items_info_id).to.eq(
        ticket.internalItemInfoId
      );
      expect(insertedTicket.email).to.eq(ticket.email);
      expect(insertedTicket.full_name).to.eq(ticket.name);
      expect(insertedTicket.is_deleted).to.eq(false);
    }
  });

  step("should be able update a ticket", async function () {
    const existingTicket = await fetchDevconnectPretixTicketsByEmail(
      db,
      testTickets[0].email
    );

    const updatedTicket: DevconnectPretixTicket = {
      ...existingTicket[0],
      full_name: "New Fullname"
    };

    const loadedUpdatedTicket = await updateDevconnectPretixTicket(
      db,
      updatedTicket
    );

    const fetchedTickets = await fetchDevconnectPretixTicketsByEmail(
      db,
      updatedTicket.email
    );

    expect(fetchedTickets.length).to.eq(1);
    expect(updatedTicket.full_name).to.eq(fetchedTickets[0].full_name);
    expect(loadedUpdatedTicket.full_name).to.eq(fetchedTickets[0].full_name);
  });

  step("should be able to consume a ticket", async function () {
    const existingTicket = await fetchDevconnectPretixTicketsByEmail(
      db,
      testTickets[0].email
    );

    const fetchedTickets = await fetchDevconnectPretixTicketsByEmail(
      db,
      existingTicket[0].email
    );
    const firstTicket = fetchedTickets[0];
    expect(firstTicket.is_consumed).to.eq(false);

    await consumeDevconnectPretixTicket(db, firstTicket.id);

    const afterConsumptionTickets = await fetchDevconnectPretixTicketsByEmail(
      db,
      existingTicket[0].email
    );
    const firstTicketAfterConsumption = afterConsumptionTickets[0];
    expect(firstTicketAfterConsumption.is_consumed).to.eq(true);
  });

  step("fetching tickets by event should work", async function () {
    const fetchedTickets = await fetchDevconnectPretixTicketsByEvent(
      db,
      testEvents[0].expectedInternalId
    );

    expect(fetchedTickets.length).to.eq(2);
    const actualEmailSet = new Set(fetchedTickets.map((t) => t.email));
    const expectedEmailSet = new Set(
      [testTickets[0], testTickets[1]].map((t) => t.email)
    );

    expect(actualEmailSet).to.deep.eq(expectedEmailSet);
  });

  step("fetching all superusers should work", async function () {
    const dbSuperUsers = await fetchDevconnectSuperusers(db);
    const expectedSuperUsers = [testTickets[1], testTickets[3]];

    const dbEmailSet = new Set(dbSuperUsers.map((t) => t.email));
    const expectedEmailSet = new Set(expectedSuperUsers.map((t) => t.email));

    expect(dbEmailSet).to.deep.eq(expectedEmailSet);
  });

  step(
    "fetching superusers for a particular event should work",
    async function () {
      const progCryptoSuperUsers = await fetchDevconnectSuperusersForEvent(
        db,
        testEvents[0].expectedInternalId
      );
      expect(progCryptoSuperUsers.length).to.eq(1);
      expect(progCryptoSuperUsers[0].email).to.eq(testTickets[1].email);
    }
  );
});
