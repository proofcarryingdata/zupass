import { ZuParticipant } from "@pcd/passport-interface";
import chai, { expect } from "chai";
import spies from "chai-spies";
import "mocha";
import { step } from "mocha-steps";
import { stopApplication } from "../src/application";
import { ParticipantRole } from "../src/database/models";
import { PretixSyncStatus } from "../src/routing/routes/statusRoutes";
import { PCDPass } from "../src/types";
import { waitForSync } from "./pretix/waitForSync";
import { loginZupass } from "./user/loginZupass";
import { sync as testE2EESync } from "./user/sync";
import { startTestingApp } from "./util/startTestingApplication";

chai.use(spies);

describe.only("Pretix sync should work", function () {
  this.timeout(0);

  let application: PCDPass;
  let user: ZuParticipant;

  this.beforeAll(async () => {
    console.log("starting application");
    application = await startTestingApp();
  });

  this.afterAll(async () => {
    await stopApplication(application);
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

      user = await loginZupass(application, resident.email);
      if (application.apis.emailAPI) {
        expect(application.apis.emailAPI.send).to.be.called();
      } else {
        throw new Error("expected email client to have been mocked");
      }
    }
  );

  step("users should be able to e2ee sync", async function () {
    await testE2EESync(application);
  });
});
