import { expect } from "chai";
import "mocha";
import { step } from "mocha-steps";
import { Pool } from "postgres-pool";
import { getDB } from "../src/database/postgresPool";
import { deleteTelegramVerification } from "../src/database/queries/telegram/deleteTelegramVerification";
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

  const dummyUserId = 12345;
  const dummyChatId = 54321;

  step("should be able to record a verified user", async function () {
    // Insert a dummy Telegram user and chat as verified
    expect(
      await insertTelegramVerification(db, dummyUserId, dummyChatId)
    ).to.eq(1);
    // Check that the user is verified for access to the chat
    expect(await fetchTelegramVerificationStatus(db, dummyUserId, dummyChatId))
      .to.be.true;
  });

  step("should be able to delete a verification", async function () {
    await deleteTelegramVerification(db, dummyUserId, dummyChatId);
    // Check that the user is no longer verified for access to the chat
    expect(await fetchTelegramVerificationStatus(db, dummyUserId, dummyChatId))
      .to.be.false;
  });
});
