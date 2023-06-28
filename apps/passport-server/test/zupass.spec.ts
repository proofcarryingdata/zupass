import { ZuParticipant } from "@pcd/passport-interface";
import { expect } from "chai";
import "mocha";
import { step } from "mocha-steps";
import { IEmailAPI } from "../src/apis/emailAPI";
import { IPretixAPI } from "../src/apis/pretixAPI";
import { stopApplication } from "../src/application";
import { ParticipantRole } from "../src/database/models";
import { PretixSyncStatus } from "../src/services/types";
import { PCDPass } from "../src/types";
import { getMockZuzaluPretixAPI } from "./pretix/mockPretixApi";
import { waitForSync } from "./pretix/waitForSync";
import { expectSemaphore } from "./semaphore/checkSemaphore";
import { loginZupass } from "./user/loginZupass";
import { sync as testE2EESync } from "./user/sync";
import { overrideEnvironment, zuzaluTestingEnv } from "./util/env";
import { startTestingApp } from "./util/startTestingApplication";

describe("zupass functionality", function () {
  this.timeout(15_000);

  let application: PCDPass;
  let residentUser: ZuParticipant;
  let visitorUser: ZuParticipant;
  let organizerUser: ZuParticipant;
  let emailAPI: IEmailAPI;
  let replacedPretixAPI: IPretixAPI;

  this.beforeAll(async () => {
    await overrideEnvironment(zuzaluTestingEnv);
    application = await startTestingApp();
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

  step("pretix should sync to completion", async function () {
    const pretixSyncStatus = await waitForSync(application);
    expect(pretixSyncStatus).to.eq(PretixSyncStatus.Synced);
  });

  step(
    "since nobody has logged in yet, all the semaphore groups should be empty",
    async function () {
      expectSemaphore(application, {
        p: [],
        r: [],
        v: [],
        o: [],
      });
    }
  );

  step(
    "after pretix sync completes, a pretix user should be able to log in",
    async function () {
      const ticketHolders =
        await application.services.userService.getZuzaluTicketHolders();
      const resident = ticketHolders.find(
        (t) => t.role === ParticipantRole.Resident
      );

      if (!resident) {
        // this shouldn't happen as we've inserted a resident via mock data
        throw new Error("couldn't find a resident to test with");
      }

      residentUser = await loginZupass(application, resident.email, false);
      expect(emailAPI.send).to.have.been.called.exactly(1);
    }
  );

  step(
    "after a resident logs in, they should show up in the resident semaphore group and no other groups",
    async function () {
      expectSemaphore(application, {
        p: [residentUser.commitment],
        r: [residentUser.commitment],
        v: [],
        o: [],
      });
    }
  );

  step(
    "logging in with the remaining two users should work",
    async function () {
      const ticketHolders =
        await application.services.userService.getZuzaluTicketHolders();

      const visitor = ticketHolders.find(
        (t) => t.role === ParticipantRole.Visitor
      );
      const organizer = ticketHolders.find(
        (t) => t.role === ParticipantRole.Organizer
      );

      if (!visitor || !organizer) {
        // this shouldn't happen as we've inserted a resident via mock data
        throw new Error("couldn't find a visitor or organizer to test with");
      }

      visitorUser = await loginZupass(application, visitor.email, false);
      expect(emailAPI.send).to.have.been.called.exactly(2);

      organizerUser = await loginZupass(application, organizer.email, false);
      expect(emailAPI.send).to.have.been.called.exactly(3);
    }
  );

  step(
    "after all three users log in, the semaphore groups should reflect their existence",
    async function () {
      expectSemaphore(application, {
        p: [
          residentUser.commitment,
          visitorUser.commitment,
          organizerUser.commitment,
        ],
        r: [residentUser.commitment, organizerUser.commitment],
        v: [visitorUser.commitment],
        o: [organizerUser.commitment],
      });
    }
  );

  step(
    "after a user has logged in once, they cannot login again without 'force'",
    async function () {
      const ticketHolders =
        await application.services.userService.getZuzaluTicketHolders();

      const resident = ticketHolders.find(
        (t) => t.role === ParticipantRole.Resident
      );

      if (!resident) {
        // this shouldn't happen as we've inserted a resident via mock data
        throw new Error("couldn't find a visitor or organizer to test with");
      }

      await expect(loginZupass(application, resident.email, false)).to
        .eventually.be.rejected;

      residentUser = await loginZupass(application, resident.email, true);

      const oldResidentCommitment = resident.commitment!;
      const newResidentCommitment = residentUser.commitment;

      expect(oldResidentCommitment != null).to.be.true;
      expect(newResidentCommitment != null).to.be.true;
      expect(oldResidentCommitment).to.not.eq(newResidentCommitment);

      expectSemaphore(application, {
        p: [
          newResidentCommitment,
          visitorUser.commitment,
          organizerUser.commitment,
        ],
        r: [newResidentCommitment, organizerUser.commitment],
        v: [visitorUser.commitment],
        o: [organizerUser.commitment],
      });
    }
  );

  step("users should be able to e2ee sync", async function () {
    await testE2EESync(application);
  });

  step(
    "replace api and sync should cause all users to be replaced",
    async function () {
      const oldTicketHolders =
        await application.services.userService.getZuzaluTicketHolders();

      const newAPI = getMockZuzaluPretixAPI();
      if (!newAPI) {
        throw new Error("couldn't instantiate a new pretix api");
      }
      replacedPretixAPI = newAPI;
      application.services.pretixSyncService?.replaceApi(newAPI);
      const syncStatus = await waitForSync(application);
      expect(syncStatus).to.eq(PretixSyncStatus.Synced);

      const newTicketHolders =
        await application.services.userService.getZuzaluTicketHolders();

      const oldEmails = new Set(...oldTicketHolders.map((t) => t.email));
      const newEmails = new Set(...newTicketHolders.map((t) => t.email));

      expect(oldEmails).to.not.eq(newEmails);

      expectSemaphore(application, {
        p: [],
        r: [],
        v: [],
        o: [],
      });
    }
  );
});
