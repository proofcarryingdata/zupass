import chai, { expect } from "chai";
import spies from "chai-spies";
import "mocha";
import { step } from "mocha-steps";
import { stopApplication } from "../src/application";
import { PretixSyncStatus } from "../src/routing/routes/statusRoutes";
import { PCDPass } from "../src/types";
import { waitForSync } from "./pretix/waitForSync";
import { startTestingApp } from "./startTestingApplication";

chai.use(spies);

describe.only("Pretix sync should work", function () {
  this.timeout(0);

  let application: PCDPass;

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
    "pretix sync should cause users to end up in semaphore groups",
    async function () {
      // the mock data contains one resident, one visitor, and one organizer
      expect(
        application.globalServices.semaphoreService.groupParticipants().group
          .members.length
      ).to.eq(3);

      // organizers also count as residents
      expect(
        application.globalServices.semaphoreService.groupResidents().group
          .members.length
      ).to.eq(2);

      expect(
        application.globalServices.semaphoreService.groupVisitors().group
          .members.length
      ).to.eq(1);

      expect(
        application.globalServices.semaphoreService.groupOrganizers().group
          .members.length
      ).to.eq(1);
    }
  );

  step(
    "user should be able to sync end to end encryption",
    async function () {}
  );
});
