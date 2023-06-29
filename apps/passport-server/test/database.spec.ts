import { expect } from "chai";
import "mocha";
import { step } from "mocha-steps";
import { Pool } from "pg";
import { getDB } from "../src/database/postgresPool";
import {
  fetchEmailToken,
  insertEmailToken,
} from "../src/database/queries/emailToken";
import { randomEmailToken } from "../src/util/util";
import { overrideEnvironment, pcdpassTestingEnv } from "./util/env";
import { randomEmail } from "./util/util";

describe.only("pcd-pass functionality", function () {
  this.timeout(15_000);

  let db: Pool;

  this.beforeAll(async () => {
    await overrideEnvironment(pcdpassTestingEnv);
    db = await getDB();
  });

  this.afterAll(async () => {
    await db.end();
  });

  step("database should initialize", async function () {
    expect(db).to.not.eq(null);
  });

  step("email tokens should work as expected", async function () {
    const testEmail = randomEmail();
    const testToken = randomEmailToken();
    await insertEmailToken(db, { email: testEmail, token: testToken });
    const insertedToken = await fetchEmailToken(db, testEmail);
    expect(insertedToken).to.eq(testToken);

    const newToken = randomEmailToken();
    await insertEmailToken(db, { email: testEmail, token: newToken });
    const newInsertedToken = await fetchEmailToken(db, testEmail);
    expect(newToken).to.eq(newInsertedToken);
  });
});
