import { ZuParticipant } from "@pcd/passport-interface";
import { expect } from "chai";
import "mocha";
import { step } from "mocha-steps";
import { IEmailAPI } from "../src/apis/emailAPI";
import { stopApplication } from "../src/application";
import { PCDPass } from "../src/types";
import { expectSemaphore } from "./semaphore/checkSemaphore";
import { loginPCDPass } from "./user/loginPCDPass";
import { sync } from "./user/sync";
import { overrideEnvironment, pcdpassTestingEnv } from "./util/env";
import { startTestingApp } from "./util/startTestingApplication";
import { randomEmail } from "./util/util";

describe("pcd-pass functionality", function () {
  this.timeout(15_000);

  const testEmail = randomEmail();
  let application: PCDPass;
  let user: ZuParticipant;
  let emailAPI: IEmailAPI;

  this.beforeAll(async () => {
    await overrideEnvironment(pcdpassTestingEnv);
    application = await startTestingApp();
  });

  this.afterAll(async () => {
    await stopApplication(application);
  });

  step("email client should be mocked", async function () {
    if (!application.apis.emailAPI) {
      throw new Error("no email client");
    }
    emailAPI = application.apis.emailAPI;
    expect(emailAPI.send).to.be.spy;
  });

  step("should be able to log in", async function () {
    user = await loginPCDPass(application, testEmail, false);
    expect(emailAPI.send).to.have.been.called.exactly(1);
  });

  step(
    "should not be able to log in a 2nd time without force option",
    async function () {
      await expect(loginPCDPass(application, testEmail, false)).to.be.rejected;
      user = await loginPCDPass(application, testEmail, true);
      expect(emailAPI.send).to.have.been.called.exactly(2);
    }
  );

  step("user should be able to sync end to end encryption", async function () {
    await sync(application);
  });

  step("semaphore service should now be aware of the user", async function () {
    expectSemaphore(application, {
      p: [],
      r: [],
      v: [],
      o: [],
      g: [user.commitment],
    });
  });
});
