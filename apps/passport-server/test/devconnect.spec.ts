import { expect } from "chai";
import "mocha";
import { Pool } from "pg";
import { getDevconnectPretixConfig } from "../src/apis/devconnectPretixAPI";
import { IEmailAPI } from "../src/apis/emailAPI";
import { stopApplication } from "../src/application";
import { getDB } from "../src/database/postgresPool";
import { fetchAllDevconnectPretixTickets } from "../src/database/queries/devconnect_pretix_tickets/fetchDevconnectPretixTicket";
import { sqlQuery } from "../src/database/sqlQuery";
import { DevconnectPretixSyncService } from "../src/services/devconnectPretixSyncService";
import { PretixSyncStatus } from "../src/services/types";
import { PCDPass } from "../src/types";
import {
  DevconnectPretixDataMocker,
  EMAIL_1,
  EMAIL_2,
  EMAIL_3,
  EMAIL_4,
  EVENT_A_ID,
  EVENT_B_ID,
  EVENT_C_ID,
  ITEM_1,
  ITEM_2,
} from "./pretix/devconnectPretixDataMocker";
import {
  getDevconnectMockPretixAPI,
  MOCK_PRETIX_API_CONFIG,
} from "./pretix/mockDevconnectPretixApi";
import { waitForDevconnectPretixSyncStatus } from "./pretix/waitForDevconnectPretixSyncStatus";
import { overrideEnvironment, pcdpassTestingEnv } from "./util/env";
import { startTestingApp } from "./util/startTestingApplication";

describe("devconnect configuration db tables", function () {
  let application: PCDPass;

  this.beforeAll(async () => {
    await overrideEnvironment(pcdpassTestingEnv);
    application = await startTestingApp();
  });

  this.afterAll(async () => {
    await stopApplication(application);
  });

  step("test organizer config", async function () {
    // Insert organizer 1
    await sqlQuery(
      application.context.dbPool,
      "insert into pretix_organizers_config (organizer_url, token) values ('organizer-url-1', 'token1')"
    );
    // Should fail on duplicate (organizer_url, token)
    try {
      await sqlQuery(
        application.context.dbPool,
        "insert into pretix_organizers_config (organizer_url, token) values ('organizer-url-1', 'token2') returning id"
      );
      expect.fail();
    } catch (e) {
      // Should end up here
    }
    // Insert organizer 2
    await sqlQuery(
      application.context.dbPool,
      "insert into pretix_organizers_config (organizer_url, token) values ('organizer-url-2', 'token2')"
    );
    expect(
      (
        await sqlQuery(
          application.context.dbPool,
          "select id from pretix_organizers_config"
        )
      ).rowCount
    ).to.equal(2);
  });

  step("test events config", async function () {
    // Insert organizer 1 and 2 from previous test
    // Insert event 1
    await sqlQuery(
      application.context.dbPool,
      "insert into pretix_events_config (pretix_organizers_config_id, event_id, active_item_ids) values (1, 'event-1', '{}')"
    );
    // Should fail on duplicate (event id, org id)
    try {
      await sqlQuery(
        application.context.dbPool,
        "insert into pretix_events_config (pretix_organizers_config_id, event_id, active_item_ids) values (1, 'event-1', '{}')"
      );
      expect.fail();
    } catch (e) {
      // Should end up here
    }
    // Insert it again with updated event-id
    await sqlQuery(
      application.context.dbPool,
      "insert into pretix_events_config (pretix_organizers_config_id, event_id, active_item_ids) values (3, 'event-2', '{}')"
    );

    // Insert with active item IDs
    await sqlQuery(
      application.context.dbPool,
      "insert into pretix_events_config (pretix_organizers_config_id, event_id, active_item_ids) values (1, 'event-3', '{123, 456}')"
    );
    expect(
      (
        await sqlQuery(
          application.context.dbPool,
          "select id from pretix_events_config"
        )
      ).rowCount
    ).to.equal(3);
  });
});

describe("devconnect functionality", function () {
  this.timeout(15_000);

  let application: PCDPass;
  let _emailAPI: IEmailAPI;
  let devconnectPretixMocker: DevconnectPretixDataMocker;
  let devconnectPretixSyncService: DevconnectPretixSyncService;
  let db: Pool;

  this.beforeAll(async () => {
    await overrideEnvironment(pcdpassTestingEnv);
    db = await getDB();

    await sqlQuery(
      db,
      `
    insert into pretix_organizers_config (organizer_url, token)
    values ('organizer-url', 'token')
    `
    );
    await sqlQuery(
      db,
      `
    insert into pretix_events_config (pretix_organizers_config_id, event_id, active_item_ids)
    values
      (1, $1, '{ ${ITEM_1} }'),
      (1, $2, '{ ${ITEM_1}, ${ITEM_2} }'),
      (1, $3, '{}')
    `,
      [EVENT_A_ID, EVENT_B_ID, EVENT_C_ID]
    );

    devconnectPretixMocker = new DevconnectPretixDataMocker();
    const devconnectPretixAPI = getDevconnectMockPretixAPI(
      devconnectPretixMocker.getMockData()
    );
    application = await startTestingApp({ devconnectPretixAPI });

    if (!application.services.devconnectPretixSyncService) {
      throw new Error("expected there to be a pretix sync service");
    }

    devconnectPretixSyncService =
      application.services.devconnectPretixSyncService;
  });

  this.afterAll(async () => {
    await stopApplication(application);
    await db.end();
  });

  step("mock pretix api config matches load from DB", async function () {
    const devconnectPretixAPIConfigFromDB = await getDevconnectPretixConfig(db);
    expect(devconnectPretixAPIConfigFromDB).to.deep.equal(
      MOCK_PRETIX_API_CONFIG
    );
  });

  step("email client should have been mocked", async function () {
    if (!application.apis.emailAPI) {
      throw new Error("email client should have been mocked");
    }
    _emailAPI = application.apis.emailAPI;
  });

  step("devconnect pretix status should sync to completion", async function () {
    const pretixSyncStatus = await waitForDevconnectPretixSyncStatus(
      application
    );
    expect(pretixSyncStatus).to.eq(PretixSyncStatus.Synced);
    // stop interval that polls the api so we have more granular control over
    // testing the sync functionality
    application.services.pretixSyncService?.stop();
  });

  step(
    "after devconnect pretix sync, database should reflect devconnect pretix API",
    async function () {
      const tickets = await fetchAllDevconnectPretixTickets(
        application.context.dbPool
      );

      // From our config, we have 3 separate events.
      // Event A has Item 1 as an active item and 4 unique emails that use Item 1.
      // Event B has Item 1 and 2 as active items; Item has 4 unique emails (just like event A),
      // while Item 2 has 3 unique emails (there is no ITEM_2, EMAIL_3 pair)
      // Event C has no tickets because it has no active items.
      expect(tickets).to.have.length(11);

      const ticketsWithEmailEventAndItems = tickets.map((o) => ({
        email: o.email,
        itemInfoID: o.devconnect_pretix_items_info_id,
      }));

      expect(ticketsWithEmailEventAndItems).to.have.deep.members([
        // Four tickets for event A because four unique emails
        {
          email: EMAIL_1,
          itemInfoID: 1, // Represents EVENT_A, ITEM_1
        },
        {
          email: EMAIL_2,
          itemInfoID: 1,
        },
        {
          email: EMAIL_3,
          itemInfoID: 1,
        },
        {
          email: EMAIL_4,
          itemInfoID: 1,
        },
        {
          email: EMAIL_1,
          itemInfoID: 2, // Represents EVENT_B, ITEM_1
        },
        {
          email: EMAIL_2,
          itemInfoID: 2,
        },
        {
          email: EMAIL_3,
          itemInfoID: 2,
        },
        {
          email: EMAIL_4,
          itemInfoID: 2,
        },
        {
          email: EMAIL_1,
          itemInfoID: 3, // Represents EVENT_A, ITEM_2
        },
        {
          email: EMAIL_2,
          itemInfoID: 3,
        },
        {
          email: EMAIL_4,
          itemInfoID: 3,
        },
      ]);
    }
  );

  step("removing an order causes soft deletion of ticket", async function () {
    // Simulate removing order - in this instance, we remove an order from
    // EVENT_A1 with EMAIL_1 as the purchaser that contains the only positions
    // that have EMAIL_2 and EMAIL_3 for ITEM_1. Removing this order, then,
    // would cause (EMAIL_2, ITEM_1) and (EMAIL_3, ITEM_1) to be soft deleted
    // in EVENT_A.
    const ordersForEventA = devconnectPretixMocker
      .getMockData()
      .ordersByEventId.get(EVENT_A_ID)!;
    const orderWithEmail2And3 = ordersForEventA.find(
      (o) => o.email === EMAIL_1
    )!;
    devconnectPretixMocker.removeOrder(EVENT_A_ID, orderWithEmail2And3.code);
    devconnectPretixSyncService.replaceApi(
      getDevconnectMockPretixAPI(devconnectPretixMocker.getMockData())
    );

    await devconnectPretixSyncService.trySync();

    const tickets = await fetchAllDevconnectPretixTickets(
      application.context.dbPool
    );

    // Because two tickets are removed - see comment above
    expect(tickets).to.have.length(9);

    const ticketsWithEmailEventAndItems = tickets.map((o) => ({
      email: o.email,
      itemInfoID: o.devconnect_pretix_items_info_id,
    }));

    expect(ticketsWithEmailEventAndItems).to.have.deep.members([
      // Four tickets for event A because four unique emails
      {
        email: EMAIL_1,
        itemInfoID: 1, // Represents EVENT_A, ITEM_1
      },
      // This is formerly where (EMAIL_2, ITEM_1) and (EMAIL_3, ITEM_1) were for EVENT_A
      {
        email: EMAIL_4,
        itemInfoID: 1,
      },
      {
        email: EMAIL_1,
        itemInfoID: 2, // Represents EVENT_B, ITEM_1
      },
      {
        email: EMAIL_2,
        itemInfoID: 2,
      },
      {
        email: EMAIL_3,
        itemInfoID: 2,
      },
      {
        email: EMAIL_4,
        itemInfoID: 2,
      },
      {
        email: EMAIL_1,
        itemInfoID: 3, // Represents EVENT_A, ITEM_2
      },
      {
        email: EMAIL_2,
        itemInfoID: 3,
      },
      {
        email: EMAIL_4,
        itemInfoID: 3,
      },
    ]);
  });
});
