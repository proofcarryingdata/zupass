import { expect } from "chai";
import "mocha";
import { step } from "mocha-steps";
import { Pool, PoolClient } from "postgres-pool";
import { v4 as uuid } from "uuid";
import {
  DevconnectPretixTicketDBWithEmailAndItem,
  DevconnectPretixTicketWithCheckin
} from "../src/database/models";
import { getDB } from "../src/database/postgresPool";
import {
  fetchDevconnectPretixTicketByTicketId,
  fetchDevconnectPretixTicketsByEmail,
  fetchDevconnectPretixTicketsByEvent,
  fetchDevconnectSuperusers,
  fetchDevconnectSuperusersForEmail,
  fetchDevconnectSuperusersForEvent,
  fetchDevconnectTicketsAwaitingSync
} from "../src/database/queries/devconnect_pretix_tickets/fetchDevconnectPretixTicket";
import { insertDevconnectPretixTicket } from "../src/database/queries/devconnect_pretix_tickets/insertDevconnectPretixTicket";
import { softDeleteDevconnectPretixTicket } from "../src/database/queries/devconnect_pretix_tickets/softDeleteDevconnectPretixTicket";
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
import { overrideEnvironment, testingEnv } from "./util/env";

export interface ITestOrganizer {
  dbId: string;
  token: string;
  organizerUrl: string;
  disabled: boolean;
}

export interface ITestEvent {
  dbEventConfigId: string;
  dbEventInfoId: string;
  dbOrganizerId: string;
  eventId: string;
  eventName: string;
  _organizerIdx: number;
}

interface ITestItem {
  dbId: string;
  dbEventInfoId: string;
  itemId: string;
  itemName: string;
  isSuperUser: boolean;
  _eventIdx: number;
}

interface ITestTicket extends DevconnectPretixTicketWithCheckin {
  _itemIdx: number;
}

const DEFAULT_CHECKIN_LIST_ID = "1";

describe("database reads and writes for devconnect ticket features", function () {
  let pool: Pool;
  let client: PoolClient;

  this.beforeAll(async () => {
    await overrideEnvironment(testingEnv);
    pool = await getDB();
    client = await pool.connect();
  });

  this.afterAll(async () => {
    await client.end();
    await pool.end();
  });

  step("database should initialize", async function () {
    expect(client).to.not.eq(null);
  });

  const testOrganizers: ITestOrganizer[] = [
    {
      dbId: "",
      token: uuid(),
      organizerUrl: "https://www.example.com/0xparc-organizer",
      disabled: false
    },
    {
      dbId: "",
      token: uuid(),
      organizerUrl: "https://www.example.com/thirdparty-organizer",
      disabled: false
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
      dbEventInfoId: "",
      itemId: "pg-ga",
      itemName: "ProgCrypto GA",
      isSuperUser: false,
      _eventIdx: 0
    },
    {
      dbId: "",
      dbEventInfoId: "",
      itemId: "pg-guest",
      itemName: "ProgCrypto Guest",
      isSuperUser: false,
      _eventIdx: 0
    },
    {
      dbId: "",
      dbEventInfoId: "",
      itemId: "pg-builder",
      itemName: "ProgCrypto Builder",
      isSuperUser: false,
      _eventIdx: 0
    },
    {
      dbId: "",
      dbEventInfoId: "",
      itemId: "pg-organizer",
      itemName: "ProgCrypto Organizer",
      isSuperUser: true,
      _eventIdx: 0
    },
    {
      dbId: "",
      dbEventInfoId: "",
      itemId: "tp-attendee",
      itemName: "ThirdParty Attendee",
      isSuperUser: false,
      _eventIdx: 2
    },
    {
      dbId: "",
      dbEventInfoId: "",
      itemId: "tp-super",
      itemName: "ThirdParty Super",
      isSuperUser: true,
      _eventIdx: 2
    }
  ];

  const testTickets: ITestTicket[] = [
    {
      full_name: "UserFirst UserLast",
      email: "user-one@test.com",
      devconnect_pretix_items_info_id: "",
      pretix_events_config_id: "",
      is_consumed: false,
      is_deleted: false,
      position_id: "1000",
      _itemIdx: 0,
      secret: "a1b2c3d4",
      checker: "",
      zupass_checkin_timestamp: null,
      pretix_checkin_timestamp: null
    },
    {
      full_name: "Super User1",
      email: "user-two@test.com",
      devconnect_pretix_items_info_id: "",
      pretix_events_config_id: "",
      is_consumed: false,
      is_deleted: false,
      position_id: "1001",
      _itemIdx: 3,
      secret: "qwertyuiop",
      checker: "",
      zupass_checkin_timestamp: null,
      pretix_checkin_timestamp: null
    },
    {
      full_name: "ThirdParty Attendee",
      email: "thirdparty-attendee@test.com",
      devconnect_pretix_items_info_id: "",
      pretix_events_config_id: "",
      is_consumed: false,
      is_deleted: false,
      position_id: "1002",
      _itemIdx: 4,
      secret: "0xdeadbeef",
      checker: "",
      zupass_checkin_timestamp: null,
      pretix_checkin_timestamp: null
    },
    {
      full_name: "ThirdParty SuperUser",
      email: "thirdparty-attendee@test.com",
      devconnect_pretix_items_info_id: "",
      pretix_events_config_id: "",
      is_consumed: false,
      is_deleted: false,
      position_id: "1003",
      _itemIdx: 5,
      secret: "asdfghjkl",
      checker: "",
      zupass_checkin_timestamp: null,
      pretix_checkin_timestamp: null
    }
  ];

  step("should be able to insert organizer configs", async function () {
    for (const organizer of testOrganizers) {
      const id = await insertPretixOrganizerConfig(
        client,
        organizer.organizerUrl,
        organizer.token,
        organizer.disabled
      );
      organizer.dbId = id;
      expect(typeof id).to.eq("string");
    }
    const allOrganizers = await getAllOrganizers(client);
    expect(allOrganizers.length).to.eq(testOrganizers.length);
  });

  step(
    "should be able to insert corresponding event_config",
    async function () {
      for (let i = 0; i < testEvents.length; i++) {
        const event = testEvents[i];
        const organizer = testOrganizers[event._organizerIdx];

        const items = testItems.filter((item) => item._eventIdx === i);
        const superItems = items.filter((item) => item.isSuperUser);

        const eventConfigId = await insertPretixEventConfig(
          client,
          organizer.dbId,
          items.map((item) => item.itemId),
          superItems.map((item) => item.itemId),
          event.eventId
        );

        event.dbEventConfigId = eventConfigId;
        event.dbOrganizerId = organizer.dbId;

        expect(typeof event.dbEventConfigId).to.eq("string");
      }
    }
  );

  step("should be able to insert pretix event_info", async function () {
    for (let i = 0; i < testEvents.length; i++) {
      const event = testEvents[i];

      const dbEventInfoId = await insertPretixEventsInfo(
        client,
        event.eventName,
        event.dbEventConfigId,
        DEFAULT_CHECKIN_LIST_ID
      );

      event.dbEventInfoId = dbEventInfoId;

      const eventInfoFromDb = await fetchPretixEventInfo(
        client,
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
        client,
        itemInfo.itemId,
        event.dbEventInfoId,
        itemInfo.itemName
      );

      itemInfo.dbEventInfoId = event.dbEventInfoId;
      itemInfo.dbId = itemInfoId;
    }
  });

  step("should be able to get pretix configuration", async function () {
    const configs = await fetchPretixConfiguration(client);
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
            id: e.dbEventConfigId,
            pretix_organizers_config_id: organizer.dbId,
            active_item_ids: testItems
              .filter((item) => item.dbEventInfoId === e.dbEventInfoId)
              .map((item) => item.itemId),
            event_id: e.eventId,
            superuser_item_ids: testItems
              .filter(
                (item) =>
                  item.dbEventInfoId === e.dbEventInfoId && item.isSuperUser
              )
              .map((item) => item.itemId)
          }))
      );
    }
  });

  step("should be able to add tickets", async function () {
    for (const ticket of testTickets) {
      const item = testItems[ticket._itemIdx];
      ticket.devconnect_pretix_items_info_id = item.dbId;
      ticket.pretix_events_config_id =
        testEvents[testItems[ticket._itemIdx]._eventIdx].dbEventConfigId;

      const insertedTicket = await insertDevconnectPretixTicket(client, ticket);
      expect(insertedTicket.devconnect_pretix_items_info_id).to.eq(
        ticket.devconnect_pretix_items_info_id
      );
      expect(insertedTicket.email).to.eq(ticket.email);
      expect(insertedTicket.full_name).to.eq(ticket.full_name);
      expect(insertedTicket.is_deleted).to.eq(false);
      expect(insertedTicket.is_consumed).to.eq(false);
      expect(insertedTicket.secret).to.eq(ticket.secret);
    }
  });

  step(
    "should be not be able to add multiple tickets with the same postion_id",
    async function () {
      const ticket = testTickets[0];
      const item = testItems[ticket._itemIdx];
      ticket.devconnect_pretix_items_info_id = item.dbId;

      const ticketsForEmail = await fetchDevconnectPretixTicketsByEmail(
        client,
        ticket.email
      );
      // This will perform an upsert
      await insertDevconnectPretixTicket(client, ticket);
      const ticketsForEmailAfterInsert =
        await fetchDevconnectPretixTicketsByEmail(client, ticket.email);

      expect(ticketsForEmail.length).to.eq(ticketsForEmailAfterInsert.length);
    }
  );

  step("should be able update a ticket", async function () {
    const existingTicket = await fetchDevconnectPretixTicketsByEmail(
      client,
      testTickets[0].email
    );

    const updatedTicket: DevconnectPretixTicketWithCheckin = {
      ...existingTicket[0],
      full_name: "New Fullname"
    };

    const loadedUpdatedTicket = await updateDevconnectPretixTicket(
      client,
      updatedTicket
    );

    const fetchedTickets = await fetchDevconnectPretixTicketsByEmail(
      client,
      updatedTicket.email
    );

    expect(fetchedTickets.length).to.eq(1);
    expect(updatedTicket.full_name).to.eq(fetchedTickets[0].full_name);
    expect(loadedUpdatedTicket.full_name).to.eq(fetchedTickets[0].full_name);
  });

  step("should be able to consume a ticket", async function () {
    const existingTicket = await fetchDevconnectPretixTicketsByEmail(
      client,
      testTickets[0].email
    );

    const fetchedTickets = await fetchDevconnectPretixTicketsByEmail(
      client,
      existingTicket[0].email
    );
    const firstTicket = fetchedTickets[0];
    expect(firstTicket.is_consumed).to.eq(false);

    await consumeDevconnectPretixTicket(
      client,
      firstTicket.id,
      "checker@example.com"
    );

    const afterConsumptionTickets = await fetchDevconnectPretixTicketsByEmail(
      client,
      existingTicket[0].email
    );
    const firstTicketAfterConsumption = afterConsumptionTickets[0];
    expect(firstTicketAfterConsumption.is_consumed).to.eq(true);
  });

  step(
    "should be able to fetch tickets awaiting push synchronization",
    async function () {
      // In the previous test, we consumed this ticket
      const existingTicket = await fetchDevconnectPretixTicketsByEmail(
        client,
        testTickets[0].email
      );

      const consumedTicket = await fetchDevconnectPretixTicketByTicketId(
        client,
        existingTicket[0].id
      );
      expect(consumedTicket?.is_consumed).to.eq(true);

      const ticketsAwaitingSync = await fetchDevconnectTicketsAwaitingSync(
        client,
        testOrganizers[0].organizerUrl
      );
      expect(ticketsAwaitingSync.length).to.eq(1);
      // ticketsAwaitingSync[0] also includes the checkin_list property,
      // so we check with deep.contain rather than deep.eq, which would
      // fail due to ticketsAwaitingSync[0] having one extra property.
      expect(ticketsAwaitingSync[0]).to.deep.contain(consumedTicket);
    }
  );

  step("should be able to soft-delete and restore a ticket", async function () {
    const existingTicket = await fetchDevconnectPretixTicketsByEmail(
      client,
      testTickets[0].email
    );

    const fetchedTickets = await fetchDevconnectPretixTicketsByEmail(
      client,
      existingTicket[0].email
    );

    const firstTicket = fetchedTickets[0];
    expect(firstTicket.is_deleted).to.eq(false);

    await softDeleteDevconnectPretixTicket(client, firstTicket);

    const afterDeletionTickets = await fetchDevconnectPretixTicketsByEmail(
      client,
      existingTicket[0].email
    );

    // We should no longer find the soft-deleted ticket
    expect(afterDeletionTickets).to.satisfy(
      (tickets: DevconnectPretixTicketDBWithEmailAndItem[]) => {
        return (
          tickets.filter(
            (ticket: DevconnectPretixTicketDBWithEmailAndItem) =>
              ticket.position_id === firstTicket.position_id
          ).length === 0
        );
      }
    );

    await insertDevconnectPretixTicket(client, firstTicket);

    const afterRestorationTickets = await fetchDevconnectPretixTicketsByEmail(
      client,
      existingTicket[0].email
    );

    // We should now be able to find it again
    expect(afterRestorationTickets).to.satisfy(
      (tickets: DevconnectPretixTicketDBWithEmailAndItem[]) => {
        return (
          tickets.filter(
            (ticket: DevconnectPretixTicketDBWithEmailAndItem) =>
              ticket.position_id === firstTicket.position_id
          ).length === 1
        );
      }
    );
  });

  step("fetching tickets by event should work", async function () {
    const fetchedTickets = await fetchDevconnectPretixTicketsByEvent(
      client,
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
    const dbSuperUsers = await fetchDevconnectSuperusers(client);
    const expectedSuperUsers = [testTickets[1], testTickets[3]];

    const dbEmailSet = new Set(dbSuperUsers.map((t) => t.email));
    const expectedEmailSet = new Set(expectedSuperUsers.map((t) => t.email));

    expect(dbEmailSet).to.deep.eq(expectedEmailSet);
  });

  step(
    "fetching superusers for a particular event should work",
    async function () {
      const progCryptoSuperUsers = await fetchDevconnectSuperusersForEvent(
        client,
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
        client,
        testTickets[1].email
      );
      expect(superUsersForEmail.length).to.eq(1);
      expect(superUsersForEmail[0].email).to.eq(testTickets[1].email);
    }
  );
});
