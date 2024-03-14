import { EdDSAPublicKey, getEdDSAPublicKey } from "@pcd/eddsa-pcd";
import {
  EdDSATicketPCD,
  EdDSATicketPCDPackage,
  ITicketData,
  TicketCategory
} from "@pcd/eddsa-ticket-pcd";
import { getHash } from "@pcd/passport-crypto";
import {
  KnownTicketGroup,
  KnownTicketTypesResult,
  LATEST_PRIVACY_NOTICE,
  PollFeedResponseValue,
  User,
  ZUZALU_23_EVENT_ID,
  ZUZALU_23_RESIDENT_PRODUCT_ID,
  ZupassFeedIds,
  ZuzaluUserRole,
  agreeTerms,
  checkinTicketById,
  createFeedCredentialPayload,
  pollFeed,
  requestConfirmationEmail,
  requestKnownTicketTypes,
  requestSemaphoreGroup,
  requestServerEdDSAPublicKey,
  requestServerRSAPublicKey,
  requestVerifyTicket,
  requestVerifyTicketById,
  requestVerifyToken
} from "@pcd/passport-interface";
import { PCDActionType, isReplaceInFolderAction } from "@pcd/pcd-collection";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import { sleep } from "@pcd/util";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import "mocha";
import { step } from "mocha-steps";
import MockDate from "mockdate";
import { rest } from "msw";
import { SetupServer } from "msw/lib/node";
import NodeRSA from "node-rsa";
import { Pool } from "postgres-pool";
import { v4 as uuid } from "uuid";
import {
  DevconnectPretixAPI,
  DevconnectPretixCheckin,
  DevconnectPretixOrder
} from "../src/apis/devconnect/devconnectPretixAPI";
import {
  DevconnectPretixConfig,
  DevconnectPretixOrganizerConfig,
  getDevconnectPretixConfig
} from "../src/apis/devconnect/organizer";
import { IEmailAPI } from "../src/apis/emailAPI";
import { getZuzaluPretixConfig } from "../src/apis/zuzaluPretixAPI";
import { stopApplication } from "../src/application";
import {
  DevconnectPretixTicket,
  DevconnectPretixTicketWithCheckin,
  LoggedInZuzaluUser
} from "../src/database/models";
import { getDB } from "../src/database/postgresPool";
import {
  fetchDevconnectPretixRedactedTicketsByHashedEmail,
  upsertDevconnectPretixRedactedTicket
} from "../src/database/queries/devconnect_pretix_tickets/devconnectPretixRedactedTickets";
import {
  fetchAllNonDeletedDevconnectPretixTickets,
  fetchDevconnectPretixTicketByTicketId,
  fetchDevconnectPretixTicketsByEmail,
  fetchDevconnectPretixTicketsByEvent,
  fetchDevconnectTicketsAwaitingSync
} from "../src/database/queries/devconnect_pretix_tickets/fetchDevconnectPretixTicket";
import { softDeleteDevconnectPretixTicket } from "../src/database/queries/devconnect_pretix_tickets/softDeleteDevconnectPretixTicket";
import { consumeDevconnectPretixTicket } from "../src/database/queries/devconnect_pretix_tickets/updateDevconnectPretixTicket";
import { insertNewPoapUrl } from "../src/database/queries/poap";
import { fetchPretixEventInfo } from "../src/database/queries/pretixEventInfo";
import { fetchPretixItemsInfoByEvent } from "../src/database/queries/pretixItemInfo";
import {
  insertPretixEventConfig,
  insertPretixOrganizerConfig
} from "../src/database/queries/pretix_config/insertConfiguration";
import {
  fetchAllZuzaluUsers,
  fetchZuzaluUser
} from "../src/database/queries/zuzalu_pretix_tickets/fetchZuzaluUser";
import { sqlQuery } from "../src/database/sqlQuery";
import {
  OrganizerSync,
  PRETIX_CHECKER,
  SyncFailureError
} from "../src/services/devconnect/organizerSync";
import { DevconnectPretixSyncService } from "../src/services/devconnectPretixSyncService";
import { ZUPASS_TICKET_PUBLIC_KEY_NAME } from "../src/services/issuanceService";
import { PoapService } from "../src/services/poapService";
import { PretixSyncStatus } from "../src/services/types";
import { Zupass } from "../src/types";
import { mostRecentCheckinEvent } from "../src/util/devconnectTicket";
import {
  DevconnectPretixDataMocker,
  IMockDevconnectPretixData,
  IOrganizer
} from "./pretix/devconnectPretixDataMocker";
import { expectIssuanceServiceToBeRunning } from "./pretix/issuance";
import { getDevconnectMockPretixAPIServer } from "./pretix/mockDevconnectPretixApi";
import {
  getMockPretixAPI,
  newMockZuzaluPretixAPI
} from "./pretix/mockPretixApi";
import {
  expectDevconnectPretixToHaveSynced,
  expectZuzaluPretixToHaveSynced,
  waitForPretixSyncStatus
} from "./pretix/waitForPretixSyncStatus";
import { ZuzaluPretixDataMocker } from "./pretix/zuzaluPretixDataMocker";
import {
  expectCurrentSemaphoreToBe,
  testLatestHistoricSemaphoreGroups
} from "./semaphore/checkSemaphore";
import { testLogin } from "./user/testLoginPCDPass";
import {
  testUserSyncKeyChangeNoRev,
  testUserSyncKeyChangeWithRev,
  testUserSyncNoRev,
  testUserSyncWithRev
} from "./user/testUserSync";
import { overrideEnvironment, testingEnv } from "./util/env";
import { resetRateLimitBuckets } from "./util/rateLimit";
import { startTestingApp } from "./util/startTestingApplication";
import { expectToExist } from "./util/util";

describe("devconnect functionality", function () {
  this.timeout(60_000);

  let application: Zupass;
  let mocker: DevconnectPretixDataMocker;
  let pretixMocker: ZuzaluPretixDataMocker;
  let devconnectPretixSyncService: DevconnectPretixSyncService;
  let poapService: PoapService;
  let db: Pool;
  let server: SetupServer;
  let backupData: IMockDevconnectPretixData;
  let emailAPI: IEmailAPI;

  let organizerConfigId: string;
  let eventAConfigId: string;
  let eventBConfigId: string;
  let eventCConfigId: string;

  let residentUser: User | undefined;
  let visitorUser: User | undefined;
  let organizerUser: User | undefined;
  let updatedToOrganizerUser: User | undefined;

  let identity: Identity;
  let publicKeyRSA: NodeRSA;
  let publicKeyEdDSA: EdDSAPublicKey;

  let ticketPCD: EdDSATicketPCD;
  let checkerIdentity: Identity;

  const loggedInIdentityCommitments = new Set<string>();

  this.beforeEach(async () => {
    backupData = mocker.backup();
  });

  this.afterEach(async () => {
    server.resetHandlers();
    mocker.restore(backupData);
  });

  this.beforeAll(async () => {
    await overrideEnvironment(testingEnv);
    db = await getDB();

    mocker = new DevconnectPretixDataMocker();

    organizerConfigId = await insertPretixOrganizerConfig(
      db,
      mocker.get().organizer1.orgUrl,
      mocker.get().organizer1.token,
      mocker.get().organizer1.disabled
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
      [
        mocker.get().organizer1.eventBItem3.id + "",
        mocker.get().organizer1.eventBItem4.id + ""
      ],
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
    poapService = application.services.poapService;
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
          disabled: mocker.get().organizer1.disabled,
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
              activeItemIDs: ["10003", "10004"],
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

  step(
    "since nobody has logged in yet, all the semaphore groups should be empty",
    async function () {
      expectCurrentSemaphoreToBe(application, {
        p: [],
        r: [],
        v: [],
        o: [],
        g: [],
        d: [],
        s: []
      });
    }
  );

  step(
    "after pretix sync, semaphore should have synced too," +
      " and saved historic semaphore groups",
    async function () {
      await testLatestHistoricSemaphoreGroups(application);
    }
  );

  step("logging in as a zuzalu resident should work", async function () {
    const ticketHolders = await fetchAllZuzaluUsers(db);
    const resident = ticketHolders.find(
      (t) => t.role === ZuzaluUserRole.Resident
    );

    if (!resident) {
      // this shouldn't happen as we've inserted a resident via mock data
      throw new Error("couldn't find a resident to test with");
    }

    const result = await testLogin(application, resident.email, {
      force: false,
      expectUserAlreadyLoggedIn: false,
      expectEmailIncorrect: false,
      skipSetupPassword: false
    });

    residentUser = result?.user;

    expect(emailAPI.send).to.have.been.called.exactly(1);
  });

  step(
    "after a zuzalu resident logs in, they should show up in the resident semaphore group and no other groups",
    async function () {
      if (!residentUser) {
        throw new Error("expected user");
      }

      await sleep(100);

      expectCurrentSemaphoreToBe(application, {
        p: [residentUser.commitment],
        r: [residentUser.commitment],
        v: [],
        o: [],
        g: [residentUser.commitment],
        d: [],
        s: []
      });
    }
  );

  step(
    "after a user logs in, historic semaphore groups also get updated",
    async function () {
      await testLatestHistoricSemaphoreGroups(application);
    }
  );

  step(
    "logging in with the remaining two users should work",
    async function () {
      const ticketHolders = await fetchAllZuzaluUsers(db);
      const visitor = ticketHolders.find(
        (t) => t.role === ZuzaluUserRole.Visitor
      );
      const organizer = ticketHolders.find(
        (t) => t.role === ZuzaluUserRole.Organizer
      );

      if (!visitor || !organizer) {
        // this shouldn't happen as we've inserted a resident via mock data
        throw new Error("couldn't find a visitor or organizer to test with");
      }

      const visitorResult = await testLogin(application, visitor.email, {
        force: false,
        expectUserAlreadyLoggedIn: false,
        expectEmailIncorrect: false,
        skipSetupPassword: false
      });
      visitorUser = visitorResult?.user;

      expect(emailAPI.send).to.have.been.called.exactly(2);

      const organizerResult = await testLogin(application, organizer.email, {
        force: false,
        expectUserAlreadyLoggedIn: false,
        expectEmailIncorrect: false,
        skipSetupPassword: false
      });
      organizerUser = organizerResult?.user;
      expect(emailAPI.send).to.have.been.called.exactly(3);
    }
  );

  step(
    "after all three users log in, the semaphore groups should reflect their existence",
    async function () {
      if (!residentUser || !visitorUser || !organizerUser) {
        throw new Error("expected user");
      }

      expectCurrentSemaphoreToBe(application, {
        p: [
          residentUser.commitment,
          visitorUser.commitment,
          organizerUser.commitment
        ],
        r: [residentUser.commitment, organizerUser.commitment],
        v: [visitorUser.commitment],
        o: [organizerUser.commitment],
        g: [
          residentUser.commitment,
          visitorUser.commitment,
          organizerUser.commitment
        ],
        d: [],
        s: []
      });
    }
  );

  step("should verify zuzalu tickets by ID", async () => {
    const response = await requestVerifyTicketById(
      application.expressContext.localEndpoint,
      {
        ticketId: residentUser?.uuid as string,
        timestamp: Date.now().toString()
      }
    );

    expect(response?.success).to.be.true;
    expect(response?.value?.verified).to.be.true;
    if (response.value?.verified) {
      expect(response.value.group).eq(KnownTicketGroup.Zuzalu23);
      expect(response.value.productId).eq(ZUZALU_23_RESIDENT_PRODUCT_ID);
    }
  });

  step(
    "after more users log in, historic semaphore groups also get updated",
    async function () {
      await testLatestHistoricSemaphoreGroups(application);
    }
  );

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
    "updating a ticket's name should update the corresponding user",
    async function () {
      const participants = pretixMocker.getResidentsAndOrganizers();
      const firstParticipant = participants[0];
      if (!firstParticipant) {
        throw new Error("expected there to be at least one mocked user");
      }
      const newName = "new random_name";
      expect(newName).to.not.eq(firstParticipant.positions[0].attendee_name);

      pretixMocker.updateResidentOrOrganizer(firstParticipant.code, (p) => {
        p.positions[0].attendee_name = newName;
      });
      const pretixService = application.services.zuzaluPretixSyncService;
      if (!pretixService) {
        throw new Error("expected to have a pretix service");
      }
      pretixService.replaceApi(getMockPretixAPI(pretixMocker.getMockData()));
      await pretixService.trySync();
      const user = await application.services.userService.getUserByEmail(
        firstParticipant.email
      );

      if (!user) {
        throw new Error("expected to be able to get user");
      }
    }
  );

  step(
    "updating a ticket from resident to organizer should" +
      " update them in zupass as well",
    async function () {
      const residents = pretixMocker.getResidentsOrOrganizers(false);
      const firstResident = residents[0];
      const userBefore = await fetchZuzaluUser(db, firstResident.email);
      if (!firstResident || !userBefore) {
        throw new Error("expected there to be at least one mocked user");
      }
      expect(userBefore.role).to.eq(ZuzaluUserRole.Resident);
      pretixMocker.removeResidentOrOrganizer(firstResident.code);
      const newOrganizer = pretixMocker.addResidentOrOrganizer(true);
      pretixMocker.updateResidentOrOrganizer(newOrganizer.code, (o) => {
        o.email = firstResident.email;
        o.positions[0].attendee_email = firstResident.email;
        o.positions[0].attendee_name = firstResident.positions[0].attendee_name;
      });
      const pretixService = application.services.zuzaluPretixSyncService;
      if (!pretixService) {
        throw new Error("expected to have a pretix service");
      }
      pretixService.replaceApi(getMockPretixAPI(pretixMocker.getMockData()));
      await pretixService.trySync();
      const userAfter = await fetchZuzaluUser(db, firstResident.email);
      if (!userAfter) {
        throw new Error("expected to be able to get user");
      }
      expect(userAfter.role).to.eq(ZuzaluUserRole.Organizer);
      updatedToOrganizerUser = userAfter as LoggedInZuzaluUser;
    }
  );

  step(
    "after pretix causes a user to update its role " +
      "they should be moved to the correct semaphore group",
    async function () {
      if (
        !residentUser ||
        !visitorUser ||
        !organizerUser ||
        !updatedToOrganizerUser
      ) {
        throw new Error("expected user");
      }

      expectCurrentSemaphoreToBe(application, {
        p: [
          updatedToOrganizerUser.commitment,
          visitorUser.commitment,
          organizerUser.commitment
        ],
        r: [updatedToOrganizerUser.commitment, organizerUser.commitment],
        v: [visitorUser.commitment],
        o: [organizerUser.commitment, updatedToOrganizerUser.commitment],
        g: [
          updatedToOrganizerUser.commitment,
          visitorUser.commitment,
          organizerUser.commitment
        ],
        d: [],
        s: []
      });
      await testLatestHistoricSemaphoreGroups(application);
    }
  );

  step(
    "an error fetching orders via the PretixAPI should stop the sync from completing",
    async () => {
      const newAPI = getMockPretixAPI(pretixMocker.getMockData(), {
        throwOnFetchOrders: true
      });
      const pretixSyncService = application.services.zuzaluPretixSyncService;

      if (!pretixSyncService) {
        throw new Error("expected there to be a pretix sync service running");
      }

      pretixSyncService.stop();
      pretixSyncService.replaceApi(newAPI);
      const successfulSync = await pretixSyncService.trySync();

      expect(successfulSync).to.eq(false);
    }
  );

  step(
    "after a failed sync, the set of users should remain unchanged",
    async () => {
      if (
        !residentUser ||
        !visitorUser ||
        !organizerUser ||
        !updatedToOrganizerUser
      ) {
        throw new Error("expected user");
      }

      expectCurrentSemaphoreToBe(application, {
        p: [
          updatedToOrganizerUser.commitment,
          visitorUser.commitment,
          organizerUser.commitment
        ],
        r: [updatedToOrganizerUser.commitment, organizerUser.commitment],
        v: [visitorUser.commitment],
        o: [organizerUser.commitment, updatedToOrganizerUser.commitment],
        g: [
          updatedToOrganizerUser.commitment,
          visitorUser.commitment,
          organizerUser.commitment
        ],
        d: [],
        s: []
      });
      await testLatestHistoricSemaphoreGroups(application);
    }
  );

  step(
    "an error fetching subevents via the PretixAPI should stop the sync from completing",
    async () => {
      const newAPI = getMockPretixAPI(pretixMocker.getMockData(), {
        throwOnFetchSubevents: true
      });
      const pretixSyncService = application.services.zuzaluPretixSyncService;

      if (!pretixSyncService) {
        throw new Error("expected there to be a pretix sync service running");
      }

      pretixSyncService.stop();
      pretixSyncService.replaceApi(newAPI);
      const successfulSync = await pretixSyncService.trySync();

      expect(successfulSync).to.eq(false);
    }
  );

  step(
    "after a failed sync, the set of users should remain unchanged",
    async () => {
      if (
        !residentUser ||
        !visitorUser ||
        !organizerUser ||
        !updatedToOrganizerUser
      ) {
        throw new Error("expected user");
      }

      expectCurrentSemaphoreToBe(application, {
        p: [
          updatedToOrganizerUser.commitment,
          visitorUser.commitment,
          organizerUser.commitment
        ],
        r: [updatedToOrganizerUser.commitment, organizerUser.commitment],
        v: [visitorUser.commitment],
        o: [organizerUser.commitment, updatedToOrganizerUser.commitment],
        g: [
          updatedToOrganizerUser.commitment,
          visitorUser.commitment,
          organizerUser.commitment
        ],
        d: [],
        s: []
      });
      await testLatestHistoricSemaphoreGroups(application);
    }
  );

  step(
    "replace zuzalu pretix api and sync should cause all users to be removed from " +
      "their role-specific semaphore groups, but they should remain signed in",
    async function () {
      const oldTicketHolders = await fetchAllZuzaluUsers(db);

      const newAPI = newMockZuzaluPretixAPI();
      if (!newAPI) {
        throw new Error("couldn't instantiate a new pretix api");
      }
      application.services.zuzaluPretixSyncService?.replaceApi(newAPI);
      const syncStatus = await waitForPretixSyncStatus(application, true);
      expect(syncStatus).to.eq(PretixSyncStatus.Synced);

      await sleep(100);

      const newTicketHolders = await fetchAllZuzaluUsers(db);

      const oldEmails = new Set(...oldTicketHolders.map((t) => t.email));
      const newEmails = new Set(...newTicketHolders.map((t) => t.email));

      expect(oldEmails).to.not.eq(newEmails);

      if (
        !residentUser ||
        !visitorUser ||
        !organizerUser ||
        !updatedToOrganizerUser
      ) {
        throw new Error("expected user");
      }

      expectCurrentSemaphoreToBe(application, {
        p: [],
        r: [],
        v: [],
        o: [],
        g: [
          updatedToOrganizerUser.commitment,
          visitorUser.commitment,
          organizerUser.commitment
        ],
        d: [],
        s: []
      });
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

    // Multiple check-in events, with the most recent being an entry
    const checkins: DevconnectPretixCheckin[] = [
      {
        type: "entry",
        datetime: new Date("September 1, 2023 06:00:00").toISOString()
      },
      {
        type: "exit",
        datetime: new Date("September 1, 2023 07:00:00").toISOString()
      },
      {
        type: "entry",
        datetime: new Date("September 1, 2023 08:00:00").toISOString()
      }
    ];

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
                    checkins
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
      application.context.dbPool,
      false
    );

    expect(await os.run()).to.not.throw;

    const tickets = await fetchDevconnectPretixTicketsByEvent(
      db,
      eventConfigID
    );

    const finalCheckInEvent = mostRecentCheckinEvent(checkins);
    expect(finalCheckInEvent?.type).to.eq("entry");

    // All tickets for the event should be consumed
    expect(tickets.length).to.eq(
      tickets.filter(
        (ticket: DevconnectPretixTicketWithCheckin) =>
          ticket.is_consumed === true &&
          ticket.checker === PRETIX_CHECKER &&
          ticket.pretix_checkin_timestamp?.getTime() ===
            Date.parse(finalCheckInEvent?.datetime as string)
      ).length
    );
  });

  /**
   * This covers the case where we have a ticket marked as consumed, but
   * the check-in was deleted in Pretix, meaning that there are no check-in
   * records.
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
      application.context.dbPool,
      false
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
   * This covers the case where we have a ticket marked as consumed, but
   * the check-in entry is superseded by a later "exit" checkin.
   */
  step("should correctly handle a checked-out ticket", async function () {
    const devconnectPretixAPIConfigFromDB = await getDevconnectPretixConfig(db);
    if (!devconnectPretixAPIConfigFromDB) {
      throw new Error("Could not load API configuration");
    }

    const organizer = devconnectPretixAPIConfigFromDB?.organizers[0];
    const orgUrl = organizer.orgURL;

    // Pick an event where we will add some check-in records
    const eventID = organizer.events[0].eventID;
    const eventConfigID = organizer.events[0].id;
    const org = mocker.get().organizersByOrgUrl.get(orgUrl) as IOrganizer;

    // Multiple check-in events, with the most recent being an exit
    const checkins: DevconnectPretixCheckin[] = [
      {
        type: "entry",
        datetime: new Date("September 1, 2023 06:00:00").toISOString()
      },
      {
        type: "exit",
        datetime: new Date("September 1, 2023 07:00:00").toISOString()
      },
      {
        type: "entry",
        datetime: new Date("September 1, 2023 08:00:00").toISOString()
      },
      {
        type: "exit",
        datetime: new Date("September 1, 2023 09:00:00").toISOString()
      }
    ];

    // Simulate Pretix returning tickets with the above check-in records
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
                    checkins
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

    const os = new OrganizerSync(
      organizer,
      new DevconnectPretixAPI({ requestsPerInterval: 300 }),
      application.context.dbPool,
      false
    );
    expect(await os.run()).to.not.throw;

    const tickets = await fetchDevconnectPretixTicketsByEvent(
      db,
      eventConfigID
    );

    // The final check-in event being an exist should mean that the
    // ticket is not checked in
    const finalCheckInEvent = mostRecentCheckinEvent(checkins);
    expect(finalCheckInEvent?.type).to.eq("exit");

    // None of the tickets should be consumed
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
      expect(consumedTicket?.zupass_checkin_timestamp).to.be.not.null;

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
        application.context.dbPool,
        false
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
      ).to.eq(consumedTicketAfterSync?.zupass_checkin_timestamp?.toISOString());
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

      const originalItemId = mocker.get().organizer1.eventBItem3.id;
      const originalItem = (
        await fetchPretixItemsInfoByEvent(db, eventInfo.id)
      ).find((i) => i.item_id === originalItemId.toString());

      if (!originalItem) {
        throw new Error(`Could not fetch item info for ${originalItemId}`);
      }

      mocker.updateItem(
        mocker.get().organizer1.orgUrl,
        mocker.get().organizer1.eventB.slug,
        originalItemId,
        (item) => {
          // This is valid
          //item.generate_tickets = null;
          item.name.en = updatedNameInNewSync;
        }
      );

      await devconnectPretixSyncService.trySync();
      const item = (await fetchPretixItemsInfoByEvent(db, eventInfo.id)).find(
        (i) => i.item_id === originalItemId.toString()
      );

      if (!item) {
        throw new Error(`Could not fetch item info for ${originalItemId}`);
      }

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
        await testLogin(application, "test", {
          force: false,
          expectUserAlreadyLoggedIn: false,
          expectEmailIncorrect: true,
          skipSetupPassword: false
        })
      ).to.eq(undefined);
    }
  );

  step("should be able to log in", async function () {
    const result = await testLogin(
      application,
      mocker.get().organizer1.EMAIL_1,
      {
        expectEmailIncorrect: false,
        expectUserAlreadyLoggedIn: false,
        force: false,
        skipSetupPassword: false
      }
    );

    if (!result) {
      throw new Error("failed to log in");
    }

    expect(emailAPI.send).to.have.been.called.exactly(4);
    identity = result.identity;
    loggedInIdentityCommitments.add(identity.commitment.toString());
  });

  step(
    "should be able to log in without setting up a password and uploading encryption key",
    async function () {
      const result = await testLogin(
        application,
        mocker.get().organizer1.EMAIL_4,
        {
          expectEmailIncorrect: false,
          expectUserAlreadyLoggedIn: false,
          force: false,
          skipSetupPassword: true
        }
      );

      if (!result) {
        throw new Error("failed to log in");
      }

      loggedInIdentityCommitments.add(result.identity.commitment.toString());

      expect(emailAPI.send).to.have.been.called.exactly(5);
    }
  );

  step("semaphore service should reflect correct state", async function () {
    expectCurrentSemaphoreToBe(application, {
      p: [],
      r: [],
      v: [],
      o: [],
      g: [identity.commitment.toString()],
      d: [...loggedInIdentityCommitments],
      s: [...loggedInIdentityCommitments]
    });
    await testLatestHistoricSemaphoreGroups(application);
  });

  step(
    "should not be able to log in a 2nd time without force option",
    async function () {
      expect(
        await testLogin(application, mocker.get().organizer1.EMAIL_1, {
          force: false,
          expectUserAlreadyLoggedIn: true,
          expectEmailIncorrect: false,
          skipSetupPassword: false
        })
      ).to.eq(undefined);

      const result = await testLogin(
        application,
        mocker.get().organizer1.EMAIL_1,
        {
          force: true,
          expectUserAlreadyLoggedIn: true,
          expectEmailIncorrect: false,
          skipSetupPassword: false
        }
      );

      if (!result?.user) {
        throw new Error("expected a user");
      }

      loggedInIdentityCommitments.delete(identity.commitment.toString());
      loggedInIdentityCommitments.add(result.identity.commitment.toString());

      identity = result.identity;

      expect(emailAPI.send).to.have.been.called.exactly(6);
    }
  );

  step("account reset has a rate limit", async function () {
    await resetRateLimitBuckets(db);

    // Perform 5 account resets to exhaust the rate limit
    for (let i = 0; i < 5; i++) {
      expect(
        await testLogin(application, mocker.get().organizer1.EMAIL_1, {
          force: true,
          expectUserAlreadyLoggedIn: true,
          expectEmailIncorrect: false,
          skipSetupPassword: false
        })
      ).to.not.throw;
    }

    let threw = false;
    try {
      await testLogin(application, mocker.get().organizer1.EMAIL_1, {
        force: true,
        expectUserAlreadyLoggedIn: true,
        expectEmailIncorrect: false,
        skipSetupPassword: false
      });
    } catch (e) {
      threw = true;
    } finally {
      if (!threw) {
        expect.fail("expected logging in to fail because of rate limit");
      }
    }

    // 5 resets are allowed per day, so the next one will be in one day / 5
    MockDate.set(Date.now() + (86400 / 5) * 1000);

    // 6th reset should succeed
    const result = await testLogin(
      application,
      mocker.get().organizer1.EMAIL_1,
      {
        force: true,
        expectUserAlreadyLoggedIn: true,
        expectEmailIncorrect: false,
        skipSetupPassword: false
      }
    );

    if (!result?.user) {
      throw new Error("exected a user");
    }
    loggedInIdentityCommitments.delete(identity.commitment.toString());
    loggedInIdentityCommitments.add(result.identity.commitment.toString());

    identity = result.identity;
    await application.services.semaphoreService.reload();
    MockDate.reset();
  });

  step("new email token requests have a rate limit", async function () {
    await resetRateLimitBuckets(db);

    const email = mocker.get().organizer1.EMAIL_1;

    for (let i = 0; i < 10; i++) {
      const confirmationResult = await requestConfirmationEmail(
        application.expressContext.localEndpoint,
        email,
        identity.commitment.toString(),
        true
      );

      expect(confirmationResult.success).to.be.true;
    }

    // We have used up our 10 requests, so this should fail
    const confirmationResult = await requestConfirmationEmail(
      application.expressContext.localEndpoint,
      email,
      identity.commitment.toString(),
      true
    );

    expect(confirmationResult.success).to.be.false;
    if (!confirmationResult.success) {
      expect(confirmationResult.error).to.eq(
        "Too many attempts. Come back later."
      );
    }
  });

  step("token verification has a rate limit", async function () {
    await resetRateLimitBuckets(db);

    const email = mocker.get().organizer1.EMAIL_1;
    const incorrectToken = "12345";

    for (let i = 0; i < 10; i++) {
      const verifyResult = await requestVerifyToken(
        application.expressContext.localEndpoint,
        email,
        incorrectToken
      );

      expect(verifyResult.success).to.be.false;
      if (!verifyResult.success) {
        expect(verifyResult.error).to.eq(
          "Wrong token. If you got more than one email, use the latest one."
        );
      }
    }

    // We have used up our 10 requests, so this should fail for a different reason.
    const verifyResult = await requestVerifyToken(
      application.expressContext.localEndpoint,
      email,
      incorrectToken
    );

    expect(verifyResult.success).to.be.false;
    if (!verifyResult.success) {
      expect(verifyResult.error).to.eq("Too many attempts. Come back later.");
    }
  });

  step(
    "semaphore service should now be aware of the new user" +
      " and their old commitment should have been removed",
    async function () {
      expectCurrentSemaphoreToBe(application, {
        p: [],
        r: [],
        v: [],
        o: [],
        g: [identity.commitment.toString()],
        d: [...loggedInIdentityCommitments],
        s: [...loggedInIdentityCommitments]
      });
      await testLatestHistoricSemaphoreGroups(application);
    }
  );

  step(
    "logging in a regular user adds them to devconnect attendees but not superuser semaphore group",
    async function () {
      const result = await testLogin(
        application,
        mocker.get().organizer1.EMAIL_3, // Not a superuser
        {
          expectEmailIncorrect: false,
          expectUserAlreadyLoggedIn: false,
          force: false,
          skipSetupPassword: true
        }
      );

      expectCurrentSemaphoreToBe(application, {
        p: [],
        r: [],
        v: [],
        o: [],
        g: [identity.commitment.toString()],
        d: [
          ...loggedInIdentityCommitments,
          result?.identity.commitment.toString() as string
        ],
        s: [...loggedInIdentityCommitments]
      });
      await testLatestHistoricSemaphoreGroups(application);
    }
  );

  step(
    "deleting a ticket removes the user from the semaphore group",
    async function () {
      const ticketsForUser = await fetchDevconnectPretixTicketsByEmail(
        db,
        mocker.get().organizer1.EMAIL_3
      );
      for (const ticket of ticketsForUser) {
        await softDeleteDevconnectPretixTicket(db, ticket);
      }

      await application.services.semaphoreService.reload();

      expectCurrentSemaphoreToBe(application, {
        p: [],
        r: [],
        v: [],
        o: [],
        g: [identity.commitment.toString()],
        // Compare to the previous test, which included an extra identity
        // commitment here for the user matching EMAIL_3
        d: [...loggedInIdentityCommitments],
        s: [...loggedInIdentityCommitments]
      });
      await testLatestHistoricSemaphoreGroups(application);
    }
  );

  step("semaphore group route returns expected values", async function () {
    const attendeeGroupResult = await requestSemaphoreGroup(
      `${application.expressContext.localEndpoint}/semaphore/6`
    );
    expect(attendeeGroupResult.success).to.be.true;
    if (attendeeGroupResult.success) {
      expect(
        attendeeGroupResult.value.members.filter(
          (member) => member !== attendeeGroupResult.value.zeroValue
        )
      ).to.deep.eq([...loggedInIdentityCommitments]);
    }

    const organizerGroupResult = await requestSemaphoreGroup(
      `${application.expressContext.localEndpoint}/semaphore/7`
    );
    expect(organizerGroupResult.success).to.be.true;
    if (organizerGroupResult.success) {
      expect(
        organizerGroupResult.value.members.filter(
          (member) => member !== organizerGroupResult.value.zeroValue
        )
      ).to.deep.eq([...loggedInIdentityCommitments]);
    }
  });

  step("user should be able to sync end to end encryption", async function () {
    await testUserSyncNoRev(application);
  });

  step(
    "user should be able to avoid sync conflicts in end to end encryption",
    async function () {
      await testUserSyncWithRev(application);
    }
  );

  step(
    "user should be able to change their synced storage key",
    async function () {
      if (!residentUser) {
        throw new Error("expected user");
      }
      await testUserSyncKeyChangeNoRev(application, residentUser);
    }
  );

  step(
    "user should be able to avoid conflicts changing their synced storage key",
    async function () {
      if (!residentUser) {
        throw new Error("expected user");
      }
      await testUserSyncKeyChangeWithRev(application, residentUser);
    }
  );

  step("should have issuance service running", async function () {
    await expectIssuanceServiceToBeRunning(application);
  });

  step(
    "user should be able to be issued some PCDs from the server",
    async function () {
      MockDate.set(new Date());
      const payload = JSON.stringify(createFeedCredentialPayload());
      const response = await pollFeed(
        `${application.expressContext.localEndpoint}/feeds`,
        identity,
        payload,
        ZupassFeedIds.Devconnect
      );
      MockDate.reset();

      if (response.error) {
        throw new Error("expected to be able to get a feed response");
      }

      expect(response.value?.actions?.length).to.eq(3);

      // Now we have an action to populate the folder
      const populateAction = response.value?.actions?.[2];
      expectToExist(populateAction, isReplaceInFolderAction);

      expect(populateAction.type).to.eq(PCDActionType.ReplaceInFolder);
      expect(populateAction.folder).to.eq("Devconnect/Event A");

      expect(Array.isArray(populateAction.pcds)).to.eq(true);
      expect(populateAction.pcds.length).to.eq(6);

      const ticketPCD = populateAction.pcds[0];

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
    MockDate.set(new Date());
    const payload = JSON.stringify(createFeedCredentialPayload());
    const expressResponse1 = await pollFeed(
      `${application.expressContext.localEndpoint}/feeds`,
      identity,
      payload,
      ZupassFeedIds.Devconnect
    );
    const expressResponse2 = await pollFeed(
      `${application.expressContext.localEndpoint}/feeds`,
      identity,
      payload,
      ZupassFeedIds.Devconnect
    );
    MockDate.reset();
    const response1 = expressResponse1.value as PollFeedResponseValue;
    const response2 = expressResponse2.value as PollFeedResponseValue;
    const action1 = response1.actions[2];
    expectToExist(action1, isReplaceInFolderAction);
    const action2 = response2.actions[2];
    expectToExist(action2, isReplaceInFolderAction);

    const pcds1 = await Promise.all(
      action1.pcds.map((pcd) => EdDSATicketPCDPackage.deserialize(pcd.pcd))
    );
    const pcds2 = await Promise.all(
      action2.pcds.map((pcd) => EdDSATicketPCDPackage.deserialize(pcd.pcd))
    );

    expect(pcds1.length).to.eq(pcds2.length);
    expect(pcds1.length).to.not.eq(0);

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
      MockDate.set(new Date());
      const payload = JSON.stringify(createFeedCredentialPayload());
      const response = await pollFeed(
        `${application.expressContext.localEndpoint}/feeds`,
        identity,
        payload,
        ZupassFeedIds.Devconnect
      );
      MockDate.reset();
      const responseBody = response.value as PollFeedResponseValue;
      expect(responseBody.actions.length).to.eq(3);

      const devconnectAction = responseBody.actions[2];
      expectToExist(devconnectAction, isReplaceInFolderAction);
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

      MockDate.set(new Date());
      const payload = JSON.stringify(createFeedCredentialPayload());
      const response = await pollFeed(
        `${application.expressContext.localEndpoint}/feeds`,
        identity,
        payload,
        ZupassFeedIds.Devconnect
      );
      MockDate.reset();
      const responseBody = response.value as PollFeedResponseValue;
      expect(responseBody.actions.length).to.eq(3);
      const devconnectAction = responseBody.actions[2];
      expectToExist(devconnectAction, isReplaceInFolderAction);
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

  step("event 'superuser' should be able to log in", async function () {
    const result = await testLogin(
      application,
      mocker.get().organizer1.EMAIL_2,
      {
        expectEmailIncorrect: false,
        expectUserAlreadyLoggedIn: false,
        force: false,
        skipSetupPassword: false
      }
    );

    if (!result) {
      throw new Error("failed to log in");
    }

    checkerIdentity = result.identity;
  });

  step(
    "event 'superuser' should be able to checkin a valid ticket by ID",
    async function () {
      MockDate.set(new Date());
      const payload = JSON.stringify(createFeedCredentialPayload());
      const issueResponse = await pollFeed(
        `${application.expressContext.localEndpoint}/feeds`,
        identity,
        payload,
        ZupassFeedIds.Devconnect
      );
      MockDate.reset();
      const issueResponseBody = issueResponse.value as PollFeedResponseValue;

      const action = issueResponseBody.actions[2];
      expectToExist(action, isReplaceInFolderAction);
      const serializedTicket = action.pcds[2] as SerializedPCD<EdDSATicketPCD>;
      ticketPCD = await EdDSATicketPCDPackage.deserialize(serializedTicket.pcd);

      const checkinResult = await checkinTicketById(
        application.expressContext.localEndpoint,
        ticketPCD.claim.ticket.ticketId,
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
      const checkinResult = await checkinTicketById(
        application.expressContext.localEndpoint,
        ticketPCD.claim.ticket.ticketId,
        checkerIdentity
      );

      expect(checkinResult.value).to.eq(undefined);
      expect(checkinResult?.error?.name).to.eq("AlreadyCheckedIn");
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
    "shouldn't be able to issue pcds for the incorrect feed credential payload",
    async function () {
      MockDate.set(new Date());
      const expressResponse = await pollFeed(
        `${application.expressContext.localEndpoint}/feeds`,
        identity,
        "asdf",
        ZupassFeedIds.Devconnect
      );
      MockDate.reset();

      expect(expressResponse.success).to.eq(false);
    }
  );

  step(
    "shouldn't be able to issue pcds for an expired credential payload",
    async function () {
      // Generate credential payload at given time
      MockDate.set(new Date(2023, 10, 5, 14, 30, 0));
      const payload = JSON.stringify(createFeedCredentialPayload());

      // Attempt to use credential payload one hour and twenty minutes later
      MockDate.set(new Date(2023, 10, 5, 15, 50, 0));
      const expressResponse = await pollFeed(
        `${application.expressContext.localEndpoint}/feeds`,
        identity,
        payload,
        ZupassFeedIds.Devconnect
      );
      MockDate.reset();

      expect(expressResponse.success).to.eq(false);
    }
  );

  step(
    "shouldn't be able to issue pcds for a user that doesn't exist",
    async function () {
      MockDate.set(new Date());
      const payload = JSON.stringify(createFeedCredentialPayload());
      const expressResponse = await pollFeed(
        `${application.expressContext.localEndpoint}/feeds`,
        new Identity(),
        payload,
        ZupassFeedIds.Devconnect
      );
      MockDate.reset();

      const response = expressResponse.value as PollFeedResponseValue;
      expect(response.actions).to.deep.eq([
        {
          type: PCDActionType.DeleteFolder,
          folder: "SBC SRW",
          recursive: false
        },
        {
          type: PCDActionType.DeleteFolder,
          folder: "Devconnect",
          recursive: true
        }
      ]);
    }
  );

  step("pretix - should be rate-limited by a low limit", async function () {
    const devconnectPretixAPIConfigFromDB = await getDevconnectPretixConfig(db);
    if (!devconnectPretixAPIConfigFromDB) {
      throw new Error("Could not load API configuration");
    }

    const organizer = devconnectPretixAPIConfigFromDB?.organizers[0];

    // Set up a sync manager for a single organizer
    const os = new OrganizerSync(
      organizer,
      new DevconnectPretixAPI({ requestsPerInterval: 3 }),
      application.context.dbPool,
      false
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

  step(
    "pretix - should not be rate-limited by a high limit",
    async function () {
      const devconnectPretixAPIConfigFromDB =
        await getDevconnectPretixConfig(db);
      if (!devconnectPretixAPIConfigFromDB) {
        throw new Error("Could not load API configuration");
      }

      const organizer = devconnectPretixAPIConfigFromDB?.organizers[0];

      // Set up a sync manager for a single organizer
      const os = new OrganizerSync(
        organizer,
        new DevconnectPretixAPI({ requestsPerInterval: 300 }),
        application.context.dbPool,
        false
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
    }
  );

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
        application.context.dbPool,
        false
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
        application.context.dbPool,
        false
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
        application.context.dbPool,
        false
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

  let knownTicketTypesAndKeys: KnownTicketTypesResult | undefined;

  step(
    "known ticket types should include Zupass public key",
    async function () {
      knownTicketTypesAndKeys = await requestKnownTicketTypes(
        application.expressContext.localEndpoint
      );

      const eddsaPubKey = await getEdDSAPublicKey(
        testingEnv.SERVER_EDDSA_PRIVATE_KEY as string
      );

      expect(knownTicketTypesAndKeys.success).to.be.true;
      expect(knownTicketTypesAndKeys.value?.publicKeys).to.deep.eq([
        {
          publicKeyName: ZUPASS_TICKET_PUBLIC_KEY_NAME,
          publicKeyType: "eddsa",
          publicKey: eddsaPubKey
        }
      ]);
    }
  );

  step(
    "known ticket types should include Zuzalu '23 tickets",
    async function () {
      const knownTicketTypes = knownTicketTypesAndKeys?.value?.knownTicketTypes;
      const zuzaluTicketTypes = knownTicketTypes?.filter(
        (tt) => tt.ticketGroup === KnownTicketGroup.Zuzalu23
      );

      expect(zuzaluTicketTypes?.length).to.eq(3);
    }
  );

  step(
    "known ticket types should include Devconnect tickets",
    async function () {
      const knownTicketTypes = knownTicketTypesAndKeys?.value?.knownTicketTypes;
      const devconnectTicketTypes = knownTicketTypes?.filter(
        (tt) => tt.ticketGroup === KnownTicketGroup.Devconnect23
      );

      expect(devconnectTicketTypes?.length).to.eq(4);
    }
  );

  step(
    "should verify and report knowledge of a known ticket type",
    async function () {
      const prvKey = testingEnv.SERVER_EDDSA_PRIVATE_KEY;

      // create a Zuzalu resident ticket
      const ticketData: ITicketData = {
        attendeeName: "test name",
        attendeeEmail: "user@test.com",
        eventName: "event",
        ticketName: "ticket",
        checkerEmail: "checker@test.com",
        ticketId: uuid(),
        eventId: ZUZALU_23_EVENT_ID,
        productId: ZUZALU_23_RESIDENT_PRODUCT_ID,
        timestampConsumed: Date.now(),
        timestampSigned: Date.now(),
        attendeeSemaphoreId: "12345",
        isConsumed: false,
        isRevoked: false,
        ticketCategory: TicketCategory.Zuzalu
      };

      ticketPCD = await EdDSATicketPCDPackage.prove({
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

      const result = await requestVerifyTicket(
        application.expressContext.localEndpoint,
        {
          pcd: JSON.stringify(await EdDSATicketPCDPackage.serialize(ticketPCD))
        }
      );

      expect(result.success).to.be.true;
      // The type-checker wants to know about this too
      if (result.success === true) {
        expect(result.value?.verified).to.be.true;

        if (result.value.verified === true) {
          // Should match the Zupass public key name, since we used the Zupass
          // private key to sign the ticket.
          expect(result.value.publicKeyName).to.eq(
            ZUPASS_TICKET_PUBLIC_KEY_NAME
          );
          expect(result.value.group).to.eq(KnownTicketGroup.Zuzalu23);
        }
      }
    }
  );

  step("should not verify an unknown ticket", async function () {
    const prvKey = testingEnv.SERVER_EDDSA_PRIVATE_KEY;

    // create a Zuzalu resident ticket
    const ticketData: ITicketData = {
      attendeeName: "test name",
      attendeeEmail: "user@test.com",
      eventName: "event",
      ticketName: "ticket",
      checkerEmail: "checker@test.com",
      ticketId: uuid(),
      // Random UUIDs mean that this will not be a known ticket type
      eventId: uuid(),
      productId: uuid(),
      timestampConsumed: Date.now(),
      timestampSigned: Date.now(),
      attendeeSemaphoreId: "12345",
      isConsumed: false,
      isRevoked: false,
      // Category is claimed to be Zuzalu but this is not trustworthy
      ticketCategory: TicketCategory.Zuzalu
    };

    ticketPCD = await EdDSATicketPCDPackage.prove({
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

    const result = await requestVerifyTicket(
      application.expressContext.localEndpoint,
      {
        pcd: JSON.stringify(await EdDSATicketPCDPackage.serialize(ticketPCD))
      }
    );

    expect(result.success).to.be.true;
    // The type-checker wants to know about this too
    if (result.success === true) {
      expect(result.value?.verified).to.be.false;
    }
  });

  step("should redact tickets during sync", async () => {
    const devconnectPretixAPIConfigFromDB = await getDevconnectPretixConfig(db);
    const organizer = devconnectPretixAPIConfigFromDB
      ?.organizers[0] as DevconnectPretixOrganizerConfig;
    const orgUrl = organizer.orgURL;

    // Pick an event where we will consume all of the tickets
    const eventID = organizer.events[0].eventID;
    const eventConfigID = organizer.events[0].id;
    const org = mocker.get().organizersByOrgUrl.get(orgUrl) as IOrganizer;
    // Set up a sync manager for a single organizer
    const os = new OrganizerSync(
      organizer,
      new DevconnectPretixAPI({ requestsPerInterval: 300 }),
      application.context.dbPool,
      // Enable redaction
      true
    );

    // Set up the case where nobody has not agreed to legal terms
    await sqlQuery(db, "UPDATE users SET terms_agreed = 0");

    // Remove synced tickets from previous tests
    await sqlQuery(db, "DELETE FROM devconnect_pretix_tickets");

    await os.run();

    const tickets = await fetchDevconnectPretixTicketsByEvent(
      db,
      eventConfigID
    );
    expect(tickets.length).to.eq(0);
    const ordersForEvent = org.ordersByEventID.get(
      eventID
    ) as DevconnectPretixOrder[];

    for (const order of ordersForEvent) {
      const redactedTickets =
        await fetchDevconnectPretixRedactedTicketsByHashedEmail(
          db,
          await getHash(order.email)
        );
      expect(redactedTickets.length > 0).to.be.true;
    }
  });

  let unredactUser: Awaited<ReturnType<typeof testLogin>>;
  step("creating a new account should unredact tickets", async () => {
    const devconnectPretixAPIConfigFromDB = await getDevconnectPretixConfig(db);
    const organizer = devconnectPretixAPIConfigFromDB
      ?.organizers[0] as DevconnectPretixOrganizerConfig;
    const orgUrl = organizer.orgURL;

    // Pick an event where we will consume all of the tickets
    const eventID = organizer.events[0].eventID;
    const org = mocker.get().organizersByOrgUrl.get(orgUrl) as IOrganizer;
    const ordersForEvent = org.ordersByEventID.get(
      eventID
    ) as DevconnectPretixOrder[];

    const testEmail = ordersForEvent[0].email;

    // Wipe our existing user
    await sqlQuery(db, "DELETE FROM users WHERE email = $1", [testEmail]);

    const redactedTickets =
      await fetchDevconnectPretixRedactedTicketsByHashedEmail(
        db,
        await getHash(testEmail)
      );

    let unredactedTickets = await fetchDevconnectPretixTicketsByEmail(
      db,
      testEmail
    );
    expect(unredactedTickets.length).to.eq(0);
    expect(redactedTickets.length).to.eq(3);

    unredactUser = await testLogin(application, testEmail, {
      force: false,
      expectUserAlreadyLoggedIn: false,
      expectEmailIncorrect: false,
      skipSetupPassword: false
    });

    unredactedTickets = await fetchDevconnectPretixTicketsByEmail(
      db,
      testEmail
    );
    // Redacted tickets should now be unredacted
    expect(unredactedTickets.length).to.eq(redactedTickets.length);
    expect(unredactedTickets.length).to.eq(3);

    const redactedTicketsAfterLogin =
      await fetchDevconnectPretixRedactedTicketsByHashedEmail(
        db,
        await getHash(testEmail)
      );
    expect(redactedTicketsAfterLogin.length).to.eq(0);
  });

  /**
   * It is possible for a user to log in or agree terms during a sync. This can
   * result in a situation where they have redacted tickets in the DB even
   * though their tickets have been un-redacted. The redacted tickets are
   * harmless and don't interfere with the un-redacted tickets, but it is
   * obviously good if they get cleaned up when they're no longer needed. This
   * test manufactures a scenario where a logged-in user has redacted tickets,
   * and checks that they get deleted on the next sync run.
   */
  step(
    "redacted tickets for logged-in and agreed users should be deleted on next sync",
    async () => {
      const devconnectPretixAPIConfigFromDB =
        await getDevconnectPretixConfig(db);
      const organizer = devconnectPretixAPIConfigFromDB
        ?.organizers[0] as DevconnectPretixOrganizerConfig;
      const orgUrl = organizer.orgURL;

      // Pick an event where we will consume all of the tickets
      const eventID = organizer.events[0].eventID;
      const org = mocker.get().organizersByOrgUrl.get(orgUrl) as IOrganizer;
      const ordersForEvent = org.ordersByEventID.get(
        eventID
      ) as DevconnectPretixOrder[];

      const testEmail = ordersForEvent[0].email;
      const unredactedTickets = await fetchDevconnectPretixTicketsByEmail(
        db,
        testEmail
      );

      // Insert a redacted ticket manually, simulating a partial sync
      const hashedEmail = await getHash(testEmail);
      await upsertDevconnectPretixRedactedTicket(db, {
        ...unredactedTickets[0],
        hashed_email: hashedEmail
      });

      // Check that the ticket is there
      expect(
        (
          await fetchDevconnectPretixRedactedTicketsByHashedEmail(
            db,
            hashedEmail
          )
        ).length
      ).to.eq(1);

      const os = new OrganizerSync(
        organizer,
        new DevconnectPretixAPI({ requestsPerInterval: 300 }),
        application.context.dbPool,
        // Enable redaction
        true
      );

      await os.run();

      // Post-sync, it should be gone.
      expect(
        (
          await fetchDevconnectPretixRedactedTicketsByHashedEmail(
            db,
            hashedEmail
          )
        ).length
      ).to.eq(0);
    }
  );

  step("accepting legal terms should unredact tickets", async () => {
    const devconnectPretixAPIConfigFromDB = await getDevconnectPretixConfig(db);
    const organizer = devconnectPretixAPIConfigFromDB
      ?.organizers[0] as DevconnectPretixOrganizerConfig;
    const orgUrl = organizer.orgURL;

    // Pick an event where we will consume all of the tickets
    const eventID = organizer.events[0].eventID;
    const org = mocker.get().organizersByOrgUrl.get(orgUrl) as IOrganizer;
    const ordersForEvent = org.ordersByEventID.get(
      eventID
    ) as DevconnectPretixOrder[];

    const testEmail = ordersForEvent[0].email;

    // Set up a sync manager for a single organizer
    const os = new OrganizerSync(
      organizer,
      new DevconnectPretixAPI({ requestsPerInterval: 300 }),
      application.context.dbPool,
      // Enable redaction
      true
    );

    // Set up the case where nobody has not agreed to legal terms
    await sqlQuery(db, "UPDATE users SET terms_agreed = 0");

    // Remove synced tickets from previous tests
    await sqlQuery(db, "DELETE FROM devconnect_pretix_tickets");

    await os.run();

    // First verify that the user has redacted tickets, and no unredacted ones

    const redactedTickets =
      await fetchDevconnectPretixRedactedTicketsByHashedEmail(
        db,
        await getHash(testEmail)
      );

    let unredactedTickets = await fetchDevconnectPretixTicketsByEmail(
      db,
      testEmail
    );
    expect(unredactedTickets.length).to.eq(0);
    expect(redactedTickets.length).to.eq(3);

    const result = await agreeTerms(
      application.expressContext.localEndpoint,
      LATEST_PRIVACY_NOTICE,
      unredactUser?.identity as Identity
    );

    expect(result.success).to.be.true;

    unredactedTickets = await fetchDevconnectPretixTicketsByEmail(
      db,
      testEmail
    );
    // Redacted tickets should now be unredacted
    expect(unredactedTickets.length).to.eq(redactedTickets.length);
    expect(unredactedTickets.length).to.eq(3);
  });

  step(
    "get poap claim urls from devconnect, zuzalu, and zuconnect ticket ids",
    async () => {
      // No POAP mint links in DB yet - all links return NULL
      expect(await poapService.getPoapClaimUrlByTicketId("1", "devconnect")).to
        .be.null;
      expect(await poapService.getPoapClaimUrlByTicketId("2", "devconnect")).to
        .be.null;
      expect(await poapService.getPoapClaimUrlByTicketId("3", "devconnect")).to
        .be.null;
      expect(await poapService.getPoapClaimUrlByTicketId("4", "devconnect")).to
        .be.null;
      expect(await poapService.getPoapClaimUrlByTicketId("1", "zuzalu23")).to.be
        .null;
      expect(await poapService.getPoapClaimUrlByTicketId("2", "zuzalu23")).to.be
        .null;
      expect(await poapService.getPoapClaimUrlByTicketId("3", "zuzalu23")).to.be
        .null;
      expect(await poapService.getPoapClaimUrlByTicketId("4", "zuzalu23")).to.be
        .null;
      expect(await poapService.getPoapClaimUrlByTicketId("1", "zuconnect")).to
        .be.null;
      expect(await poapService.getPoapClaimUrlByTicketId("2", "zuconnect")).to
        .be.null;
      expect(await poapService.getPoapClaimUrlByTicketId("3", "zuconnect")).to
        .be.null;
      expect(await poapService.getPoapClaimUrlByTicketId("4", "zuconnect")).to
        .be.null;

      const TEST_POAP_LINK_1 = "https://poap.xyz/mint/qwerty";
      const TEST_POAP_LINK_2 = "https://poap.xyz/mint/zxcvbn";
      const TEST_POAP_LINK_3 = "https://poap.xyz/mint/asdfgh";
      const TEST_POAP_LINK_4 = "https://poap.xyz/mint/tyuiop";

      await insertNewPoapUrl(db, TEST_POAP_LINK_1, "devconnect");
      await insertNewPoapUrl(db, TEST_POAP_LINK_2, "zuzalu23");
      await insertNewPoapUrl(db, TEST_POAP_LINK_4, "zuconnect");

      // Map ticket ID "1" to a devconnect ticket
      expect(
        await poapService.getPoapClaimUrlByTicketId("1", "devconnect")
      ).to.eq(TEST_POAP_LINK_1);
      // Ran out of mint links for Devconnect
      expect(await poapService.getPoapClaimUrlByTicketId("2", "devconnect")).to
        .be.null;

      await insertNewPoapUrl(db, TEST_POAP_LINK_3, "devconnect");

      // Still maps to existing link, regardless of what the poapEvent parameter is.
      // The intended behavior is that the poapEvent parameter is only relevant when
      // a new POAP mint link is being associated with a ticket ID. If an ticket ID
      // is already associated with a POAP mint link, poapEvent should be irrelevant.
      expect(
        await poapService.getPoapClaimUrlByTicketId("1", "devconnect")
      ).to.eq(TEST_POAP_LINK_1);
      expect(
        await poapService.getPoapClaimUrlByTicketId("1", "zuzalu23")
      ).to.eq(TEST_POAP_LINK_1);
      expect(
        await poapService.getPoapClaimUrlByTicketId("1", "zuconnect")
      ).to.eq(TEST_POAP_LINK_1);
      // Map ticket ID "2" to a devconnect ticket
      expect(
        await poapService.getPoapClaimUrlByTicketId("2", "devconnect")
      ).to.eq(TEST_POAP_LINK_3);
      expect(
        await poapService.getPoapClaimUrlByTicketId("2", "zuzalu23")
      ).to.eq(TEST_POAP_LINK_3);
      expect(
        await poapService.getPoapClaimUrlByTicketId("2", "zuconnect")
      ).to.eq(TEST_POAP_LINK_3);
      // Ran out of mint links for Devconnect
      expect(await poapService.getPoapClaimUrlByTicketId("3", "devconnect")).to
        .be.null;

      // Map ticket ID "3" to a zuzalu 2023 ticket
      expect(
        await poapService.getPoapClaimUrlByTicketId("3", "zuzalu23")
      ).to.be.eq(TEST_POAP_LINK_2);
      // Still maps to existing link, regardless of what the poapEvent parameter is
      expect(
        await poapService.getPoapClaimUrlByTicketId("3", "zuzalu23")
      ).to.be.eq(TEST_POAP_LINK_2);
      expect(
        await poapService.getPoapClaimUrlByTicketId("3", "devconnect")
      ).to.be.eq(TEST_POAP_LINK_2);
      expect(
        await poapService.getPoapClaimUrlByTicketId("3", "zuconnect")
      ).to.be.eq(TEST_POAP_LINK_2);

      // Map ticket ID "4" to a zuconnect ticket
      expect(
        await poapService.getPoapClaimUrlByTicketId("4", "zuconnect")
      ).to.be.eq(TEST_POAP_LINK_4);
      // Still maps to existing link, regardless of what the poapEvent parameter is
      expect(
        await poapService.getPoapClaimUrlByTicketId("4", "zuzalu23")
      ).to.be.eq(TEST_POAP_LINK_4);
      expect(
        await poapService.getPoapClaimUrlByTicketId("4", "devconnect")
      ).to.be.eq(TEST_POAP_LINK_4);
      expect(
        await poapService.getPoapClaimUrlByTicketId("4", "zuconnect")
      ).to.be.eq(TEST_POAP_LINK_4);
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
