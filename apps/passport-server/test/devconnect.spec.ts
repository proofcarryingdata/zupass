import { EDdSAPublicKey, newEdDSAPrivateKey } from "@pcd/eddsa-pcd";
import {
  EdDSATicketPCD,
  EdDSATicketPCDPackage,
  ITicketData,
  TicketCategory
} from "@pcd/eddsa-ticket-pcd";
import {
  checkinTicket,
  ISSUANCE_STRING,
  PCDPassFeedIds,
  pollFeed,
  PollFeedResponseValue,
  requestServerEdDSAPublicKey,
  requestServerRSAPublicKey
} from "@pcd/passport-interface";
import {
  AppendToFolderAction,
  isReplaceInFolderAction,
  PCDActionType,
  ReplaceInFolderAction
} from "@pcd/pcd-collection";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import _ from "lodash";
import "mocha";
import { step } from "mocha-steps";
import { rest } from "msw";
import { SetupServer } from "msw/lib/node";
import NodeRSA from "node-rsa";
import { Pool } from "postgres-pool";
import { v4 as uuid } from "uuid";
import {
  DevconnectPretixAPI,
  DevconnectPretixOrder
} from "../src/apis/devconnect/devconnectPretixAPI";
import {
  DevconnectPretixConfig,
  getDevconnectPretixConfig
} from "../src/apis/devconnect/organizer";
import { IEmailAPI } from "../src/apis/emailAPI";
import { getZuzaluPretixConfig } from "../src/apis/zuzaluPretixAPI";
import { stopApplication } from "../src/application";
import {
  DevconnectPretixTicket,
  DevconnectPretixTicketWithCheckin
} from "../src/database/models";
import { getDB } from "../src/database/postgresPool";
import {
  fetchAllNonDeletedDevconnectPretixTickets,
  fetchDevconnectDeviceLoginTicket,
  fetchDevconnectPretixTicketByTicketId,
  fetchDevconnectPretixTicketsByEvent,
  fetchDevconnectTicketsAwaitingSync
} from "../src/database/queries/devconnect_pretix_tickets/fetchDevconnectPretixTicket";
import { consumeDevconnectPretixTicket } from "../src/database/queries/devconnect_pretix_tickets/updateDevconnectPretixTicket";
import { fetchPretixEventInfo } from "../src/database/queries/pretixEventInfo";
import { fetchPretixItemsInfoByEvent } from "../src/database/queries/pretixItemInfo";
import {
  insertPretixEventConfig,
  insertPretixOrganizerConfig
} from "../src/database/queries/pretix_config/insertConfiguration";
import {
  OrganizerSync,
  PRETIX_CHECKER,
  SyncFailureError
} from "../src/services/devconnect/organizerSync";
import { DevconnectPretixSyncService } from "../src/services/devconnectPretixSyncService";
import { PCDpass } from "../src/types";
import { sleep } from "../src/util/util";

import {
  DevconnectPretixDataMocker,
  IMockDevconnectPretixData,
  IOrganizer
} from "./pretix/devconnectPretixDataMocker";
import { expectIssuanceServiceToBeRunning } from "./pretix/issuance";
import { getDevconnectMockPretixAPIServer } from "./pretix/mockDevconnectPretixApi";
import { getMockPretixAPI } from "./pretix/mockPretixApi";
import {
  expectDevconnectPretixToHaveSynced,
  expectZuzaluPretixToHaveSynced
} from "./pretix/waitForPretixSyncStatus";
import { ZuzaluPretixDataMocker } from "./pretix/zuzaluPretixDataMocker";
import {
  expectCurrentSemaphoreToBe,
  testLatestHistoricSemaphoreGroups
} from "./semaphore/checkSemaphore";
import { testDeviceLogin, testFailedDeviceLogin } from "./user/testDeviceLogin";
import { testLoginPCDpass } from "./user/testLoginPCDPass";
import { testUserSync } from "./user/testUserSync";
import { overrideEnvironment, pcdpassTestingEnv } from "./util/env";
import { startTestingApp } from "./util/startTestingApplication";

// @todo: merge this with zupass.spec.ts, and delete this file, after completely deprecating pcdpass
describe("devconnect functionality", function () {
  this.timeout(30_000);

  let application: PCDpass;
  let mocker: DevconnectPretixDataMocker;
  let pretixMocker: ZuzaluPretixDataMocker;
  let devconnectPretixSyncService: DevconnectPretixSyncService;
  let db: Pool;
  let server: SetupServer;
  let backupData: IMockDevconnectPretixData;
  let emailAPI: IEmailAPI;

  let organizerConfigId: string;
  let eventAConfigId: string;
  let eventBConfigId: string;
  let eventCConfigId: string;

  this.beforeEach(async () => {
    backupData = mocker.backup();
  });

  this.afterEach(async () => {
    server.resetHandlers();
    mocker.restore(backupData);
  });

  this.beforeAll(async () => {
    await overrideEnvironment(pcdpassTestingEnv);
    db = await getDB();

    mocker = new DevconnectPretixDataMocker();

    organizerConfigId = await insertPretixOrganizerConfig(
      db,
      mocker.get().organizer1.orgUrl,
      mocker.get().organizer1.token
    );

    eventAConfigId = await insertPretixEventConfig(
      db,
      organizerConfigId,
      [
        mocker.get().organizer1.eventAItem1.id + "",
        mocker.get().organizer1.eventAItem2.id + ""
      ],
      [mocker.get().organizer1.eventAItem2.id + ""],
      mocker.get().organizer1.eventA.slug
    );

    eventBConfigId = await insertPretixEventConfig(
      db,
      organizerConfigId,
      [mocker.get().organizer1.eventBItem3.id + ""],
      [mocker.get().organizer1.eventBItem3.id + ""],
      mocker.get().organizer1.eventB.slug
    );

    eventCConfigId = await insertPretixEventConfig(
      db,
      organizerConfigId,
      [],
      [],
      mocker.get().organizer1.eventC.slug
    );

    const orgUrls = mocker.get().organizersByOrgUrl.keys();
    server = getDevconnectMockPretixAPIServer(orgUrls, mocker);
    server.listen({ onUnhandledRequest: "bypass" });

    const pretixConfig = getZuzaluPretixConfig();

    if (!pretixConfig) {
      throw new Error(
        "expected to be able to get a pretix config for zuzalu tests"
      );
    }

    pretixMocker = new ZuzaluPretixDataMocker(pretixConfig);
    const pretixAPI = getMockPretixAPI(pretixMocker.getMockData());

    application = await startTestingApp({
      devconnectPretixAPIFactory: async () =>
        new DevconnectPretixAPI({ requestsPerInterval: 10_000 }),
      zuzaluPretixAPI: pretixAPI
    });

    if (!application.services.devconnectPretixSyncService) {
      throw new Error("expected there to be a pretix sync service");
    }

    devconnectPretixSyncService =
      application.services.devconnectPretixSyncService;
  });

  this.afterAll(async () => {
    await stopApplication(application);
    await db.end();
    server.close();
  });

  step("mock pretix api config matches load from DB", async function () {
    const devconnectPretixAPIConfigFromDB = await getDevconnectPretixConfig(db);
    expect(devconnectPretixAPIConfigFromDB).to.deep.equal({
      organizers: [
        {
          id: organizerConfigId,
          orgURL: mocker.get().organizer1.orgUrl,
          token: mocker.get().organizer1.token,
          events: [
            {
              id: eventAConfigId,
              eventID: "event-a",
              superuserItemIds: ["10002"],
              activeItemIDs: ["10001", "10002"]
            },
            {
              id: eventBConfigId,
              eventID: "event-b",
              activeItemIDs: ["10003"],
              superuserItemIds: ["10003"]
            },
            {
              id: eventCConfigId,
              eventID: "event-c",
              activeItemIDs: [],
              superuserItemIds: []
            }
          ]
        }
      ]
    } satisfies DevconnectPretixConfig);
  });

  step("email client should have been mocked", async function () {
    if (!application.apis.emailAPI) {
      throw new Error("email client should have been mocked");
    }

    emailAPI = application.apis.emailAPI;
    expect(emailAPI.send).to.be.spy;
  });

  step("zuzalu pretix should sync to completion", async function () {
    await expectZuzaluPretixToHaveSynced(application);
  });

  step("devconnect pretix status should sync to completion", async function () {
    await expectDevconnectPretixToHaveSynced(application);
  });

  step(
    "after devconnect pretix sync, database should reflect devconnect pretix API",
    async function () {
      const tickets = await fetchAllNonDeletedDevconnectPretixTickets(
        application.context.dbPool
      );

      expect(tickets).to.have.length(14);

      const ticketsWithEmailEventAndItems = tickets.map((o) => ({
        email: o.email,
        itemInfoID: o.devconnect_pretix_items_info_id
      }));

      // Get item info IDs for event A
      const eventAItemInfo = await fetchPretixEventInfo(db, eventAConfigId);
      if (!eventAItemInfo) {
        throw new Error("expected to be able to fetch corresponding item info");
      }
      const [{ id: item1EventAInfoID }, { id: item2EventAInfoID }] =
        await fetchPretixItemsInfoByEvent(db, eventAItemInfo.id);

      // Get item info IDs for event B
      const eventBItemInfo = await fetchPretixEventInfo(db, eventBConfigId);
      if (!eventBItemInfo) {
        throw new Error("expected to be able to fetch corresponding item info");
      }

      expect(ticketsWithEmailEventAndItems).to.have.deep.members([
        {
          email: mocker.get().organizer1.EMAIL_4,
          itemInfoID: item1EventAInfoID
        },
        {
          email: mocker.get().organizer1.EMAIL_1,
          itemInfoID: item1EventAInfoID
        },
        {
          email: mocker.get().organizer1.EMAIL_2,
          itemInfoID: item1EventAInfoID
        },
        {
          email: mocker.get().organizer1.EMAIL_2,
          itemInfoID: item1EventAInfoID
        },
        {
          email: mocker.get().organizer1.EMAIL_3,
          itemInfoID: item1EventAInfoID
        },
        {
          email: mocker.get().organizer1.EMAIL_1,
          itemInfoID: item1EventAInfoID
        },
        {
          email: mocker.get().organizer1.EMAIL_1,
          itemInfoID: item2EventAInfoID
        },
        {
          email: mocker.get().organizer1.EMAIL_1,
          itemInfoID: item2EventAInfoID
        },
        {
          email: mocker.get().organizer1.EMAIL_2,
          itemInfoID: item2EventAInfoID
        },
        {
          email: mocker.get().organizer1.EMAIL_1,
          itemInfoID: item2EventAInfoID
        },
        {
          email: mocker.get().organizer1.EMAIL_4,
          itemInfoID: item2EventAInfoID
        },
        {
          email: mocker.get().organizer1.EMAIL_4,
          itemInfoID: item2EventAInfoID
        },
        {
          email: mocker.get().organizer1.EMAIL_2,
          itemInfoID: item2EventAInfoID
        },
        {
          email: mocker.get().organizer1.EMAIL_1,
          itemInfoID: item1EventAInfoID
        }
      ]);
    }
  );

  step(
    "updating a position's email address causes the ticket to change ownership",
    async function () {
      const order = mocker
        .get()
        .organizer1.ordersByEventID.get(mocker.get().organizer1.eventA.slug);
      const orderCode = order ? order[0].code : undefined;

      if (!orderCode) {
        throw new Error("expected to be able to find order");
      }

      const updatedEmail = "abcdefg.com";
      let oldEmail: string | null = "";

      mocker.updateOrder(
        mocker.get().organizer1.orgUrl,
        mocker.get().organizer1.eventA.slug,
        orderCode,
        (order) => {
          oldEmail = order.positions[0].attendee_email;
          order.positions[0].attendee_email = updatedEmail;
        }
      );

      await devconnectPretixSyncService.trySync();

      const tickets = await fetchAllNonDeletedDevconnectPretixTickets(
        application.context.dbPool
      );

      expect(tickets).to.have.length(14);

      const ticketsWithEmailEventAndItems = tickets.map((o) => ({
        email: o.email,
        itemInfoID: o.devconnect_pretix_items_info_id
      }));

      // Get item info IDs for event A
      const eventAItemInfo = await fetchPretixEventInfo(db, eventAConfigId);
      if (!eventAItemInfo) {
        throw new Error("expected to be able to fetch corresponding item info");
      }
      const [{ id: item1EventAInfoID }, { id: item2EventAInfoID }] =
        await fetchPretixItemsInfoByEvent(db, eventAItemInfo.id);

      // Get item info IDs for event B
      const eventBItemInfo = await fetchPretixEventInfo(db, eventBConfigId);
      if (!eventBItemInfo) {
        throw new Error("expected to be able to fetch corresponding item info");
      }

      expect(ticketsWithEmailEventAndItems).to.have.deep.members([
        {
          email: updatedEmail,
          itemInfoID: item1EventAInfoID
        },
        {
          email: mocker.get().organizer1.EMAIL_1,
          itemInfoID: item1EventAInfoID
        },
        {
          email: mocker.get().organizer1.EMAIL_2,
          itemInfoID: item1EventAInfoID
        },
        {
          email: mocker.get().organizer1.EMAIL_2,
          itemInfoID: item1EventAInfoID
        },
        {
          email: mocker.get().organizer1.EMAIL_3,
          itemInfoID: item1EventAInfoID
        },
        {
          email: mocker.get().organizer1.EMAIL_1,
          itemInfoID: item1EventAInfoID
        },
        {
          email: mocker.get().organizer1.EMAIL_1,
          itemInfoID: item2EventAInfoID
        },
        {
          email: mocker.get().organizer1.EMAIL_1,
          itemInfoID: item2EventAInfoID
        },
        {
          email: mocker.get().organizer1.EMAIL_2,
          itemInfoID: item2EventAInfoID
        },
        {
          email: mocker.get().organizer1.EMAIL_1,
          itemInfoID: item2EventAInfoID
        },
        {
          email: mocker.get().organizer1.EMAIL_4,
          itemInfoID: item2EventAInfoID
        },
        {
          email: mocker.get().organizer1.EMAIL_4,
          itemInfoID: item2EventAInfoID
        },
        {
          email: mocker.get().organizer1.EMAIL_2,
          itemInfoID: item2EventAInfoID
        },
        {
          email: mocker.get().organizer1.EMAIL_1,
          itemInfoID: item1EventAInfoID
        }
      ]);

      // restore the email of that position back to what it was prior to this test case
      mocker.updateOrder(
        mocker.get().organizer1.orgUrl,
        mocker.get().organizer1.eventA.slug,
        orderCode,
        (order) => {
          order.positions[0].attendee_email = oldEmail;
        }
      );
    }
  );

  step("removing an order causes soft deletion of ticket", async function () {
    const ordersForEventA =
      mocker
        .get()
        .organizer1.ordersByEventID.get(mocker.get().organizer1.eventA.slug) ??
      [];

    const lastOrder = ordersForEventA.find(
      (o) => o.email === mocker.get().organizer1.EMAIL_2
    ) as DevconnectPretixOrder;

    mocker.removeOrder(
      mocker.get().organizer1.orgUrl,
      mocker.get().organizer1.eventA.slug,
      lastOrder.code
    );

    await devconnectPretixSyncService.trySync();

    const tickets = await fetchAllNonDeletedDevconnectPretixTickets(
      application.context.dbPool
    );

    // Because two tickets are removed - see comment above
    expect(tickets).to.have.length(11);

    const ticketsWithEmailEventAndItems = tickets.map((o) => ({
      email: o.email,
      itemInfoID: o.devconnect_pretix_items_info_id
    }));

    // Get item info IDs for event A
    const eventAItemInfo = await fetchPretixEventInfo(db, eventAConfigId);
    if (!eventAItemInfo) {
      throw new Error("expected to be able to fetch corresponding item info");
    }
    const [{ id: item1EventAInfoID }, { id: item2EventAInfoID }] =
      await fetchPretixItemsInfoByEvent(db, eventAItemInfo.id);

    expect(ticketsWithEmailEventAndItems).to.have.deep.members([
      {
        email: mocker.get().organizer1.EMAIL_4,
        itemInfoID: item1EventAInfoID
      },
      {
        email: mocker.get().organizer1.EMAIL_1,
        itemInfoID: item1EventAInfoID
      },
      {
        email: mocker.get().organizer1.EMAIL_2,
        itemInfoID: item1EventAInfoID
      },
      {
        email: mocker.get().organizer1.EMAIL_2,
        itemInfoID: item1EventAInfoID
      },
      {
        email: mocker.get().organizer1.EMAIL_3,
        itemInfoID: item1EventAInfoID
      },
      {
        email: mocker.get().organizer1.EMAIL_1,
        itemInfoID: item1EventAInfoID
      },
      {
        email: mocker.get().organizer1.EMAIL_1,
        itemInfoID: item2EventAInfoID
      },
      {
        email: mocker.get().organizer1.EMAIL_1,
        itemInfoID: item2EventAInfoID
      },
      {
        email: mocker.get().organizer1.EMAIL_2,
        itemInfoID: item2EventAInfoID
      },
      {
        email: mocker.get().organizer1.EMAIL_1,
        itemInfoID: item2EventAInfoID
      },
      {
        email: mocker.get().organizer1.EMAIL_4,
        itemInfoID: item2EventAInfoID
      }
    ]);
  });

  /**
   * This test shows the case where a ticket has been checked in with
   * Pretix, but not in PCDpass. The ticket will be marked as consumed
   * on the basis of data received from Pretix.
   */
  step("should be able to sync a checked-in ticket", async function () {
    const devconnectPretixAPIConfigFromDB = await getDevconnectPretixConfig(db);
    if (!devconnectPretixAPIConfigFromDB) {
      throw new Error("Could not load API configuration");
    }

    const organizer = devconnectPretixAPIConfigFromDB?.organizers[0];
    const orgUrl = organizer.orgURL;

    // Pick an event where we will consume all of the tickets
    const eventID = organizer.events[0].eventID;
    const eventConfigID = organizer.events[0].id;
    const org = mocker.get().organizersByOrgUrl.get(orgUrl) as IOrganizer;

    const checkInDate = new Date();

    // Simulate Pretix returning tickets as being checked in
    server.use(
      rest.get(orgUrl + `/events/:event/orders`, (req, res, ctx) => {
        const returnUnmodified = (req.params.event as string) !== eventID;
        const originalOrders = org.ordersByEventID.get(
          eventID
        ) as DevconnectPretixOrder[];
        const orders: DevconnectPretixOrder[] = returnUnmodified
          ? originalOrders
          : originalOrders.map((order) => {
              return {
                ...order,
                positions: order.positions.map((position) => {
                  return {
                    ...position,
                    checkins: [
                      { type: "entry", datetime: checkInDate.toISOString() }
                    ]
                  };
                })
              };
            });

        return res(
          ctx.json({
            results: orders,
            next: null
          })
        );
      })
    );

    // Set up a sync manager for a single organizer
    const os = new OrganizerSync(
      organizer,
      new DevconnectPretixAPI({ requestsPerInterval: 300 }),
      application.context.dbPool
    );

    expect(await os.run()).to.not.throw;

    const tickets = await fetchDevconnectPretixTicketsByEvent(
      db,
      eventConfigID
    );

    // All tickets for the event should be consumed
    expect(tickets.length).to.eq(
      tickets.filter(
        (ticket: DevconnectPretixTicketWithCheckin) =>
          ticket.is_consumed === true &&
          ticket.checker === PRETIX_CHECKER &&
          ticket.pretix_checkin_timestamp?.getTime() === checkInDate.getTime()
      ).length
    );
  });

  /**
   * This covers the case where we have a ticket marked as consumed, but
   * the check-in is cancelled in Pretix.
   */
  step("should be able to un-check-in a ticket via sync", async function () {
    const devconnectPretixAPIConfigFromDB = await getDevconnectPretixConfig(db);
    if (!devconnectPretixAPIConfigFromDB) {
      throw new Error("Could not load API configuration");
    }

    const organizer = devconnectPretixAPIConfigFromDB?.organizers[0];

    const eventConfigID = organizer.events[0].id;

    // Set up a sync manager for a single organizer
    const os = new OrganizerSync(
      organizer,
      new DevconnectPretixAPI({ requestsPerInterval: 300 }),
      application.context.dbPool
    );

    // Because we're not patching the data from Pretix, default responses
    // have no check-ins.
    // Syncing should reset our checked-in tickets to be un-checked-in.

    expect(await os.run()).to.not.throw;

    // In the previous test, we checked these tickets in
    const tickets = await fetchDevconnectPretixTicketsByEvent(
      db,
      eventConfigID
    );

    // But now they are *not* consumed
    expect(tickets.length).to.eq(
      tickets.filter(
        (ticket: DevconnectPretixTicket) => ticket.is_consumed === false
      ).length
    );
  });

  /**
   * This shows end-to-end sync for a ticket that gets consumed in
   * PCDpass.
   */
  step(
    "should be able to check in a ticket and sync to Pretix",
    async function () {
      const devconnectPretixAPIConfigFromDB =
        await getDevconnectPretixConfig(db);
      if (!devconnectPretixAPIConfigFromDB) {
        throw new Error("Could not load API configuration");
      }

      const organizer = devconnectPretixAPIConfigFromDB?.organizers[0];
      const eventConfigID = organizer.events[0].id;

      const ticketsAwaitingSyncBeforeCheckin =
        await fetchDevconnectTicketsAwaitingSync(db, organizer.orgURL);

      // There are no tickets awaiting sync
      expect(ticketsAwaitingSyncBeforeCheckin.length).to.eq(0);

      // Grab a ticket and consume it
      const tickets = await fetchDevconnectPretixTicketsByEvent(
        db,
        eventConfigID
      );
      const ticket = tickets[0];

      const checkerEmail = "test@example.com";
      const result = await consumeDevconnectPretixTicket(
        db,
        ticket.id,
        checkerEmail
      );

      expect(result).to.be.true;

      const consumedTicket = await fetchDevconnectPretixTicketByTicketId(
        db,
        ticket.id
      );

      // The same ticket should now be consumed
      expect(consumedTicket?.is_consumed).to.be.true;
      expect(consumedTicket?.pcdpass_checkin_timestamp).to.be.not.null;

      const ticketsAwaitingSync = await fetchDevconnectTicketsAwaitingSync(
        db,
        organizer.orgURL
      );

      // The consumed ticket is awaiting sync
      expect(ticketsAwaitingSync.length).to.eq(1);
      expect(ticketsAwaitingSync[0]).to.deep.include(consumedTicket);

      // Set up a sync manager for a single organizer
      const os = new OrganizerSync(
        organizer,
        new DevconnectPretixAPI({ requestsPerInterval: 300 }),
        application.context.dbPool
      );

      let receivedCheckIn = false;

      server.use(
        rest.post(
          organizer.orgURL + "/checkinrpc/redeem",
          async (req, res, ctx) => {
            const body = new Map(Object.entries(await req.json()));
            if (
              !body.has("secret") ||
              !body.has("lists") ||
              typeof body.get("secret") !== "string" ||
              !Array.isArray(body.get("lists"))
            ) {
              return res(ctx.status(400), ctx.json({}));
            }

            receivedCheckIn = true;
            return res(ctx.json({ status: "ok" }));
          }
        )
      );

      // Because we're not patching the data from Pretix, tickets will now
      // have no check-ins
      expect(await os.run()).to.not.throw;

      // The Pretix backend should have received a check-in request
      expect(receivedCheckIn).to.be.true;

      const consumedTicketAfterSync =
        await fetchDevconnectPretixTicketByTicketId(db, ticket.id);

      // Ticket should be marked as consumed
      expect(consumedTicketAfterSync?.is_consumed).to.be.true;
      // Ticket should be checked-in by correct email
      expect(consumedTicketAfterSync?.checker).to.eq(checkerEmail);
      // And ticket should have a pretix checkin timestamp!
      expect(consumedTicketAfterSync?.pretix_checkin_timestamp).to.be.not.null;
      // Expect Pretix checkin timestamp to match PCDpass checkin timestamp
      // Note that this is the value we pushed to Pretix, and we have not yet
      // fetched Pretix's representation of this check-in. In the API docs
      // it is indicated that Pretix will use the timestamp provided.
      expect(
        consumedTicketAfterSync?.pretix_checkin_timestamp?.toISOString()
      ).to.eq(
        consumedTicketAfterSync?.pcdpass_checkin_timestamp?.toISOString()
      );
    }
  );

  /**
   * This test covers the case where an event is updated as part of a sync.
   * It's not very interesting, and mostly exists to contrast with the
   * subsequent test in which the same operation fails due to the event's
   * settings being invalid.
   */
  step(
    "should be able to sync an event with valid settings",
    async function () {
      const updatedNameInNewSync = "Will sync to this";
      const originalEvent = await fetchPretixEventInfo(db, eventAConfigId);

      mocker.updateEvent(
        mocker.get().organizer1.orgUrl,
        mocker.get().organizer1.eventA.slug,
        (event) => {
          event.name.en = updatedNameInNewSync;
        }
      );

      mocker.setEventSettings(
        mocker.get().organizer1.orgUrl,
        mocker.get().organizer1.eventA.slug,
        // These settings are valid
        { attendee_emails_asked: true, attendee_emails_required: true }
      );

      await devconnectPretixSyncService.trySync();

      const event = await fetchPretixEventInfo(db, eventAConfigId);

      expect(event?.event_name).to.eq(updatedNameInNewSync);
      expect(event?.event_name).to.not.eq(originalEvent?.event_name);
    }
  );

  /**
   * This is identical to the previous test, except for the use of invalid
   * event settings, which causes the sync to fail. The only observable
   * effect here is the absence of a change to the event in the DB.
   */
  step(
    "should not be able to sync an event with invalid settings",
    async function () {
      const updatedNameInNewSync = "Won't sync to this";
      const originalEvent = await fetchPretixEventInfo(db, eventAConfigId);

      mocker.updateEvent(
        mocker.get().organizer1.orgUrl,
        mocker.get().organizer1.eventA.slug,
        (event) => {
          event.name.en = updatedNameInNewSync;
        }
      );

      const oldSettings = mocker.getEventSettings(
        mocker.get().organizer1.orgUrl,
        mocker.get().organizer1.eventA.slug
      );

      mocker.setEventSettings(
        mocker.get().organizer1.orgUrl,
        mocker.get().organizer1.eventA.slug,
        // These settings are invalid, so our sync will fail
        { attendee_emails_asked: false, attendee_emails_required: false }
      );

      await devconnectPretixSyncService.trySync();

      const event = await fetchPretixEventInfo(db, eventAConfigId);

      // The event name does *not* match the one fetched during sync
      expect(event?.event_name).to.not.eq(updatedNameInNewSync);
      // Instead, the original name remains.
      expect(event?.event_name).to.eq(originalEvent?.event_name);

      // Since we introduced invalid data, we want to restore the valid
      // data in order to avoid interfering with future tests.
      mocker.setEventSettings(
        mocker.get().organizer1.orgUrl,
        mocker.get().organizer1.eventA.slug,
        oldSettings
      );
    }
  );

  step(
    "should be able to sync an item with valid item settings",
    async function () {
      const updatedNameInNewSync = "Will sync to this";
      const eventInfo = await fetchPretixEventInfo(db, eventBConfigId);
      if (!eventInfo) {
        throw new Error(`Could not fetch event info for ${eventBConfigId}`);
      }

      const originalItem = (
        await fetchPretixItemsInfoByEvent(db, eventInfo.id)
      )[0];

      mocker.updateItem(
        mocker.get().organizer1.orgUrl,
        mocker.get().organizer1.eventB.slug,
        mocker.get().organizer1.eventBItem3.id,
        (item) => {
          // This is valid
          //item.generate_tickets = null;
          item.name.en = updatedNameInNewSync;
        }
      );

      await devconnectPretixSyncService.trySync();
      const item = (await fetchPretixItemsInfoByEvent(db, eventInfo.id))[0];

      // The event name matches the one fetched during sync
      expect(item.item_name).to.eq(updatedNameInNewSync);
      // The original name no longer matches
      expect(item.item_name).to.not.eq(originalItem.item_name);
    }
  );

  step(
    "should not be able to sync an item with invalid item settings",
    async function () {
      const updatedNameInNewSync = "Won't sync to this";
      const eventInfo = await fetchPretixEventInfo(db, eventBConfigId);
      if (!eventInfo) {
        throw new Error(`Could not fetch event info for ${eventBConfigId}`);
      }

      const originalItem = (
        await fetchPretixItemsInfoByEvent(db, eventInfo.id)
      )[0];

      mocker.updateItem(
        mocker.get().organizer1.orgUrl,
        mocker.get().organizer1.eventB.slug,
        mocker.get().organizer1.eventBItem3.id,
        (item) => {
          // This is not valid
          item.generate_tickets = true;
          item.name.en = updatedNameInNewSync;
        }
      );

      await devconnectPretixSyncService.trySync();

      const item = (await fetchPretixItemsInfoByEvent(db, eventInfo.id))[0];

      // The event name does *not* match the one fetched during sync
      expect(item.item_name).to.not.eq(updatedNameInNewSync);
      // Instead, the original name remains.
      expect(item.item_name).to.eq(originalItem.item_name);

      mocker.updateItem(
        mocker.get().organizer1.orgUrl,
        mocker.get().organizer1.eventB.slug,
        mocker.get().organizer1.eventBItem3.id,
        (item) => {
          // Restore the item to a valid setting
          item.generate_tickets = false;
          item.name.en = updatedNameInNewSync;
        }
      );
    }
  );

  let identity: Identity;
  let publicKeyRSA: NodeRSA;
  let publicKeyEdDSA: EDdSAPublicKey;

  step(
    "anyone should be able to request the server's RSA public key",
    async function () {
      const publicKeyResponse = await requestServerRSAPublicKey(
        application.expressContext.localEndpoint
      );
      if (!publicKeyResponse.value) {
        throw new Error(
          "exected to be able to download the server's public key"
        );
      }
      publicKeyRSA = new NodeRSA(publicKeyResponse.value, "public");
      expect(publicKeyRSA.getKeySize()).to.eq(2048);
      expect(publicKeyRSA.isPublic(true)).to.eq(true);
      expect(publicKeyRSA.isPrivate()).to.eq(false); // just to be safe
    }
  );

  step(
    "anyone should be able to request the server's EdDSA public key",
    async function () {
      const publicKeyResult = await requestServerEdDSAPublicKey(
        application.expressContext.localEndpoint
      );

      expect(publicKeyResult.success).to.eq(true);
      expect(publicKeyResult.error).to.eq(undefined);
      if (!publicKeyResult.success) {
        throw new Error("expected to be able to get eddsa public key");
      }

      publicKeyEdDSA = publicKeyResult.value;
      const [xValue, yValue] = publicKeyEdDSA;
      // Check lengths - should be 32 bytes in hex
      expect(xValue.length).to.eq(64);
      expect(yValue.length).to.eq(64);
      // Just to be safe, check against a regex
      const regex32ByteHexString = /^[0-9A-Fa-f]{64}$/;
      expect(regex32ByteHexString.test(xValue)).to.eq(true);
      expect(regex32ByteHexString.test(yValue)).to.eq(true);
    }
  );

  step(
    "should not be able to login with invalid email address",
    async function () {
      expect(
        await testLoginPCDpass(application, "test", {
          force: false,
          expectUserAlreadyLoggedIn: false,
          expectEmailIncorrect: true
        })
      ).to.eq(undefined);
    }
  );

  step("should be able to log in", async function () {
    const result = await testLoginPCDpass(
      application,
      mocker.get().organizer1.EMAIL_1,
      {
        expectEmailIncorrect: false,
        expectUserAlreadyLoggedIn: false,
        force: false
      }
    );

    if (!result) {
      throw new Error("failed to log in");
    }

    expect(emailAPI.send).to.have.been.called.exactly(1);
    identity = result.identity;
  });

  step("semaphore service should reflect correct state", async function () {
    expectCurrentSemaphoreToBe(application, {
      p: [],
      r: [],
      v: [],
      o: [],
      g: [identity.commitment.toString()]
    });
    await testLatestHistoricSemaphoreGroups(application);
  });

  step(
    "should not be able to log in a 2nd time without force option",
    async function () {
      expect(
        await testLoginPCDpass(application, mocker.get().organizer1.EMAIL_1, {
          force: false,
          expectUserAlreadyLoggedIn: true,
          expectEmailIncorrect: false
        })
      ).to.eq(undefined);

      const result = await testLoginPCDpass(
        application,
        mocker.get().organizer1.EMAIL_1,
        {
          force: true,
          expectUserAlreadyLoggedIn: true,
          expectEmailIncorrect: false
        }
      );

      if (!result?.user) {
        throw new Error("exected a user");
      }

      identity = result.identity;

      expect(emailAPI.send).to.have.been.called.exactly(2);
    }
  );

  step(
    "semaphore service should now be aware of the new user" +
      " and their old commitment should have been removed",
    async function () {
      expectCurrentSemaphoreToBe(application, {
        p: [],
        r: [],
        v: [],
        o: [],
        g: [identity.commitment.toString()]
      });
      await testLatestHistoricSemaphoreGroups(application);
    }
  );

  step("user should be able to sync end to end encryption", async function () {
    await testUserSync(application);
  });

  step("should have issuance service running", async function () {
    await expectIssuanceServiceToBeRunning(application);
  });

  step(
    "user should be able to be issued some PCDs from the server",
    async function () {
      const response = await pollFeed(
        application.expressContext.localEndpoint,
        identity,
        ISSUANCE_STRING,
        PCDPassFeedIds.Devconnect
      );

      if (response.error) {
        throw new Error("expected to be able to get a feed response");
      }

      expect(response.value?.actions?.length).to.eq(3);
      const action = response.value?.actions?.[2] as ReplaceInFolderAction;

      expect(action.type).to.eq(PCDActionType.ReplaceInFolder);
      expect(action.folder).to.eq("Devconnect/Event A");

      expect(Array.isArray(action.pcds)).to.eq(true);
      expect(action.pcds.length).to.eq(6);

      const ticketPCD = action.pcds[0];

      expect(ticketPCD.type).to.eq(EdDSATicketPCDPackage.name);

      const deserializedTicketPCD = await EdDSATicketPCDPackage.deserialize(
        ticketPCD.pcd
      );

      const verified = await EdDSATicketPCDPackage.verify(
        deserializedTicketPCD
      );
      expect(verified).to.eq(true);
    }
  );

  step("issued pcds should have stable ids", async function () {
    const expressResponse1 = await pollFeed(
      application.expressContext.localEndpoint,
      identity,
      ISSUANCE_STRING,
      PCDPassFeedIds.Devconnect
    );
    const expressResponse2 = await pollFeed(
      application.expressContext.localEndpoint,
      identity,
      ISSUANCE_STRING,
      PCDPassFeedIds.Devconnect
    );
    const response1 = expressResponse1.value as PollFeedResponseValue;
    const response2 = expressResponse2.value as PollFeedResponseValue;
    const action1 = response1.actions[0] as AppendToFolderAction;
    const action2 = response2.actions[0] as AppendToFolderAction;

    const pcds1 = await Promise.all(
      action1.pcds.map((pcd) => EdDSATicketPCDPackage.deserialize(pcd.pcd))
    );
    const pcds2 = await Promise.all(
      action2.pcds.map((pcd) => EdDSATicketPCDPackage.deserialize(pcd.pcd))
    );

    expect(pcds1.length).to.eq(pcds2.length);

    pcds1.forEach((_, i) => {
      expect(pcds1[i].id).to.eq(pcds2[i].id);
    });
  });

  /**
   * This test updates an event, runs a pretix sync, then fetches the
   * affected PCD to see if the new event name is reflected there.
   */
  step(
    "user should see event updates reflected in their issued PCDs",
    async function () {
      const updatedName = "New name";

      mocker.updateEvent(
        mocker.get().organizer1.orgUrl,
        mocker.get().organizer1.eventA.slug,
        (event) => {
          event.name.en = updatedName;
        }
      );

      mocker.setEventSettings(
        mocker.get().organizer1.orgUrl,
        mocker.get().organizer1.eventA.slug,
        { attendee_emails_asked: true, attendee_emails_required: true }
      );

      await devconnectPretixSyncService.trySync();
      const response = await pollFeed(
        application.expressContext.localEndpoint,
        identity,
        ISSUANCE_STRING,
        PCDPassFeedIds.Devconnect
      );
      const responseBody = response.value as PollFeedResponseValue;
      expect(responseBody.actions.length).to.eq(3);

      const devconnectAction = responseBody.actions[2] as ReplaceInFolderAction;
      expect(isReplaceInFolderAction(devconnectAction)).to.be.true;
      expect(devconnectAction.folder).to.eq("Devconnect/New name");

      expect(Array.isArray(devconnectAction.pcds)).to.eq(true);
      const ticketPCD = devconnectAction.pcds[0];
      expect(ticketPCD.type).to.eq(EdDSATicketPCDPackage.name);

      const deserializedPCD = await EdDSATicketPCDPackage.deserialize(
        ticketPCD.pcd
      );

      const ticketData = deserializedPCD.claim.ticket;

      expect(ticketData.eventName).to.eq(updatedName);
    }
  );

  /**
   * This test updates a product, runs a pretix sync, then fetches the
   * affected PCD to see if the new product name is reflected there.
   */
  step(
    "user should see product updates reflected in their issued PCDs",
    async function () {
      const updatedName = "New product name";

      mocker.updateItem(
        mocker.get().organizer1.orgUrl,
        mocker.get().organizer1.eventA.slug,
        mocker.get().organizer1.eventAItem1.id,
        (item) => {
          item.name.en = updatedName;
        }
      );

      await devconnectPretixSyncService.trySync();

      const response = await pollFeed(
        application.expressContext.localEndpoint,
        identity,
        ISSUANCE_STRING,
        PCDPassFeedIds.Devconnect
      );
      const responseBody = response.value as PollFeedResponseValue;
      expect(responseBody.actions.length).to.eq(3);
      const devconnectAction = responseBody.actions[2] as ReplaceInFolderAction;
      expect(devconnectAction.folder).to.eq("Devconnect/Event A");

      expect(Array.isArray(devconnectAction.pcds)).to.eq(true);
      const ticketPCD = devconnectAction.pcds[0];
      expect(ticketPCD.type).to.eq(EdDSATicketPCDPackage.name);

      const deserializedPCD = await EdDSATicketPCDPackage.deserialize(
        ticketPCD.pcd
      );

      const ticketData = deserializedPCD.claim.ticket;

      // "Ticket name" is equivalent to item/product name
      expect(ticketData.ticketName).to.eq(updatedName);
    }
  );

  let checkerIdentity: Identity;
  step("event 'superuser' should be able to log in", async function () {
    const result = await testLoginPCDpass(
      application,
      mocker.get().organizer1.EMAIL_2,
      {
        expectEmailIncorrect: false,
        expectUserAlreadyLoggedIn: false,
        force: false
      }
    );

    if (!result) {
      throw new Error("failed to log in");
    }

    checkerIdentity = result.identity;
  });

  let ticket: EdDSATicketPCD;
  step(
    "event 'superuser' should be able to checkin a valid ticket",
    async function () {
      const issueResponse = await pollFeed(
        application.expressContext.localEndpoint,
        identity,
        ISSUANCE_STRING,
        PCDPassFeedIds.Devconnect
      );
      const issueResponseBody = issueResponse.value as PollFeedResponseValue;
      const action = issueResponseBody.actions[2] as ReplaceInFolderAction;

      const serializedTicket = action.pcds[1] as SerializedPCD<EdDSATicketPCD>;
      ticket = await EdDSATicketPCDPackage.deserialize(serializedTicket.pcd);

      const checkinResult = await checkinTicket(
        application.expressContext.localEndpoint,
        ticket,
        checkerIdentity
      );

      expect(checkinResult.success).to.eq(true);
      expect(checkinResult.value).to.eq(undefined);
      expect(checkinResult.error).to.eq(undefined);
    }
  );

  step(
    "a 'superuser' should not be able to check in a ticket that has already been used to check in",
    async function () {
      const checkinResult = await checkinTicket(
        application.expressContext.localEndpoint,
        ticket,
        checkerIdentity
      );

      expect(checkinResult.value).to.eq(undefined);
      expect(checkinResult?.error?.name).to.eq("AlreadyCheckedIn");
    }
  );

  step(
    "a 'superuser' should not able to check in with a ticket not signed by the server",
    async function () {
      const prvKey = newEdDSAPrivateKey();
      const ticketData: ITicketData = {
        // the fields below are not signed and are used for display purposes
        attendeeName: "test name",
        attendeeEmail: "user@test.com",
        eventName: "event",
        ticketName: "ticket",
        checkerEmail: "checker@test.com",

        // the fields below are signed using the server's private eddsa key
        ticketId: uuid(),
        eventId: uuid(),
        productId: uuid(),
        timestampConsumed: Date.now(),
        timestampSigned: Date.now(),
        attendeeSemaphoreId: "12345",
        isConsumed: false,
        isRevoked: false,
        ticketCategory: TicketCategory.Devconnect
      };

      ticket = await EdDSATicketPCDPackage.prove({
        ticket: {
          value: ticketData,
          argumentType: ArgumentTypeName.Object
        },
        privateKey: {
          value: prvKey,
          argumentType: ArgumentTypeName.String
        },
        id: {
          value: undefined,
          argumentType: ArgumentTypeName.String
        }
      });

      const checkinResult = await checkinTicket(
        application.expressContext.localEndpoint,
        ticket,
        checkerIdentity
      );

      expect(checkinResult.value).to.eq(undefined);
      expect(checkinResult?.error?.name).to.eq("InvalidSignature");
    }
  );

  step(
    "shouldn't be able to issue pcds for the incorrect 'issuance string'",
    async function () {
      const expressResponse = await pollFeed(
        application.expressContext.localEndpoint,
        identity,
        "asdf",
        PCDPassFeedIds.Devconnect
      );

      const response = expressResponse.value as PollFeedResponseValue;
      expect(response.actions).to.deep.eq([
        { type: PCDActionType.ReplaceInFolder, folder: "SBC SRW", pcds: [] },
        { type: PCDActionType.ReplaceInFolder, folder: "Devconnect", pcds: [] }
      ]);

      const action = response.actions[0] as ReplaceInFolderAction;
      expect(action.pcds).to.deep.eq([]);
    }
  );

  step(
    "shouldn't be able to issue pcds for a user that doesn't exist",
    async function () {
      const expressResponse = await pollFeed(
        application.expressContext.localEndpoint,
        new Identity(),
        ISSUANCE_STRING,
        PCDPassFeedIds.Devconnect
      );

      const response = expressResponse.value as PollFeedResponseValue;
      expect(response.actions).to.deep.eq([
        { type: PCDActionType.ReplaceInFolder, folder: "SBC SRW", pcds: [] },
        { type: PCDActionType.ReplaceInFolder, folder: "Devconnect", pcds: [] }
      ]);

      const action = response.actions[0] as ReplaceInFolderAction;
      expect(action.pcds).to.deep.eq([]);
    }
  );

  step("should be able to log in with a device login", async function () {
    const positions = _.flatMap(
      mocker
        .get()
        .organizer1.ordersByEventID.get(mocker.get().organizer1.eventA.slug),
      (order) => order.positions
    );

    const secret = positions.find(
      (position) =>
        position.attendee_email == mocker.get().organizer1.EMAIL_1 &&
        // in "mock pretix api config matches load from DB" we set 10002 as a superuserItemId
        position.item == 10002
    )?.secret;

    if (!secret) {
      throw new Error("No secret found");
    }

    const fetchedDeviceLogin = await fetchDevconnectDeviceLoginTicket(
      db,
      mocker.get().organizer1.EMAIL_1,
      secret
    );

    expect(fetchedDeviceLogin).is.not.undefined;

    const result = await testDeviceLogin(
      application,
      mocker.get().organizer1.EMAIL_1,
      secret
    );

    if (!result) {
      throw new Error("Not able to login with device login");
    }

    expect(result.user).to.include({ email: mocker.get().organizer1.EMAIL_1 });
  });

  step(
    "should not be able to log in with a device login for non-superuser",
    async function () {
      const positions = _.flatMap(
        mocker
          .get()
          .organizer1.ordersByEventID.get(mocker.get().organizer1.eventA.slug),
        (order) => order.positions
      );

      const secret = positions.find(
        (position) => position.attendee_email == mocker.get().organizer1.EMAIL_3
      )?.secret;

      if (!secret) {
        throw new Error("No secret found");
      }

      const fetchedDeviceLogin = await fetchDevconnectDeviceLoginTicket(
        db,
        mocker.get().organizer1.EMAIL_3,
        secret
      );

      expect(fetchedDeviceLogin).is.undefined;

      testFailedDeviceLogin(
        application,
        mocker.get().organizer1.EMAIL_3,
        secret
      );
    }
  );

  step("should be rate-limited by a low limit", async function () {
    const devconnectPretixAPIConfigFromDB = await getDevconnectPretixConfig(db);
    if (!devconnectPretixAPIConfigFromDB) {
      throw new Error("Could not load API configuration");
    }

    const organizer = devconnectPretixAPIConfigFromDB?.organizers[0];

    // Set up a sync manager for a single organizer
    const os = new OrganizerSync(
      organizer,
      new DevconnectPretixAPI({ requestsPerInterval: 3 }),
      application.context.dbPool
    );

    let requests = 0;

    const listener = (): void => {
      requests++;
    };
    // Count each request
    server.events.on("response:mocked", listener);

    // Perform a single run - this will not sync anything to the DB
    // because sync cannot complete in a single run with a limit of
    // one request
    os.run();
    await sleep(100);
    os.cancel();

    // Sync run will end with rate-limiting
    expect(requests).to.eq(3);

    server.events.removeListener("response:mocked", listener);
  });

  step("should not be rate-limited by a high limit", async function () {
    const devconnectPretixAPIConfigFromDB = await getDevconnectPretixConfig(db);
    if (!devconnectPretixAPIConfigFromDB) {
      throw new Error("Could not load API configuration");
    }

    const organizer = devconnectPretixAPIConfigFromDB?.organizers[0];

    // Set up a sync manager for a single organizer
    const os = new OrganizerSync(
      organizer,
      new DevconnectPretixAPI({ requestsPerInterval: 300 }),
      application.context.dbPool
    );

    let requests = 0;

    const listener = (): void => {
      requests++;
    };
    // Count each request
    server.events.on("response:mocked", listener);

    os.run();
    await sleep(100);

    expect(requests).to.be.greaterThan(3);
    server.events.removeListener("response:mocked", listener);
  });

  step(
    "should fail to sync if an event we're tracking is deleted",
    async function () {
      const devconnectPretixAPIConfigFromDB =
        await getDevconnectPretixConfig(db);
      if (!devconnectPretixAPIConfigFromDB) {
        throw new Error("Could not load API configuration");
      }

      const organizer = devconnectPretixAPIConfigFromDB?.organizers[0];
      const orgUrl = organizer.orgURL;

      const eventID = organizer.events[0].eventID;
      const org = mocker.get().organizersByOrgUrl.get(orgUrl) as IOrganizer;

      // Simulate a configured event being unavailable from Pretix
      server.use(
        rest.get(orgUrl + "/events/:event", (req, res, ctx) => {
          if (req.params.event === eventID) {
            return res(ctx.status(404));
          }
          const event = org.eventByEventID.get(req.params.event as string);
          if (!event) {
            return res(ctx.status(404));
          }
          return res(ctx.json(event));
        })
      );

      const os = new OrganizerSync(
        organizer,
        new DevconnectPretixAPI({ requestsPerInterval: 300 }),
        application.context.dbPool
      );

      let error: SyncFailureError | null = null;

      try {
        await os.run();
      } catch (e) {
        error = e as SyncFailureError;
      }

      expect(error instanceof SyncFailureError).to.be.true;
      expect(error?.phase).to.eq("fetching");
    }
  );

  step(
    "should fail to sync if an active product we're tracking is deleted",
    async function () {
      const devconnectPretixAPIConfigFromDB =
        await getDevconnectPretixConfig(db);
      if (!devconnectPretixAPIConfigFromDB) {
        throw new Error("Could not load API configuration");
      }

      const organizer = devconnectPretixAPIConfigFromDB?.organizers[0];
      const orgUrl = organizer.orgURL;

      const itemID = parseInt(organizer.events[0].activeItemIDs[0]);
      const org = mocker.get().organizersByOrgUrl.get(orgUrl) as IOrganizer;

      // Simulate a configured item being unavailable from Pretix
      server.use(
        rest.get(orgUrl + "/events/:event/items", (req, res, ctx) => {
          const items =
            org.itemsByEventID.get(req.params.event as string) ?? [];
          return res(
            ctx.json({
              results: items.filter((item) => item.id !== itemID),
              next: null
            })
          );
        })
      );

      // Set up a sync manager for a single organizer
      const os = new OrganizerSync(
        organizer,
        new DevconnectPretixAPI({ requestsPerInterval: 300 }),
        application.context.dbPool
      );

      let error: SyncFailureError | null = null;

      try {
        await os.run();
      } catch (e) {
        error = e as SyncFailureError;
      }

      expect(error instanceof SyncFailureError).to.be.true;
      expect(error?.phase).to.eq("validating");
    }
  );

  step(
    "should fail to sync if a superuser product we're tracking is deleted",
    async function () {
      const devconnectPretixAPIConfigFromDB =
        await getDevconnectPretixConfig(db);
      if (!devconnectPretixAPIConfigFromDB) {
        throw new Error("Could not load API configuration");
      }

      const organizer = devconnectPretixAPIConfigFromDB?.organizers[0];
      const orgUrl = organizer.orgURL;

      const itemID = parseInt(organizer.events[0].superuserItemIds[0]);
      const org = mocker.get().organizersByOrgUrl.get(orgUrl) as IOrganizer;

      // Simulate a configured item being unavailable from Pretix
      server.use(
        rest.get(orgUrl + "/events/:event/items", (req, res, ctx) => {
          const items =
            org.itemsByEventID.get(req.params.event as string) ?? [];
          return res(
            ctx.json({
              results: items.filter((item) => item.id !== itemID),
              next: null
            })
          );
        })
      );

      // Set up a sync manager for a single organizer
      const os = new OrganizerSync(
        organizer,
        new DevconnectPretixAPI({ requestsPerInterval: 300 }),
        application.context.dbPool
      );

      let error: SyncFailureError | null = null;

      try {
        await os.run();
      } catch (e) {
        error = e as SyncFailureError;
      }

      expect(error instanceof SyncFailureError).to.be.true;
      expect(error?.phase).to.eq("validating");
    }
  );

  step(
    "should not be able to check in with a ticket that has already been used to check in",
    async function () {
      // TODO
      expect(true).to.eq(true);
    }
  );

  step(
    "should not be able to check in with a ticket that has been revoked",
    async function () {
      // TODO
      expect(true).to.eq(true);
    }
  );

  // TODO: More tests
  // 1. Test that item_name in ItemInfo and event_name EventInfo always syncs with Pretix.
  // 2. Test deleting positions within orders (not just entire orders).
  // 3. Super comprehensive tests for database indices, making sure
  //    all the unique indices are maintained.
  // 4. Tests for flakey API responses for orders, items, and event. Test that
  //    the function returns early but other events aren't affected.
  // 5. Test that cancelling positions and cancelling events should soft delete.
});
