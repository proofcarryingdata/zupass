import { ZuParticipant } from "@pcd/passport-interface";
import chai, { expect } from "chai";
import spies from "chai-spies";
import "mocha";
import { step } from "mocha-steps";
import { stopApplication } from "../src/application";
import { PCDPass } from "../src/types";
import { loginZupass } from "./user/loginZupass";
import { sync } from "./user/sync";
import { startTestingApp } from "./util/startTestingApplication";

chai.use(spies);

describe("logging into Zupass and syncing", function () {
  let application: PCDPass;
  let user: ZuParticipant;

  this.beforeAll(async () => {
    console.log("starting application");
    application = await startTestingApp();
  });

  this.afterAll(async () => {
    await stopApplication(application);
  });

  step("should be able to log in", async function () {
    user = await loginZupass(application);
    if (application.apis.emailAPI) {
      expect(application.apis.emailAPI.send).to.be.called();
    } else {
      throw new Error("expected email client to have been mocked");
    }
  });

  step("user should be able to sync end to end encryption", async function () {
    await sync(application);
  });
});
