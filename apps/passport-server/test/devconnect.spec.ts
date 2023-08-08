import {
  CheckInResponse,
  ISSUANCE_STRING,
  IssuedPCDsResponse,
  User
} from "@pcd/passport-interface";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import { RSAPCDPackage } from "@pcd/rsa-pcd";
import { RSATicketPCD, RSATicketPCDPackage } from "@pcd/rsa-ticket-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import _ from "lodash";
import "mocha";
import NodeRSA from "node-rsa";
import { Pool } from "pg";
import {
  DevconnectPretixConfig,
  getDevconnectPretixConfig
} from "../src/apis/devconnect/organizer";
import { IEmailAPI } from "../src/apis/emailAPI";
import { stopApplication } from "../src/application";
import { getDB } from "../src/database/postgresPool";
import {
  fetchAllNonDeletedDevconnectPretixTickets,
  fetchDevconnectDeviceLoginTicket
} from "../src/database/queries/devconnect_pretix_tickets/fetchDevconnectPretixTicket";
import { fetchPretixEventInfo } from "../src/database/queries/pretixEventInfo";
import { fetchPretixItemsInfoByEvent } from "../src/database/queries/pretixItemInfo";
import {
  insertPretixEventConfig,
  insertPretixOrganizerConfig
} from "../src/database/queries/pretix_config/insertConfiguration";
import { DevconnectPretixSyncService } from "../src/services/devconnectPretixSyncService";
import { PretixSyncStatus } from "../src/services/types";
import { PCDPass } from "../src/types";
import {
  requestCheckIn,
  requestIssuedPCDs,
  requestServerPublicKey
} from "./issuance/issuance";
import { DevconnectPretixDataMocker } from "./pretix/devconnectPretixDataMocker";
import { getDevconnectMockPretixAPI } from "./pretix/mockDevconnectPretixApi";
import { waitForDevconnectPretixSyncStatus } from "./pretix/waitForDevconnectPretixSyncStatus";
import { testDeviceLogin, testFailedDeviceLogin } from "./user/testDeviceLogin";
import { testLoginPCDPass } from "./user/testLoginPCDPass";
import { overrideEnvironment, pcdpassTestingEnv } from "./util/env";
import { startTestingApp } from "./util/startTestingApplication";

describe("devconnect functionality", function () {
  this.timeout(30_000);

  let application: PCDPass;
  let _emailAPI: IEmailAPI;
  let mocker: DevconnectPretixDataMocker;

  let devconnectPretixSyncService: DevconnectPretixSyncService;
  let db: Pool;
  let organizerConfigId: string;
  let eventAConfigId: string;
  let eventBConfigId: string;
  let eventCConfigId: string;

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

    const devconnectPretixAPI = getDevconnectMockPretixAPI(mocker.get());
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
      const [{ id: item1EventBInfoID }] = await fetchPretixItemsInfoByEvent(
        db,
        eventBItemInfo.id
      );

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

  step("removing an order causes soft deletion of ticket", async function () {
    const ordersForEventA = mocker
      .get()
      .organizer1.ordersByEventID.get(mocker.get().organizer1.eventA.slug)!;

    const lastOrder = ordersForEventA.find(
      (o) => o.email === mocker.get().organizer1.EMAIL_2
    )!;

    mocker.removeOrder(
      mocker.get().organizer1.orgUrl,
      mocker.get().organizer1.eventA.slug,
      lastOrder.code
    );
    devconnectPretixSyncService.replaceApi(
      getDevconnectMockPretixAPI(mocker.get())
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
   * This test doesn't pass because missing items causes an exception rather than a soft-delete
   */
  /** 
  step("removing an item causes soft deletion of item", async function () {
    const eventAItemInfo = await fetchPretixEventInfo(db, eventAConfigId);
    if (!eventAItemInfo) {
      throw new Error("expected to be able to fetch corresponding item info");
    }
    const eventItemsBeforeDelete = await fetchPretixItemsInfoByEvent(application.context.dbPool, eventAItemInfo.id);

    mocker.removeEventItem(
      mocker.get().organizer1.orgUrl,
      mocker.get().organizer1.eventA.slug,
      mocker.get().organizer1.eventAItem1.id
    );

    devconnectPretixSyncService.replaceApi(
      getDevconnectMockPretixAPI(mocker.get())
    );

    await devconnectPretixSyncService.trySync();

    const eventItems = await fetchPretixItemsInfoByEvent(application.context.dbPool, eventAItemInfo.id);

  });*/
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
    }
  );

  let user: User;
  let identity: Identity;
  let publicKey: NodeRSA;

  step(
    "anyone should be able to request the server's public key",
    async function () {
      const publicKeyResponse = await requestServerPublicKey(application);
      expect(publicKeyResponse.status).to.eq(200);
      publicKey = new NodeRSA(publicKeyResponse.text, "public");
      expect(publicKey.getKeySize()).to.eq(2048);
      expect(publicKey.isPublic(true)).to.eq(true);
      expect(publicKey.isPrivate()).to.eq(false); // just to be safe
    }
  );

  step("should be able to log in", async function () {
    const result = await testLoginPCDPass(
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

    user = result.user;
    identity = result.identity;
  });

  step(
    "user should be able to be issued some PCDs from the server",
    async function () {
      const response = await requestIssuedPCDs(
        application,
        identity,
        ISSUANCE_STRING
      );
      const responseBody = response.body as IssuedPCDsResponse;

      expect(responseBody.folder).to.eq("Devconnect");

      expect(Array.isArray(responseBody.pcds)).to.eq(true);
      // important to note users are issued tickets pcd tickets even for
      // tickets that no longer exist, so they can be displayed
      // as 'revoked' on the client
      expect(responseBody.pcds.length).to.eq(6);

      const ticketPCD = responseBody.pcds[0];

      expect(ticketPCD.type).to.eq(RSATicketPCDPackage.name);

      const deserializedEmailPCD = await RSATicketPCDPackage.deserialize(
        ticketPCD.pcd
      );

      const verified = await RSATicketPCDPackage.verify(deserializedEmailPCD);
      expect(verified).to.eq(true);

      const pcdPublicKey = new NodeRSA(
        deserializedEmailPCD.proof.rsaPCD.proof.publicKey,
        "public"
      );
      expect(pcdPublicKey.isPublic(true)).to.eq(true);
      expect(pcdPublicKey.isPrivate()).to.eq(false);

      expect(pcdPublicKey.exportKey("public")).to.eq(
        publicKey.exportKey("public")
      );
    }
  );

  step("issued pcds should have stable ids", async function () {
    const expressResponse1 = await requestIssuedPCDs(
      application,
      identity,
      ISSUANCE_STRING
    );
    const expressResponse2 = await requestIssuedPCDs(
      application,
      identity,
      ISSUANCE_STRING
    );
    const response1 = expressResponse1.body as IssuedPCDsResponse;
    const response2 = expressResponse2.body as IssuedPCDsResponse;

    const pcds1 = await Promise.all(
      response1.pcds.map((pcd) => RSATicketPCDPackage.deserialize(pcd.pcd))
    );
    const pcds2 = await Promise.all(
      response2.pcds.map((pcd) => RSATicketPCDPackage.deserialize(pcd.pcd))
    );

    expect(pcds1.length).to.eq(pcds2.length);

    pcds1.forEach((_, i) => {
      expect(pcds1[i].id).to.eq(pcds2[i].id);
    });
  });

  let checkerUser: User;
  let checkerIdentity: Identity;
  step("should be able to log in", async function () {
    const result = await testLoginPCDPass(
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

    checkerUser = result.user;
    checkerIdentity = result.identity;
  });

  let ticket: RSATicketPCD;
  step("should be able to check in with a valid ticket", async function () {
    const issueResponse = await requestIssuedPCDs(
      application,
      identity,
      ISSUANCE_STRING
    );
    const issueResponseBody = issueResponse.body as IssuedPCDsResponse;

    const serializedTicket = issueResponseBody
      .pcds[1] as SerializedPCD<RSATicketPCD>;
    ticket = await RSATicketPCDPackage.deserialize(serializedTicket.pcd);

    const checkinResponse = await requestCheckIn(
      application,
      ticket,
      checkerIdentity
    );
    const checkinResponseBody = checkinResponse.body as CheckInResponse;

    expect(checkinResponse.status).to.eq(200);
    expect((checkinResponseBody as any)["error"]).to.eq(undefined);
    expect(checkinResponseBody.success).to.eq(true);
  });

  step(
    "should not be able to check in with a ticket that has already been used to check in",
    async function () {
      const checkinResponse = await requestCheckIn(
        application,
        ticket,
        checkerIdentity
      );
      const checkinResponseBody = checkinResponse.body as CheckInResponse;

      expect(checkinResponse.status).to.eq(200);
      expect(checkinResponseBody.success).to.eq(false);
      if (!checkinResponseBody.success) {
        expect(checkinResponseBody.error.name).to.eq("AlreadyCheckedIn");
      }
    }
  );

  step(
    "should not able to check in with a ticket not signed by the server",
    async function () {
      const key = new NodeRSA({ b: 2048 });
      const exportedKey = key.exportKey("private");
      const message = "test message";
      const rsaPCD = await RSAPCDPackage.prove({
        privateKey: {
          argumentType: ArgumentTypeName.String,
          value: exportedKey
        },
        signedMessage: {
          argumentType: ArgumentTypeName.String,
          value: message
        },
        id: {
          argumentType: ArgumentTypeName.String,
          value: undefined
        }
      });
      const ticket = await RSATicketPCDPackage.prove({
        id: {
          argumentType: ArgumentTypeName.String,
          value: undefined
        },
        rsaPCD: {
          argumentType: ArgumentTypeName.PCD,
          value: await RSAPCDPackage.serialize(rsaPCD)
        }
      });

      const checkinResponse = await requestCheckIn(
        application,
        ticket,
        checkerIdentity
      );
      const responseBody = checkinResponse.body as CheckInResponse;
      expect(checkinResponse.status).to.eq(200);
      expect(responseBody.success).to.eq(false);
      if (!responseBody.success) {
        expect(responseBody.error.name).to.eq("InvalidSignature");
      }
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

  step(
    "shouldn't be able to issue pcds for the incorrect 'issuance string'",
    async function () {
      const expressResponse = await requestIssuedPCDs(
        application,
        identity,
        "asdf"
      );
      const response = expressResponse.body as IssuedPCDsResponse;
      expect(response.pcds).to.deep.eq([]);
    }
  );

  step(
    "shouldn't be able to issue pcds for a user that doesn't exist",
    async function () {
      const expressResponse = await requestIssuedPCDs(
        application,
        new Identity(),
        ISSUANCE_STRING
      );
      const response = expressResponse.body as IssuedPCDsResponse;
      expect(response.pcds).to.deep.eq([]);
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

  // TODO: More tests
  // 1. Test that item_name in ItemInfo and event_name EventInfo always syncs with Pretix.
  // 2. Test deleting positions within orders (not just entire orders).
  // 3. Super comprehensive tests for database indices, making sure
  //    all the unique indices are maintained.
  // 4. Tests for flakey API responses for orders, items, and event. Test that
  //    the function returns early but other events aren't affected.
  // 5. Test that cancelling positions and cancelling events should soft delete.
});
