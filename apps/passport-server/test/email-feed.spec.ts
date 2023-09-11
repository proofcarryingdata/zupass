import { EmailPCDPackage, EmailPCDTypeName } from "@pcd/email-pcd";
import {
  FeedResponse,
  ISSUANCE_STRING,
  PCDPassFeedIds
} from "@pcd/passport-interface";
import { PCDActionType, ReplaceInFolderAction } from "@pcd/pcd-collection";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import "mocha";
import { Pool } from "postgres-pool";
import { stopApplication } from "../src/application";
import { getDB } from "../src/database/postgresPool";
import { PCDpass } from "../src/types";
import { requestIssuedPCDs } from "./issuance/issuance";
import { testLoginPCDpass } from "./user/testLoginPCDPass";
import { overrideEnvironment, pcdpassTestingEnv } from "./util/env";
import { startTestingApp } from "./util/startTestingApplication";
import { randomEmail } from "./util/util";

describe("attested email feed functionality", function () {
  this.timeout(30_000);
  let db: Pool;
  let application: PCDpass;
  let identity: Identity;
  const testEmail = randomEmail();

  this.beforeAll(async () => {
    await overrideEnvironment(pcdpassTestingEnv);
    db = await getDB();

    application = await startTestingApp({});
  });

  this.afterAll(async () => {
    await stopApplication(application);
    await db.end();
  });

  step("database should initialize", async function () {
    expect(db).to.not.eq(null);
  });

  step("should be able to log in", async function () {
    const result = await testLoginPCDpass(application, testEmail, {
      force: true,
      expectUserAlreadyLoggedIn: false,
      expectEmailIncorrect: false
    });

    expect(result?.identity).to.not.be.empty;
    identity = result?.identity as Identity;
  });

  step(
    "user should be able to be issued an attested email PCD from the server",
    async function () {
      const response = await requestIssuedPCDs(
        application,
        identity,
        ISSUANCE_STRING,
        PCDPassFeedIds.Email
      );
      const responseBody = response.body as FeedResponse;
      expect(responseBody.actions.length).to.eq(2);

      // Zeroth action clears the folder, so this one contains the email
      const action = responseBody.actions[1] as ReplaceInFolderAction;
      expect(action.type).to.eq(PCDActionType.ReplaceInFolder);
      expect(action.pcds.length).to.eq(1);
      expect(action.pcds[0].type).to.eq(EmailPCDTypeName);

      // Check that the PCD contains the expected email address
      const deserializedPCD = await EmailPCDPackage.deserialize(
        action.pcds[0].pcd
      );
      expect(deserializedPCD.claim.email.emailAddress).to.eq(testEmail);

      // Finally check that the PCD verifies
      expect(await EmailPCDPackage.verify(deserializedPCD)).to.be.true;
    }
  );
});
