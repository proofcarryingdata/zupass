import { ZuParticipant } from "@pcd/passport-interface";
import { expect } from "chai";
import "mocha";
import { step } from "mocha-steps";
import { IEmailAPI } from "../src/apis/emailAPI";
import { stopApplication } from "../src/application";
import { ParticipantRole } from "../src/database/models";
import { PretixSyncStatus } from "../src/routing/routes/statusRoutes";
import { PCDPass } from "../src/types";
import { waitForSync } from "./pretix/waitForSync";
import { loginZupass } from "./user/loginZupass";
import { sync as testE2EESync } from "./user/sync";
import { overrideEnvironment, zuzaluTestingEnv } from "./util/env";
import { startTestingApp } from "./util/startTestingApplication";

describe("zupass functionality", function () {
  this.timeout(0);

  let application: PCDPass;
  let residentUser: ZuParticipant;
  let visitorUser: ZuParticipant;
  let organizerUser: ZuParticipant;
  let emailAPI: IEmailAPI;

  this.beforeAll(async () => {
    overrideEnvironment(zuzaluTestingEnv);
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
      // the mock data contains one resident, one visitor, and one organizer
      expect(
        application.globalServices.semaphoreService.groupParticipants().group
          .members.length
      ).to.eq(0);

      // organizers also count as residents
      expect(
        application.globalServices.semaphoreService.groupResidents().group
          .members.length
      ).to.eq(0);

      expect(
        application.globalServices.semaphoreService.groupVisitors().group
          .members.length
      ).to.eq(0);

      expect(
        application.globalServices.semaphoreService.groupOrganizers().group
          .members.length
      ).to.eq(0);
    }
  );

  step(
    "after pretix sync completes, a pretix user should be able to log in",
    async function () {
      const ticketHolders =
        await application.globalServices.userService.getZuzaluTicketHolders();
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
      // the mock data contains one resident, one visitor, and one organizer
      expect(
        application.globalServices.semaphoreService.groupParticipants().group
          .members.length
      ).to.eq(1);

      expect(
        application.globalServices.semaphoreService
          .groupParticipants()
          .group.indexOf(residentUser.commitment)
      ).to.eq(0);

      // organizers also count as residents
      expect(
        application.globalServices.semaphoreService.groupResidents().group
          .members.length
      ).to.eq(1);

      expect(
        application.globalServices.semaphoreService
          .groupResidents()
          .group.indexOf(residentUser.commitment)
      ).to.eq(0);

      expect(
        application.globalServices.semaphoreService.groupVisitors().group
          .members.length
      ).to.eq(0);

      expect(
        application.globalServices.semaphoreService.groupOrganizers().group
          .members.length
      ).to.eq(0);
    }
  );

  step(
    "logging in with the remaining two users should work",
    async function () {
      const ticketHolders =
        await application.globalServices.userService.getZuzaluTicketHolders();

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
      // the mock data contains one resident, one visitor, and one organizer
      expect(
        application.globalServices.semaphoreService.groupParticipants().group
          .members.length
      ).to.eq(3);

      expect(
        application.globalServices.semaphoreService
          .groupParticipants()
          .group.indexOf(residentUser.commitment)
      ).to.be.greaterThan(-1);

      expect(
        application.globalServices.semaphoreService
          .groupParticipants()
          .group.indexOf(visitorUser.commitment)
      ).to.be.greaterThan(-1);

      expect(
        application.globalServices.semaphoreService
          .groupParticipants()
          .group.indexOf(organizerUser.commitment)
      ).to.be.greaterThan(-1);

      // organizers also count as residents
      expect(
        application.globalServices.semaphoreService.groupResidents().group
          .members.length
      ).to.eq(2);

      expect(
        application.globalServices.semaphoreService
          .groupResidents()
          .group.indexOf(residentUser.commitment)
      ).to.be.greaterThan(-1);

      expect(
        application.globalServices.semaphoreService
          .groupResidents()
          .group.indexOf(organizerUser.commitment)
      ).to.be.greaterThan(-1);

      expect(
        application.globalServices.semaphoreService.groupVisitors().group
          .members.length
      ).to.eq(1);

      expect(
        application.globalServices.semaphoreService
          .groupVisitors()
          .group.indexOf(visitorUser.commitment)
      ).to.be.greaterThan(-1);

      expect(
        application.globalServices.semaphoreService.groupOrganizers().group
          .members.length
      ).to.eq(1);

      expect(
        application.globalServices.semaphoreService
          .groupOrganizers()
          .group.indexOf(organizerUser.commitment)
      ).to.be.greaterThan(-1);
    }
  );

  step(
    "after a user has logged in once, they cannot login again without 'force'",
    async function () {
      const ticketHolders =
        await application.globalServices.userService.getZuzaluTicketHolders();

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

      const oldCommitment = resident.commitment!;
      const newCommitment = residentUser.commitment;

      expect(oldCommitment != null).to.be.true;
      expect(newCommitment != null).to.be.true;
      expect(oldCommitment).to.not.eq(newCommitment);

      expect(
        application.globalServices.semaphoreService
          .groupParticipants()
          .group.indexOf(oldCommitment)
      ).to.eq(-1);

      expect(
        application.globalServices.semaphoreService
          .groupParticipants()
          .group.indexOf(newCommitment)
      ).to.be.greaterThan(-1);
    }
  );

  step("users should be able to e2ee sync", async function () {
    await testE2EESync(application);
  });
});
