import { expect } from "chai";
import "mocha";
import { step } from "mocha-steps";
import { Pool } from "pg";
import { v4 as uuid } from "uuid";
import { DevconnectPretixTicket } from "../src/database/models";
import { getDB } from "../src/database/postgresPool";
import {
  fetchDevconnectPretixTicketsByEmail,
  fetchDevconnectPretixTicketsByEvent
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
import { randomEmail } from "./util/util";

describe.only("database reads and writes", function () {
  this.timeout(15_000);

  let db: Pool;

  const testOrganizers = [
    {
      expectedInternalId: 1,
      token: uuid(),
      organizerUrl: "https://www.example.com/test"
    }
  ];

  const testEvents = [
    {
      expectedInternalId: 1,
      expectedInternalInfoId: 1,
      organizerInternalId: 1,
      eventId: "0xp-event",
      eventName: "ProgCrypto"
    }
  ];

  const testItems = [
    {
      id: "1",
      name: "Item One",
      isSuperUser: false,
      internalEventId: 1,
      expectedInternalItemId: 1
    },
    {
      id: "2",
      name: "Item Two",
      isSuperUser: false,
      internalEventId: 1,
      expectedInternalItemId: 2
    },
    {
      id: "3",
      name: "Item Three",
      isSuperUser: false,
      internalEventId: 1,
      expectedInternalItemId: 3
    },
    {
      id: "4",
      name: "Superuser Item",
      isSuperUser: true,
      internalEventId: 1,
      expectedInternalItemId: 4
    }
  ];

  const testTickets = [
    { name: "UserFirst UserLast", email: randomEmail(), internalItemId: "1" }
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

  const newTicket = {
    devconnect_pretix_items_info_id: 1,
    email: randomEmail(),
    full_name: "First Last",
    is_deleted: false
  };

  step("should be able to add a ticket", async function () {
    const insertedTicket = await insertDevconnectPretixTicket(db, newTicket);
    expect(insertedTicket.devconnect_pretix_items_info_id).to.eq(1);
    expect(insertedTicket.email).to.eq(newTicket.email);
    expect(insertedTicket.full_name).to.eq(newTicket.full_name);
    expect(insertedTicket.is_deleted).to.eq(false);
  });

  step("should be able update a ticket", async function () {
    const updatedTicket: DevconnectPretixTicket = {
      ...newTicket,
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
    const fetchedTickets = await fetchDevconnectPretixTicketsByEmail(
      db,
      newTicket.email
    );
    const firstTicket = fetchedTickets[0];
    expect(firstTicket.is_consumed).to.eq(false);

    await consumeDevconnectPretixTicket(db, firstTicket.id);

    const afterConsumptionTickets = await fetchDevconnectPretixTicketsByEmail(
      db,
      newTicket.email
    );
    const firstTicketAfterConsumption = afterConsumptionTickets[0];
    expect(firstTicketAfterConsumption.is_consumed).to.eq(true);
  });

  step("fetching tickets by event should work", async function () {
    const fetchedTickets = await fetchDevconnectPretixTicketsByEvent(
      db,
      testEvents[0].expectedInternalId
    );

    expect(fetchedTickets.length).to.eq(1);
    expect(fetchedTickets[0].email).to.eq(newTicket.email);
  });
});
