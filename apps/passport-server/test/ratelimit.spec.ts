import { expect } from "chai";
import "mocha";
import { step } from "mocha-steps";
import { Pool } from "postgres-pool";
import { getDB } from "../src/database/postgresPool";
import {
  checkRateLimit,
  clearExpiredRateLimits
} from "../src/database/queries/rateLimit";
import { sqlQuery } from "../src/database/sqlQuery";
import { overrideEnvironment, testingEnv } from "./util/env";

describe("generic rate-limiting features", function () {
  this.timeout(15_000);

  let db: Pool;

  this.beforeAll(async () => {
    await overrideEnvironment(testingEnv);
    db = await getDB();
  });

  this.afterAll(async () => {
    await db.end();
  });

  step("database should initialize", async function () {
    expect(db).to.not.eq(null);
  });

  /**
   * At the time of writing, 10 password reset attempts are allowed per-hour.
   */
  step(
    "password reset should not be rate-limited at first attempt",
    async function () {
      const result = await checkRateLimit(
        db,
        "PASSWORD_RESET_ATTEMPT",
        "test@example.com"
      );

      expect(result).to.be.true;
    }
  );

  step(
    "password reset should be rate-limited after >10 attempts",
    async function () {
      for (let i = 0; i < 9; i++) {
        const result = await checkRateLimit(
          db,
          "PASSWORD_RESET_ATTEMPT",
          "test@example.com"
        );

        expect(result).to.be.true;
      }

      const exceededLimitResult = await checkRateLimit(
        db,
        "PASSWORD_RESET_ATTEMPT",
        "test@example.com"
      );

      expect(exceededLimitResult).to.be.false;
    }
  );

  step(
    "password reset should not be rate-limited for a different unique event ID such as e-mail address",
    async function () {
      const result = await checkRateLimit(
        db,
        "PASSWORD_RESET_ATTEMPT",
        "differentemail@example.com"
      );

      expect(result).to.be.true;
    }
  );

  step(
    "earlier limited event ID should still be rate-limited",
    async function () {
      const exceededLimitResult = await checkRateLimit(
        db,
        "PASSWORD_RESET_ATTEMPT",
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
      await sqlQuery(
        db,
        "UPDATE rate_limit_buckets SET last_refill = NOW() - INTERVAL '30 MINUTES'"
      );

      for (let i = 0; i < 5; i++) {
        const result = await checkRateLimit(
          db,
          "PASSWORD_RESET_ATTEMPT",
          "test@example.com"
        );

        expect(result).to.be.true;
      }

      // But the 6th attempt should fail
      const exceededLimitResult = await checkRateLimit(
        db,
        "PASSWORD_RESET_ATTEMPT",
        "test@example.com"
      );

      expect(exceededLimitResult).to.be.false;

      await sqlQuery(
        db,
        "UPDATE rate_limit_buckets SET last_refill = NOW() - INTERVAL '6 MINUTES'"
      );

      // One more should succeed
      const result = await checkRateLimit(
        db,
        "PASSWORD_RESET_ATTEMPT",
        "test@example.com"
      );

      expect(result).to.be.true;

      // But only one more; this should fail.
      const finalExceededLimitResult = await checkRateLimit(
        db,
        "PASSWORD_RESET_ATTEMPT",
        "test@example.com"
      );

      expect(finalExceededLimitResult).to.be.false;
    }
  );

  step("clearing expired rate limits works", async function () {
    // Should not clear anything since neither of the above rate limit buckets
    // have expired.
    await clearExpiredRateLimits(db);

    expect(
      (await sqlQuery(db, "SELECT * FROM rate_limit_buckets")).rows.length
    ).to.eq(2);

    // Simulate the case where all of the buckets have not been refilled
    // within the last hour.
    await sqlQuery(
      db,
      "UPDATE rate_limit_buckets SET last_refill = NOW() - INTERVAL '1 HOUR'"
    );

    await clearExpiredRateLimits(db);

    expect(
      (await sqlQuery(db, "SELECT * FROM rate_limit_buckets")).rows.length
    ).to.eq(0);
  });
});
