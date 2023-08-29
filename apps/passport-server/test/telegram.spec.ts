import { expect } from "chai";
import "mocha";
import { step } from "mocha-steps";
import { Pool } from "postgres-pool";
import { getDB } from "../src/database/postgresPool";
import { fetchTelegramVerificationStatus } from "../src/database/queries/telegram/fetchTelegramConversation";
import { insertTelegramVerification } from "../src/database/queries/telegram/insertTelegramConversation";
import { overrideEnvironment, pcdpassTestingEnv } from "./util/env";

describe("telegram bot functionality", function () {
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

  step("should be able to record a verified user", async function () {
    // Insert a dummy Telegram user and chat as verified
    expect(await insertTelegramVerification(db, 12345, 54321)).to.eq(1);
    // Check that the user is verified for access to the chat
    expect(await fetchTelegramVerificationStatus(db, 12345, 54321)).to.be.true;
  });
});
