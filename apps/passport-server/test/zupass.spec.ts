import { EdDSATicketPCDPackage } from "@pcd/eddsa-ticket-pcd";
import {
  ISSUANCE_STRING,
  PCDPassFeedIds,
  pollFeed,
  User,
  ZuzaluUserRole
} from "@pcd/passport-interface";
import { PCDActionType, ReplaceInFolderAction } from "@pcd/pcd-collection";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import "mocha";
import { step } from "mocha-steps";
import { SetupServer } from "msw/lib/node";
import { Pool } from "postgres-pool";
import { DevconnectPretixAPI } from "../src/apis/devconnect/devconnectPretixAPI";
import { IEmailAPI } from "../src/apis/emailAPI";
import { getZuzaluPretixConfig } from "../src/apis/zuzaluPretixAPI";
import { stopApplication } from "../src/application";
import { LoggedInZuzaluUser } from "../src/database/models";
import { getDB } from "../src/database/postgresPool";
import {
  insertPretixEventConfig,
  insertPretixOrganizerConfig
} from "../src/database/queries/pretix_config/insertConfiguration";
import { DevconnectPretixSyncService } from "../src/services/devconnectPretixSyncService";
import { PretixSyncStatus } from "../src/services/types";
import { ZuzaluPretixSyncService } from "../src/services/zuzaluPretixSyncService";
import { PCDpass } from "../src/types";
import { DevconnectPretixDataMocker } from "./pretix/devconnectPretixDataMocker";
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
  testLatestHistoricSemaphoreGroups as testLatestHistoricSemaphoreGroupsMatchServerGroups
} from "./semaphore/checkSemaphore";
import { testLoginZupass } from "./user/testLoginZupass";
import { testUserSync as testE2EESync } from "./user/testUserSync";
import { overrideEnvironment, zuzaluTestingEnv } from "./util/env";
import { startTestingApp } from "./util/startTestingApplication";
import { randomEmail } from "./util/util";

describe("zupass functionality", function () {
  this.timeout(15_000);

  let application: PCDpass;
  let emailAPI: IEmailAPI;
  let pretixMocker: ZuzaluPretixDataMocker;
  let pretixService: ZuzaluPretixSyncService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let devconnectPretixSyncService: DevconnectPretixSyncService;
  let mocker: DevconnectPretixDataMocker;
  let db: Pool;
  let server: SetupServer;

  let residentUser: User | undefined;
  let residentIdentity: Identity | undefined;
  let visitorUser: User | undefined;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let visitorIdentity: Identity | undefined;
  let organizerUser: User | undefined;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let organizerIdentity: Identity | undefined;
  let updatedToOrganizerUser: LoggedInZuzaluUser;

  let organizerConfigId: string;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let eventAConfigId: string;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let eventBConfigId: string;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let eventCConfigId: string;

  this.beforeAll(async () => {
    await overrideEnvironment(zuzaluTestingEnv);
    db = await getDB();

    const pretixConfig = getZuzaluPretixConfig();
    if (!pretixConfig) {
      throw new Error(
        "expected to be able to get a pretix config for zuzalu tests"
      );
    }
    pretixMocker = new ZuzaluPretixDataMocker(pretixConfig);

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

    application = await startTestingApp({
      devconnectPretixAPIFactory: async () =>
        new DevconnectPretixAPI({ requestsPerInterval: 10_000 }),
      zuzaluPretixAPI: getMockPretixAPI(pretixMocker.getMockData())
    });

    if (!application.services.zuzaluPretixSyncService) {
      throw new Error("expected there to be a pretix sync service");
    }
    if (!application.services.devconnectPretixSyncService) {
      throw new Error("expected there to be a pretix sync service");
    }
    devconnectPretixSyncService =
      application.services.devconnectPretixSyncService;
    pretixService = application.services.zuzaluPretixSyncService;
  });

  this.afterAll(async () => {
    await stopApplication(application);
  });

  step("email client should have been mocked", async function () {
    if (!application.apis.emailAPI) {
      throw new Error("email client should have been mocked");
    }
    emailAPI = application.apis.emailAPI;
  });

  step("zuzalu pretix should sync to completion", async function () {
    await expectZuzaluPretixToHaveSynced(application);
  });

  step("devconnect pretix should sync to completion", async function () {
    await expectDevconnectPretixToHaveSynced(application);
  });

  step("should have issuance service running", async function () {
    await expectIssuanceServiceToBeRunning(application);
  });

  step(
    "since nobody has logged in yet, all the semaphore groups should be empty",
    async function () {
      expectCurrentSemaphoreToBe(application, {
        p: [],
        r: [],
        v: [],
        o: [],
        g: []
      });
    }
  );

  step(
    "after pretix sync, semaphore should have synced too," +
      " and saved historic semaphore groups",
    async function () {
      await testLatestHistoricSemaphoreGroupsMatchServerGroups(application);
    }
  );

  step(
    "after pretix sync completes, a pretix user should be able to log in",
    async function () {
      const ticketHolders =
        await application.services.userService.getZuzaluTicketHolders();
      const resident = ticketHolders.find(
        (t) => t.role === ZuzaluUserRole.Resident
      );

      if (!resident) {
        // this shouldn't happen as we've inserted a resident via mock data
        throw new Error("couldn't find a resident to test with");
      }

      const result = await testLoginZupass(application, resident.email, {
        force: false,
        expectAlreadyRegistered: false,
        expectDoesntHaveTicket: false,
        expectEmailInvalid: false
      });
      residentUser = result?.user;
      residentIdentity = result?.identity;

      expect(emailAPI.send).to.have.been.called.exactly(1);
    }
  );

  step(
    "after logging in, user should be able to be issued some PCDs from the server",
    async function () {
      if (!residentIdentity) {
        throw new Error("expected to have a resident identity");
      }

      const response = await pollFeed(
        application.expressContext.localEndpoint,
        residentIdentity,
        ISSUANCE_STRING,
        PCDPassFeedIds.Zuzalu_1
      );

      if (response.error) {
        throw new Error("expected to be able to get a feed response");
      }

      expect(response.value?.actions?.length).to.eq(2);

      const action = response.value?.actions?.[1] as ReplaceInFolderAction;

      expect(action.type).to.eq(PCDActionType.ReplaceInFolder);
      expect(action.folder).to.eq("Zuzalu");

      expect(Array.isArray(action.pcds)).to.eq(true);
      expect(action.pcds.length).to.eq(1);

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

  step(
    "shouldn't be able to login if user's email doesn't have a ticket",
    async function () {
      expect(
        await testLoginZupass(application, randomEmail(), {
          force: false,
          expectAlreadyRegistered: false,
          expectDoesntHaveTicket: true,
          expectEmailInvalid: false
        })
      ).to.eq(undefined);
    }
  );

  step("shouldn't be able to login if with invalid email", async function () {
    expect(
      await testLoginZupass(application, "test", {
        force: false,
        expectAlreadyRegistered: false,
        expectDoesntHaveTicket: false,
        expectEmailInvalid: true
      })
    ).to.eq(undefined);
  });

  step(
    "after a resident logs in, they should show up in the resident semaphore group and no other groups",
    async function () {
      if (!residentUser) {
        throw new Error("expected user");
      }

      expectCurrentSemaphoreToBe(application, {
        p: [residentUser.commitment],
        r: [residentUser.commitment],
        v: [],
        o: [],
        g: []
      });
    }
  );

  step(
    "after a user logs in, historic semaphore groups also get updated",
    async function () {
      await testLatestHistoricSemaphoreGroupsMatchServerGroups(application);
    }
  );

  step(
    "logging in with the remaining two users should work",
    async function () {
      const ticketHolders =
        await application.services.userService.getZuzaluTicketHolders();

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

      const visitorResult = await testLoginZupass(application, visitor.email, {
        force: false,
        expectAlreadyRegistered: false,
        expectDoesntHaveTicket: false,
        expectEmailInvalid: false
      });
      visitorUser = visitorResult?.user;
      visitorIdentity = visitorResult?.identity;

      expect(emailAPI.send).to.have.been.called.exactly(2);

      const organizerResult = await testLoginZupass(
        application,
        organizer.email,
        {
          force: false,
          expectAlreadyRegistered: false,
          expectDoesntHaveTicket: false,
          expectEmailInvalid: false
        }
      );
      organizerUser = organizerResult?.user;
      organizerIdentity = organizerResult?.identity;
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
        g: []
      });
    }
  );

  step(
    "after more users log in, historic semaphore groups also get updated",
    async function () {
      await testLatestHistoricSemaphoreGroupsMatchServerGroups(application);
    }
  );

  step(
    "after a user has logged in once, they cannot login again without 'force'",
    async function () {
      const ticketHolders =
        await application.services.userService.getZuzaluTicketHolders();

      const resident = ticketHolders.find(
        (t) => t.role === ZuzaluUserRole.Resident
      );

      if (!resident) {
        // this shouldn't happen as we've inserted a resident via mock data
        throw new Error("couldn't find a visitor or organizer to test with");
      }

      expect(
        await testLoginZupass(application, resident.email, {
          force: false,
          expectAlreadyRegistered: true,
          expectDoesntHaveTicket: false,
          expectEmailInvalid: false
        })
      ).to.eq(undefined);

      const residentResult = await testLoginZupass(
        application,
        resident.email,
        {
          force: true,
          expectAlreadyRegistered: true,
          expectDoesntHaveTicket: false,
          expectEmailInvalid: false
        }
      );
      residentUser = residentResult?.user;
      residentIdentity = residentResult?.identity;

      if (!residentUser || !visitorUser || !organizerUser) {
        throw new Error("expected user");
      }

      const oldResidentCommitment = resident.commitment;
      const newResidentCommitment = residentUser.commitment;

      expect(oldResidentCommitment != null).to.be.true;
      expect(newResidentCommitment != null).to.be.true;
      expect(oldResidentCommitment).to.not.eq(newResidentCommitment);

      expectCurrentSemaphoreToBe(application, {
        p: [
          newResidentCommitment,
          visitorUser.commitment,
          organizerUser.commitment
        ],
        r: [newResidentCommitment, organizerUser.commitment],
        v: [visitorUser.commitment],
        o: [organizerUser.commitment],
        g: []
      });
    }
  );

  step("users should be able to e2ee sync", async function () {
    await testE2EESync(application);
  });

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
      pretixService.replaceApi(getMockPretixAPI(pretixMocker.getMockData()));
      await pretixService.trySync();
      const user = (await application.services.semaphoreService.getUserByEmail(
        firstParticipant.email
      )) as LoggedInZuzaluUser;

      if (!user) {
        throw new Error("expected to be able to get user");
      }

      expect(user.name).to.eq(newName);
    }
  );

  step(
    "updating a ticket from resident to organizer should" +
      " update them in zupass as well",
    async function () {
      const residents = pretixMocker.getResidentsOrOrganizers(false);
      const firstResident = residents[0];
      const userBefore =
        (await application.services.semaphoreService.getUserByEmail(
          firstResident.email
        )) as LoggedInZuzaluUser;
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
      pretixService.replaceApi(getMockPretixAPI(pretixMocker.getMockData()));
      await pretixService.trySync();

      const userAfter =
        (await application.services.semaphoreService.getUserByEmail(
          firstResident.email
        )) as LoggedInZuzaluUser;

      if (!userAfter) {
        throw new Error("expected to be able to get user");
      }

      expect(userAfter.role).to.eq(ZuzaluUserRole.Organizer);

      updatedToOrganizerUser = userAfter;
    }
  );

  step(
    "after pretix causes a user to update its role " +
      "they should be moved to the correct semaphore group",
    async function () {
      if (!residentUser || !visitorUser || !organizerUser) {
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
        g: []
      });
      await testLatestHistoricSemaphoreGroupsMatchServerGroups(application);
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
      if (!residentUser || !visitorUser || !organizerUser) {
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
        g: []
      });
      await testLatestHistoricSemaphoreGroupsMatchServerGroups(application);
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
      if (!residentUser || !visitorUser || !organizerUser) {
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
        g: []
      });
      await testLatestHistoricSemaphoreGroupsMatchServerGroups(application);
    }
  );

  step(
    "replace api and sync should cause all users to be replaced",
    async function () {
      const oldTicketHolders =
        await application.services.userService.getZuzaluTicketHolders();

      const newAPI = newMockZuzaluPretixAPI();
      if (!newAPI) {
        throw new Error("couldn't instantiate a new pretix api");
      }
      application.services.zuzaluPretixSyncService?.replaceApi(newAPI);
      const syncStatus = await waitForPretixSyncStatus(application, true);
      expect(syncStatus).to.eq(PretixSyncStatus.Synced);

      const newTicketHolders =
        await application.services.userService.getZuzaluTicketHolders();

      const oldEmails = new Set(...oldTicketHolders.map((t) => t.email));
      const newEmails = new Set(...newTicketHolders.map((t) => t.email));

      expect(oldEmails).to.not.eq(newEmails);

      expectCurrentSemaphoreToBe(application, {
        p: [],
        r: [],
        v: [],
        o: [],
        g: []
      });
    }
  );
});
