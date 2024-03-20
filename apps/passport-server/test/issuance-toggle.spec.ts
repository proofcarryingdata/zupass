import {
  createFeedCredentialPayload,
  pollFeed,
  ZupassFeedIds
} from "@pcd/passport-interface";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import "mocha";
import { step } from "mocha-steps";
import MockDate from "mockdate";
import { Pool } from "postgres-pool";
import { stopApplication } from "../src/application";
import { upsertUser } from "../src/database/queries/saveUser";
import { fetchUserByEmail } from "../src/database/queries/users";
import { Zupass } from "../src/types";
import { testLogin } from "./user/testLoginPCDPass";
import { overrideEnvironment, testingEnv } from "./util/env";
import { startTestingApp } from "./util/startTestingApplication";
import { randomEmail } from "./util/util";

describe("ticket issuance cutoff date should work", function () {
  let application: Zupass;
  let db: Pool;
  const userEmail = randomEmail();
  let userIdentity: Identity;

  const now = new Date();
  const beforeCutoffDate = now;
  const cutoffDate = new Date(now.getTime() + 1000 * 60);
  const afterCutoffDate = new Date(cutoffDate.getTime() + 1000 * 60);

  this.beforeAll(async () => {
    await overrideEnvironment({
      ...testingEnv,
      TICKET_ISSUANCE_CUTOFF_DATE: cutoffDate.toISOString()
    });
    application = await startTestingApp();
    db = application.context.dbPool;
    const loginResult = await testLogin(application, userEmail, {
      expectEmailIncorrect: false,
      expectUserAlreadyLoggedIn: false,
      force: false,
      skipSetupPassword: false
    });
    if (!loginResult) {
      throw new Error("failed to log in");
    }
    userIdentity = loginResult.identity;
  });

  this.afterAll(async () => {
    await stopApplication(application);
  });

  step(
    "user should be able to hit the devconnect ticket feed successfully " +
      "before the cutoff date",
    async function () {
      MockDate.set(beforeCutoffDate);
      const feedCredential = JSON.stringify(createFeedCredentialPayload());
      const feedResult = await pollFeed(
        `${application.expressContext.localEndpoint}/feeds`,
        userIdentity,
        feedCredential,
        ZupassFeedIds.Devconnect
      );

      if (!feedResult.success) {
        throw new Error("expected to be able to poll the feed");
      }
    }
  );

  step(
    "user should not be able to hit the devconnect ticket feed successfully " +
      "after the cutoff date",
    async function () {
      MockDate.set(afterCutoffDate);
      const feedCredential = JSON.stringify(createFeedCredentialPayload());
      const feedResult = await pollFeed(
        `${application.expressContext.localEndpoint}/feeds`,
        userIdentity,
        feedCredential,
        ZupassFeedIds.Devconnect
      );
      expect(feedResult.success).to.eq(
        false,
        "expected devconnect ticket feed to reject after the cutoff date"
      );
      expect(feedResult.error).to.include(
        "Issuance of Devconnect tickets was turned off",
        "expected error to indicate that the cutoff date has passed"
      );
    }
  );

  step(
    "user should be allowed to get their devconnect tickets reissued precisely once " +
      "if they have the extra_issuance flag set",
    async function () {
      MockDate.set(afterCutoffDate);

      // first set the extra_issuance flag
      const user = await fetchUserByEmail(db, userEmail);
      if (!user) {
        throw new Error("unable to get user");
      }
      await upsertUser(db, {
        ...user,
        extra_issuance: true
      });

      const feedCredential = JSON.stringify(createFeedCredentialPayload());
      const firstFeedResult = await pollFeed(
        `${application.expressContext.localEndpoint}/feeds`,
        userIdentity,
        feedCredential,
        ZupassFeedIds.Devconnect
      );
      expect(firstFeedResult.success).to.eq(
        true,
        "first poll of devconnect tickets with extra_issuance flag should succeed"
      );

      const secondFeedResult = await pollFeed(
        `${application.expressContext.localEndpoint}/feeds`,
        userIdentity,
        feedCredential,
        ZupassFeedIds.Devconnect
      );
      expect(secondFeedResult.success).to.eq(
        false,
        "second poll of devconnect tickets should fail after the cutoff"
      );
      expect(secondFeedResult.error).to.include(
        "Issuance of Devconnect tickets was turned off",
        "expected error to indicate that the cutoff date has passed"
      );
    }
  );
});
