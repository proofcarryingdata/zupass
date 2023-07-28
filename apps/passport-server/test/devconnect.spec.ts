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
import "mocha";
import NodeRSA from "node-rsa";
import { Pool } from "pg";
import { getDevconnectPretixConfig } from "../src/apis/devconnect/organizer";
import { IEmailAPI } from "../src/apis/emailAPI";
import { stopApplication } from "../src/application";
import { getDB } from "../src/database/postgresPool";
import { fetchAllNonDeletedDevconnectPretixTickets } from "../src/database/queries/devconnect_pretix_tickets/fetchDevconnectPretixTicket";
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
import {
  EMAIL_1,
  EMAIL_2,
  EMAIL_3,
  EMAIL_4,
  EVENT_A_CONFIG_ID,
  EVENT_A_ID,
  EVENT_B_CONFIG_ID,
  EVENT_B_ID,
  EVENT_C_ID,
  ITEM_1,
  ITEM_2,
  ITEM_3,
  MOCK_PRETIX_API_CONFIG
} from "./pretix/mockPretixConfig";
import { waitForDevconnectPretixSyncStatus } from "./pretix/waitForDevconnectPretixSyncStatus";
import { testLoginPCDPass } from "./user/testLoginPCDPass";
import { overrideEnvironment, pcdpassTestingEnv } from "./util/env";
import { startTestingApp } from "./util/startTestingApplication";

describe("devconnect functionality", function () {
  this.timeout(15_000);

  let application: PCDPass;
  let _emailAPI: IEmailAPI;
  let devconnectPretixMocker: DevconnectPretixDataMocker;
  let devconnectPretixSyncService: DevconnectPretixSyncService;
  let db: Pool;
  let organizerConfigId: number;
  let eventAConfigId: number;
  let eventBConfigId: number;
  let eventCConfigId: number;

  this.beforeAll(async () => {
    await overrideEnvironment(pcdpassTestingEnv);
    db = await getDB();

    organizerConfigId = await insertPretixOrganizerConfig(
      db,
      "organizer-url",
      "token"
    );

    eventAConfigId = await insertPretixEventConfig(
      db,
      organizerConfigId,
      [ITEM_1 + "", ITEM_2 + ""],
      [ITEM_2 + ""],
      EVENT_A_ID
    );

    eventBConfigId = await insertPretixEventConfig(
      db,
      organizerConfigId,
      [ITEM_3 + ""],
      [ITEM_3 + ""],
      EVENT_B_ID
    );

    eventCConfigId = await insertPretixEventConfig(
      db,
      organizerConfigId,
      [],
      [],
      EVENT_C_ID
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
      const tickets = await fetchAllNonDeletedDevconnectPretixTickets(
        application.context.dbPool
      );

      expect(tickets).to.have.length(14);

      const ticketsWithEmailEventAndItems = tickets.map((o) => ({
        email: o.email,
        itemInfoID: o.devconnect_pretix_items_info_id
      }));

      // Get item info IDs for event A
      const [{ id: item1EventAInfoID }, { id: item2EventAInfoID }] =
        await fetchPretixItemsInfoByEvent(db, EVENT_A_CONFIG_ID);

      // Get item info IDs for event B
      const [{ id: item1EventBInfoID }] = await fetchPretixItemsInfoByEvent(
        db,
        EVENT_B_CONFIG_ID
      );

      expect(ticketsWithEmailEventAndItems).to.have.deep.members([
        {
          email: EMAIL_4,
          itemInfoID: item1EventAInfoID
        },
        {
          email: EMAIL_1,
          itemInfoID: item1EventAInfoID
        },
        {
          email: EMAIL_2,
          itemInfoID: item1EventAInfoID
        },
        {
          email: EMAIL_2,
          itemInfoID: item1EventAInfoID
        },
        {
          email: EMAIL_3,
          itemInfoID: item1EventAInfoID
        },
        {
          email: EMAIL_1,
          itemInfoID: item1EventAInfoID
        },
        {
          email: EMAIL_1,
          itemInfoID: item2EventAInfoID
        },
        {
          email: EMAIL_1,
          itemInfoID: item2EventAInfoID
        },
        {
          email: EMAIL_2,
          itemInfoID: item2EventAInfoID
        },
        {
          email: EMAIL_1,
          itemInfoID: item2EventAInfoID
        },
        {
          email: EMAIL_4,
          itemInfoID: item2EventAInfoID
        },
        {
          email: EMAIL_4,
          itemInfoID: item2EventAInfoID
        },
        {
          email: EMAIL_2,
          itemInfoID: item2EventAInfoID
        },
        {
          email: EMAIL_1,
          itemInfoID: item1EventAInfoID
        }
      ]);
    }
  );

  step("removing an order causes soft deletion of ticket", async function () {
    const ordersForEventA = devconnectPretixMocker
      .getMockData()
      .ordersByEventID.get(EVENT_A_ID)!;

    const lastOrder = ordersForEventA.find((o) => o.email === EMAIL_2)!;

    devconnectPretixMocker.removeOrder(EVENT_A_ID, lastOrder.code);
    devconnectPretixSyncService.replaceApi(
      getDevconnectMockPretixAPI(devconnectPretixMocker.getMockData())
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
    const [{ id: item1EventAInfoID }, { id: item2EventAInfoID }] =
      await fetchPretixItemsInfoByEvent(db, EVENT_A_CONFIG_ID);

    // Get item info IDs for event B
    const [{ id: item1EventBInfoID }] = await fetchPretixItemsInfoByEvent(
      db,
      EVENT_B_CONFIG_ID
    );

    expect(ticketsWithEmailEventAndItems).to.have.deep.members([
      {
        email: EMAIL_4,
        itemInfoID: item1EventAInfoID
      },
      {
        email: EMAIL_1,
        itemInfoID: item1EventAInfoID
      },
      {
        email: EMAIL_2,
        itemInfoID: item1EventAInfoID
      },
      {
        email: EMAIL_2,
        itemInfoID: item1EventAInfoID
      },
      {
        email: EMAIL_3,
        itemInfoID: item1EventAInfoID
      },
      {
        email: EMAIL_1,
        itemInfoID: item1EventAInfoID
      },
      {
        email: EMAIL_1,
        itemInfoID: item2EventAInfoID
      },
      {
        email: EMAIL_1,
        itemInfoID: item2EventAInfoID
      },
      {
        email: EMAIL_2,
        itemInfoID: item2EventAInfoID
      },
      {
        email: EMAIL_1,
        itemInfoID: item2EventAInfoID
      },
      {
        email: EMAIL_4,
        itemInfoID: item2EventAInfoID
      }
    ]);
  });

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
    const result = await testLoginPCDPass(application, EMAIL_1, {
      expectEmailIncorrect: false,
      expectUserAlreadyLoggedIn: false,
      force: false
    });

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
    const result = await testLoginPCDPass(application, EMAIL_2, {
      expectEmailIncorrect: false,
      expectUserAlreadyLoggedIn: false,
      force: false
    });

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

  // TODO: More tests
  // 1. Test that item_name in ItemInfo and event_name EventInfo always syncs with Pretix.
  // 2. Test deleting positions within orders (not just entire orders).
  // 3. Super comprehensive tests for database indices, making sure
  //    all the unique indices are maintained.
  // 4. Tests for flakey API responses for orders, items, and event. Test that
  //    the function returns early but other events aren't affected.
  // 5. Test that cancelling positions and cancelling events should soft delete.
});
