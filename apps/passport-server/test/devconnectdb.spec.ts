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
  fetchDevconnectSuperusersForEmail,
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

interface ITestOrganizer {
  dbId: string;
  token: string;
  organizerUrl: string;
}

interface ITestEvent {
  dbEventConfigId: string;
  dbEventInfoId: string;
  dbOrganizerId: string;
  eventId: string;
  eventName: string;
  _organizerIdx: number;
}

interface ITestItem {
  dbId: string;
  dbEventId: string;
  itemId: string;
  itemName: string;
  isSuperUser: boolean;
  _eventIdx: number;
}

describe.only("database reads and writes for devconnect ticket features", function () {
  this.timeout(15_000);

  let db: Pool;

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

  const testOrganizers: ITestOrganizer[] = [
    {
      dbId: "",
      token: uuid(),
      organizerUrl: "https://www.example.com/0xparc-organizer"
    },
    {
      dbId: "",
      token: uuid(),
      organizerUrl: "https://www.example.com/thirdparty-organizer"
    }
  ];

  const testEvents: ITestEvent[] = [
    {
      dbEventConfigId: "",
      dbEventInfoId: "",
      dbOrganizerId: "",
      eventId: "progcrypto",
      eventName: "ProgCrypto",
      _organizerIdx: 0
    },
    {
      dbEventConfigId: "",
      dbEventInfoId: "",
      dbOrganizerId: "",
      eventId: "aw",
      eventName: "AW",
      _organizerIdx: 0
    },
    {
      dbEventConfigId: "",
      dbEventInfoId: "",
      dbOrganizerId: "",
      eventId: "third-party",
      eventName: "ThirdParty Event",
      _organizerIdx: 1
    }
  ];

  const testItems: ITestItem[] = [
    {
      dbId: "",
      dbEventId: "",
      itemId: "pg-ga",
      itemName: "ProgCrypto GA",
      isSuperUser: false,
      _eventIdx: 0
    },
    {
      dbId: "",
      dbEventId: "",
      itemId: "pg-guest",
      itemName: "ProgCrypto Guest",
      isSuperUser: false,
      _eventIdx: 0
    },
    {
      dbId: "",
      dbEventId: "",
      itemId: "pg-builder",
      itemName: "ProgCrypto Builder",
      isSuperUser: false,
      _eventIdx: 0
    },
    {
      dbId: "",
      dbEventId: "",
      itemId: "pg-organizer",
      itemName: "ProgCrypto Organizer",
      isSuperUser: true,
      _eventIdx: 0
    },
    {
      dbId: "",
      dbEventId: "",
      itemId: "tp-attendee",
      itemName: "ThirdParty Attendee",
      isSuperUser: false,
      _eventIdx: 2
    },
    {
      dbId: "",
      dbEventId: "",
      itemId: "tp-super",
      itemName: "ThirdParty Super",
      isSuperUser: true,
      _eventIdx: 2
    }
  ];

  const testTickets: DevconnectPretixTicket[] = [
    {
      full_name: "UserFirst UserLast",
      email: "user-one@test.com",
      devconnect_pretix_items_info_id: "",
      is_consumed: false,
      is_deleted: false,
      position_id: "1000"
    },
    {
      full_name: "Super User1",
      email: "user-two@test.com",
      devconnect_pretix_items_info_id: "",
      is_consumed: false,
      is_deleted: false,
      position_id: "1001"
    },
    {
      full_name: "ThirdParty Attendee",
      email: "thirdparty-attendee@test.com",
      devconnect_pretix_items_info_id: "",
      is_consumed: false,
      is_deleted: false,
      position_id: "1002"
    },
    {
      full_name: "ThirdParty SuperUser",
      email: "thirdparty-attendee@test.com",
      devconnect_pretix_items_info_id: "",
      is_consumed: false,
      is_deleted: false,
      position_id: "1003"
    }
  ];

  step("should be able to insert organizers", async function () {
    for (const organizer of testOrganizers) {
      const id = await insertPretixOrganizerConfig(
        db,
        organizer.organizerUrl,
        organizer.token
      );
      organizer.dbId = id;
      expect(typeof id).to.eq("string");
    }
    const allOrganizers = await getAllOrganizers(db);
    expect(allOrganizers.length).to.eq(testOrganizers.length);
  });

  step(
    "should be able to insert corresponding event configs",
    async function () {
      for (let i = 0; i < testEvents.length; i++) {
        const event = testEvents[i];

        const eventConfigId = await insertPretixEventConfig(
          db,
          testOrganizers[event._organizerIdx].dbId,
          testItems
            .filter((item) => item._eventIdx === i)
            .map((item) => item.itemId),
          testItems
            .filter((item) => item._eventIdx === i)
            .filter((item) => item.isSuperUser)
            .map((item) => item.itemId),
          event.eventId
        );

        event.dbEventConfigId = eventConfigId;
        expect(typeof event.dbEventConfigId).to.eq("string");
      }
    }
  );

  step("should be able to insert pretix event information", async function () {
    for (let i = 0; i < testEvents.length; i++) {
      const event = testEvents[i];

      const dbEventInfoId = await insertPretixEventsInfo(
        db,
        event.eventName,
        event.dbEventConfigId
      );

      event.dbEventInfoId = dbEventInfoId;

      const eventInfoFromDb = await fetchPretixEventInfo(
        db,
        event.dbEventConfigId
      );
      expect(eventInfoFromDb?.event_name).to.eq(event.eventName);
      expect(eventInfoFromDb?.pretix_events_config_id).to.eq(
        event.dbEventConfigId
      );
      expect(eventInfoFromDb?.id).to.eq(dbEventInfoId);
    }
  });

  step("should be able to insert pretix item information", async function () {
    for (const itemInfo of testItems) {
      const event = testEvents[itemInfo._eventIdx];

      const itemInfoId = await insertPretixItemsInfo(
        db,
        itemInfo.itemId,
        event.dbEventInfoId,
        itemInfo.itemName
      );

      itemInfo.dbEventId = event.dbEventConfigId;
      itemInfo.dbId = itemInfoId;
    }
  });

  step("should be able to get pretix configuration", async function () {
    const configs = await fetchPretixConfiguration(db);
    expect(configs.length).to.eq(testOrganizers.length);

    for (const organizer of testOrganizers) {
      const inDb = configs.find((c) => c.id === organizer.dbId);
      if (!inDb) {
        throw new Error("expected a corresponding config in the database");
      }
      expect(inDb.id).to.eq(organizer.dbId);
      expect(inDb.token).to.eq(organizer.token);
      expect(inDb.organizer_url).to.eq(organizer.organizerUrl);
      expect(inDb.events).to.deep.eq(
        testEvents
          .filter((e) => e.dbOrganizerId === organizer.dbId)
          .map((e) => ({
            id: e.dbOrganizerId,
            pretix_organizers_config_id: organizer.dbId,
            active_item_ids: testItems
              .filter((item) => item.dbEventId === e.dbEventConfigId)
              .map((item) => item.itemId),
            event_id: e.eventId,
            superuser_item_ids: testItems
              .filter(
                (item) =>
                  item.dbEventId === e.dbEventConfigId && item.isSuperUser
              )
              .map((item) => item.itemId)
          }))
      );
    }
  });

  step("should be able to add tickets", async function () {
    for (const ticket of testTickets) {
      const insertedTicket = await insertDevconnectPretixTicket(db, ticket);
      expect(insertedTicket.devconnect_pretix_items_info_id).to.eq(
        ticket.devconnect_pretix_items_info_id
      );
      expect(insertedTicket.email).to.eq(ticket.email);
      expect(insertedTicket.full_name).to.eq(ticket.full_name);
      expect(insertedTicket.is_deleted).to.eq(false);
      expect(insertedTicket.is_consumed).to.eq(false);
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
      testEvents[0].dbEventConfigId
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
        testEvents[0].dbEventConfigId
      );
      expect(progCryptoSuperUsers.length).to.eq(1);
      expect(progCryptoSuperUsers[0].email).to.eq(testTickets[1].email);
    }
  );

  step(
    "fetching superusers for a particular email address should work",
    async function () {
      const superUsersForEmail = await fetchDevconnectSuperusersForEmail(
        db,
        testTickets[1].email
      );
      expect(superUsersForEmail.length).to.eq(1);
      expect(superUsersForEmail[0].email).to.eq(testTickets[1].email);
    }
  );
});
