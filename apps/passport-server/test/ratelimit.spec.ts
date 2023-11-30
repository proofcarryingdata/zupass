import { expect } from "chai";
import "mocha";
import { step } from "mocha-steps";
import MockDate from "mockdate";
import { Pool } from "postgres-pool";
import { stopApplication } from "../src/application";
import { getDB } from "../src/database/postgresPool";
import {
  checkRateLimit,
  clearExpiredActions
} from "../src/database/queries/rateLimit";
import { sqlQuery } from "../src/database/sqlQuery";
import { RateLimitService } from "../src/services/rateLimitService";
import { Zupass } from "../src/types";
import { overrideEnvironment, testingEnv } from "./util/env";
import { startTestingApp } from "./util/startTestingApplication";

describe("generic rate-limiting features", function () {
  this.timeout(15_000);

  let db: Pool;
  let application: Zupass;
  let rateLimitService: RateLimitService;

  this.beforeAll(async () => {
    await overrideEnvironment(testingEnv);
    db = await getDB();

    application = await startTestingApp({});

    // Prevents the date from advancing except via MockDate.set()
    MockDate.set(new Date());
  });

  this.afterAll(async () => {
    await stopApplication(application);
    await db.end();
    MockDate.reset();
  });

  step("database should initialize", async function () {
    expect(db).to.not.eq(null);
  });

  step("rate-limiting service should be runing", async function () {
    expect(application.services.rateLimitService).to.exist;

    rateLimitService = application.services.rateLimitService;
  });

  /**
   * At the time of writing, 10 token check attempts are allowed per-hour.
   */
  step(
    "password reset should not be rate-limited at first attempt",
    async function () {
      const result = await rateLimitService.requestRateLimitedAction(
        "CHECK_EMAIL_TOKEN",
        "test@example.com"
      );

      expect(result).to.be.true;
    }
  );

  step(
    "password reset should be rate-limited after >10 attempts",
    async function () {
      for (let i = 0; i < 9; i++) {
        const result = await rateLimitService.requestRateLimitedAction(
          "CHECK_EMAIL_TOKEN",
          "test@example.com"
        );

        expect(result).to.be.true;
      }

      const exceededLimitResult =
        await rateLimitService.requestRateLimitedAction(
          "CHECK_EMAIL_TOKEN",
          "test@example.com"
        );

      expect(exceededLimitResult).to.be.false;
    }
  );

  step(
    "password reset should not be rate-limited for a different unique event ID such as e-mail address",
    async function () {
      const result = await rateLimitService.requestRateLimitedAction(
        "CHECK_EMAIL_TOKEN",
        "differentemail@example.com"
      );

      expect(result).to.be.true;
    }
  );

  step(
    "earlier limited event ID should still be rate-limited",
    async function () {
      const exceededLimitResult =
        await rateLimitService.requestRateLimitedAction(
          "CHECK_EMAIL_TOKEN",
          "test@example.com"
        );

      expect(exceededLimitResult).to.be.false;
    }
  );

  step(
    "after time has elapsed, more attempts should be allowed",
    async function () {
      // This simulates the case where the "bucket" of available actions has
      // not been re-filled for 30 minutes. Since 10 such actions are allowed
      // per hour, a 30-minute wait should allow 5 new attempts.
      MockDate.set(Date.now() + 30 * 60 * 1000);

      for (let i = 0; i < 5; i++) {
        const result = await rateLimitService.requestRateLimitedAction(
          "CHECK_EMAIL_TOKEN",
          "test@example.com"
        );

        expect(result).to.be.true;
      }

      // But the 6th attempt should fail
      const exceededLimitResult =
        await rateLimitService.requestRateLimitedAction(
          "CHECK_EMAIL_TOKEN",
          "test@example.com"
        );

      expect(exceededLimitResult).to.be.false;

      // Since we get 10 actions per hour, that means one every six minutes,
      // so advancing forward six minutes gives us one more action.
      MockDate.set(Date.now() + 6 * 60 * 1000);

      // One more should succeed
      const result = await rateLimitService.requestRateLimitedAction(
        "CHECK_EMAIL_TOKEN",
        "test@example.com"
      );

      expect(result).to.be.true;

      // But only one more; this should fail.
      const finalExceededLimitResult =
        await rateLimitService.requestRateLimitedAction(
          "CHECK_EMAIL_TOKEN",
          "test@example.com"
        );

      expect(finalExceededLimitResult).to.be.false;
    }
  );

  step("clearing expired rate limits works", async function () {
    // Should not clear anything since neither of the above rate limit buckets
    // have expired.
    await clearExpiredActions(db);

    expect(
      (await sqlQuery(db, "SELECT * FROM rate_limit_buckets")).rows.length
    ).to.eq(2);

    // One hour later, the rate limits should have expired
    MockDate.set(Date.now() + 60 * 60 * 1000);

    await clearExpiredActions(db);

    expect(
      (await sqlQuery(db, "SELECT * FROM rate_limit_buckets")).rows.length
    ).to.eq(0);
  });

  step(
    "checking the rate limit for a non-existent type should fail",
    async function () {
      const nonExistentType = "non-existent-type";
      try {
        expect(await checkRateLimit(db, nonExistentType, "123")).to.throw;
      } catch (e) {
        expect((e as any).message).to.eq(
          `Action type ${nonExistentType} does not have a rate configured`
        );
      }
    }
  );
});
