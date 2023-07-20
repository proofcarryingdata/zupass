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
import {
  fetchPretixItemsInfoByEvent,
  insertPretixItemsInfo
} from "../src/database/queries/pretixItemInfo";
import { fetchPretixConfiguration } from "../src/database/queries/pretix_config/fetchPretixConfiguration";
import {
  getAllOrganizers,
  insertPretixEventConfig,
  insertPretixOrganizerConfig
} from "../src/database/queries/pretix_config/insertConfiguration";
import { overrideEnvironment, pcdpassTestingEnv } from "./util/env";
import { randomEmail } from "./util/util";

describe("database reads and writes", function () {
  this.timeout(15_000);

  let db: Pool;

  const testOrganizerUrl = "https://www.example.com/test";
  const testToken = uuid();
  const testEventId = "test-id";
  const testEventName = "Test Event";
  const testItemInfos = [
    { id: "1", name: "Item One" },
    { id: "2", name: "Item Two" },
    { id: "3", name: "Item Three" }
  ];
  const expectedOrgId = 1;
  const expectedEventConfigId = 1;
  const expectedEventInfoId = 1;
  const ticketName = "UserFirst UserLast";
  const ticketEmail = randomEmail();

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

  step("should be able to insert a new organizer", async function () {
    const id = await insertPretixOrganizerConfig(
      db,
      testOrganizerUrl,
      testToken
    );
    expect(id).to.eq(expectedOrgId);
    const allOrganizers = await getAllOrganizers(db);
    expect(allOrganizers.length).to.eq(1);
  });

  step(
    "should be able to insert a new event for that organizer",
    async function () {
      const eventId = await insertPretixEventConfig(
        db,
        expectedOrgId,
        testItemInfos.map((item) => item.id),
        testEventId
      );
      expect(eventId).to.eq(expectedEventConfigId);
    }
  );

  step("should be able to get pretix configuration", async function () {
    const configs = await fetchPretixConfiguration(db);
    const firstConfig = configs[0];

    expect(configs.length).to.eq(1);
    expect(firstConfig.token).to.eq(testToken);
    expect(firstConfig.id).to.eq(1);
    expect(firstConfig.organizer_url).to.eq(testOrganizerUrl);
    expect(firstConfig.events).to.deep.eq([
      {
        id: 1,
        pretix_organizers_config_id: 1,
        active_item_ids: testItemInfos.map((item) => item.id),
        event_id: testEventId
      }
    ]);
  });

  step("should be able to insert pretix event information", async function () {
    const eventsInfoId = await insertPretixEventsInfo(
      db,
      testEventName,
      expectedEventConfigId
    );
    expect(eventsInfoId).to.eq(expectedEventInfoId);
    const eventsInfoFromDb = await fetchPretixEventInfo(db, eventsInfoId);
    expect(eventsInfoFromDb?.event_name).to.eq(testEventName);
    expect(eventsInfoFromDb?.pretix_events_config_id).to.eq(
      expectedEventConfigId
    );
  });

  step("should be able to insert pretix item information", async function () {
    let expectedId = 1;
    for (const itemInfo of testItemInfos) {
      const itemInfoId = await insertPretixItemsInfo(
        db,
        itemInfo.id,
        expectedEventInfoId,
        itemInfo.name
      );
      expect(itemInfoId).to.eq(expectedId++);
    }

    const dbItemInfos = await fetchPretixItemsInfoByEvent(
      db,
      expectedEventConfigId
    );
    expect(dbItemInfos.length).to.eq(testItemInfos.length);

    for (let i = 0; i < dbItemInfos.length; i++) {
      expect(dbItemInfos[i].item_id).to.eq(testItemInfos[i].id);
      expect(dbItemInfos[i].item_name).to.eq(testItemInfos[i].name);
    }
  });

  const newTicket = {
    devconnect_pretix_items_info_id: 1,
    email: ticketEmail,
    full_name: ticketName,
    is_deleted: false
  };

  step("should be able to add a ticket", async function () {
    const insertedTicket = await insertDevconnectPretixTicket(db, newTicket);
    expect(insertedTicket.devconnect_pretix_items_info_id).to.eq(1);
    expect(insertedTicket.email).to.eq(ticketEmail);
    expect(insertedTicket.full_name).to.eq(ticketName);
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
      ticketEmail
    );
    const firstTicket = fetchedTickets[0];
    expect(firstTicket.is_consumed).to.eq(false);

    await consumeDevconnectPretixTicket(db, firstTicket.id);

    const afterConsumptionTickets = await fetchDevconnectPretixTicketsByEmail(
      db,
      ticketEmail
    );
    const firstTicketAfterConsumption = afterConsumptionTickets[0];
    expect(firstTicketAfterConsumption.is_consumed).to.eq(true);
  });

  step("fetching tickets by event should work", async function () {
    const fetchedTickets = await fetchDevconnectPretixTicketsByEvent(
      db,
      expectedEventConfigId
    );

    expect(fetchedTickets.length).to.eq(1);
    expect(fetchedTickets[0].email).to.eq(ticketEmail);
  });
});
