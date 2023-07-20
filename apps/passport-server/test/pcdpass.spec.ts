import { User } from "@pcd/passport-interface";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import "mocha";
import { step } from "mocha-steps";
import { IEmailAPI } from "../src/apis/emailAPI";
import { stopApplication } from "../src/application";
import { PretixSyncStatus } from "../src/services/types";
import { PCDPass } from "../src/types";
import { requestIssuanceServiceEnabled } from "./issuance/issuance";
import { waitForPretixSyncStatus } from "./pretix/waitForPretixSyncStatus";
import {
  expectCurrentSemaphoreToBe,
  testLatestHistoricSemaphoreGroups
} from "./semaphore/checkSemaphore";
import { testLoginPCDPass } from "./user/testLoginPCDPass";
import { testUserSync } from "./user/testUserSync";
import { overrideEnvironment, pcdpassTestingEnv } from "./util/env";
import { startTestingApp } from "./util/startTestingApplication";
import { randomEmail } from "./util/util";

describe("pcd-pass functionality", function () {
  this.timeout(15_000);

  const testEmail = randomEmail();
  let application: PCDPass;
  let user: User;
  let identity: Identity;
  let emailAPI: IEmailAPI;

  this.beforeAll(async () => {
    await overrideEnvironment(pcdpassTestingEnv);
    application = await startTestingApp();
  });

  this.afterAll(async () => {
    await stopApplication(application);
  });

  step("should have issuance service running", async function () {
    const status = await requestIssuanceServiceEnabled(application);
    expect(status).to.eq(true);
  });

  step("should not have a pretix service running", async function () {
    const status = await waitForPretixSyncStatus(application);
    expect(status).to.eq(PretixSyncStatus.NoPretix);
  });

  step("email client should be mocked", async function () {
    if (!application.apis.emailAPI) {
      throw new Error("no email client");
    }
    emailAPI = application.apis.emailAPI;
    expect(emailAPI.send).to.be.spy;
  });

  step("should be able to log in", async function () {
    const result = await testLoginPCDPass(application, testEmail, {
      force: false,
      expectUserAlreadyLoggedIn: false,
      expectEmailIncorrect: false
    });

    if (!result?.user) {
      throw new Error("expected a user");
    }

    user = result.user;
    identity = result.identity;
    expect(emailAPI.send).to.have.been.called.exactly(1);
  });

  step(
    "should not be able to login with invalid email address",
    async function () {
      expect(
        await testLoginPCDPass(application, "test", {
          force: false,
          expectUserAlreadyLoggedIn: false,
          expectEmailIncorrect: true
        })
      ).to.eq(undefined);
    }
  );

  step("semaphore service should reflect correct state", async function () {
    expectCurrentSemaphoreToBe(application, {
      p: [],
      r: [],
      v: [],
      o: [],
      g: [user.commitment]
    });
    await testLatestHistoricSemaphoreGroups(application);
  });

  step(
    "should not be able to log in a 2nd time without force option",
    async function () {
      expect(
        await testLoginPCDPass(application, testEmail, {
          force: false,
          expectUserAlreadyLoggedIn: true,
          expectEmailIncorrect: false
        })
      ).to.eq(undefined);

      const result = await testLoginPCDPass(application, testEmail, {
        force: true,
        expectUserAlreadyLoggedIn: true,
        expectEmailIncorrect: false
      });

      if (!result?.user) {
        throw new Error("exected a user");
      }

      user = result.user;
      identity = result.identity;
      expect(emailAPI.send).to.have.been.called.exactly(2);
    }
  );

  step(
    "semaphore service should now be aware of the new user" +
      " and their old commitment should have been removed",
    async function () {
      expectCurrentSemaphoreToBe(application, {
        p: [],
        r: [],
        v: [],
        o: [],
        g: [user.commitment]
      });
      await testLatestHistoricSemaphoreGroups(application);
    }
  );

  step("user should be able to sync end to end encryption", async function () {
    await testUserSync(application);
  });
});
