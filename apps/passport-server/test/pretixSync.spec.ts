import { ZuParticipant } from "@pcd/passport-interface";
import chai, { expect } from "chai";
import spies from "chai-spies";
import "mocha";
import { step } from "mocha-steps";
import { stopApplication } from "../src/application";
import { APIs, PCDPass } from "../src/types";
import { startTestingApp } from "./startTestingApplication";
import { loginPCDPass } from "./user/loginPCDPass";
import { sync } from "./user/sync";

chai.use(spies);

describe("logging into PCDPass and syncing", function () {
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
    user = await loginPCDPass(application);
    if (apis?.emailAPI) {
      expect(apis.emailAPI.send).to.be.called();
    } else {
      throw new Error("expected email client to have been mocked");
    }
  });

  step("user should be able to sync end to end encryption", async function () {
    await sync(application, user);
  });
});
