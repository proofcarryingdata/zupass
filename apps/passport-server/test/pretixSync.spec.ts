import { ZuParticipant } from "@pcd/passport-interface";
import chai, { expect } from "chai";
import spies from "chai-spies";
import "mocha";
import { step } from "mocha-steps";
import { stopApplication } from "../src/application";
import { PretixSyncStatus } from "../src/routing/routes/statusRoutes";
import { APIs, PCDPass } from "../src/types";
import { waitForSync } from "./pretix/waitForSync";
import { startTestingApp } from "./startTestingApplication";

chai.use(spies);

describe.only("Pretix sync should work", function () {
  this.timeout(0);

  let application: PCDPass;
  let user: ZuParticipant;
  let apis: Partial<APIs> | undefined;

  this.beforeAll(async () => {
    console.log("starting application");
    const env = await startTestingApp();
    application = env.application;
    apis = env.apis;
  });

  this.afterAll(async () => {
    await stopApplication(application);
  });

  step("should be able to log in", async function () {
    const pretixSyncStatus = await waitForSync(application);
    expect(pretixSyncStatus).to.eq(PretixSyncStatus.Synced);
  });

  step(
    "user should be able to sync end to end encryption",
    async function () {}
  );
});
