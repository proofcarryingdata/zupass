import { expect } from "chai";
import "mocha";
import { step } from "mocha-steps";
import MockDate from "mockdate";
import { Pool } from "postgres-pool";
import { v4 as uuid } from "uuid";
import { stopApplication } from "../src/application";
import { RateLimitBucketDB } from "../src/database/models";
import { getDB } from "../src/database/postgresPool";
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

  step("rate-limiting service should be running", async function () {
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
    "after rate limit has expired, more attempts should be allowed",
    async function () {
      // Once a limit has been reached, we must wait one hour (the time period
      // of this rate limit) from the first request before making another.

      // Advancing the clock by 30 minutes should not cause requests to be
      // allowed.
      MockDate.set(Date.now() + 30 * 60 * 1000);

      expect(
        await rateLimitService.requestRateLimitedAction(
          "CHECK_EMAIL_TOKEN",
          "test@example.com"
        )
      ).to.be.false;

      // Advancing the clock by another 30 minutes should expire the rate limit
      MockDate.set(Date.now() + 30 * 60 * 1000);

      for (let i = 0; i < 10; i++) {
        const result = await rateLimitService.requestRateLimitedAction(
          "CHECK_EMAIL_TOKEN",
          "test@example.com"
        );

        expect(result).to.be.true;
      }

      // But the 11th attempt should fail
      const exceededLimitResult =
        await rateLimitService.requestRateLimitedAction(
          "CHECK_EMAIL_TOKEN",
          "test@example.com"
        );

      expect(exceededLimitResult).to.be.false;
    }
  );

  step("rate limits can have periods other than hourly", async function () {
    const dummyUuid = uuid();

    // Exhaust the available checks
    for (let i = 0; i < 5; i++) {
      const result = await rateLimitService.requestRateLimitedAction(
        "ACCOUNT_RESET",
        dummyUuid
      );

      expect(result).to.be.true;
    }

    // Checks now fail
    expect(
      await rateLimitService.requestRateLimitedAction(
        "ACCOUNT_RESET",
        dummyUuid
      )
    ).to.be.false;

    // The time period for this rate limit is one day.
    // Advancing the clock by 12 hours should not cause requests to be
    // allowed.
    MockDate.set(Date.now() + 12 * 60 * 60 * 1000);

    expect(
      await rateLimitService.requestRateLimitedAction(
        "ACCOUNT_RESET",
        dummyUuid
      )
    ).to.be.false;

    // Advancing the clock by another 12 hours should cause the rate limit to
    // expire.
    MockDate.set(Date.now() + 12 * 60 * 60 * 1000);

    for (let i = 0; i < 5; i++) {
      const result = await rateLimitService.requestRateLimitedAction(
        "ACCOUNT_RESET",
        dummyUuid
      );

      expect(result).to.be.true;
    }
  });

  step(
    "rate-limiting can be disabled by an environment variable",
    async function () {
      await stopApplication(application);
      await db.end();
      await overrideEnvironment({
        ...testingEnv,
        GENERIC_RATE_LIMIT_DISABLED: "true"
      });

      db = await getDB();
      application = await startTestingApp({});
      expect(application.services.rateLimitService).to.exist;
      rateLimitService = application.services.rateLimitService;

      // Normally, the 10th request would fail, but here >10 requests will
      // succeed due to the rate limiter being disabled.
      for (let i = 0; i < 20; i++) {
        const result = await rateLimitService.requestRateLimitedAction(
          "CHECK_EMAIL_TOKEN",
          "test@example.com"
        );

        expect(result).to.be.true;
      }

      // Restore the app to its original state
      await stopApplication(application);
      await db.end();

      await overrideEnvironment({
        ...testingEnv
      });
      db = await getDB();
      application = await startTestingApp({});
      rateLimitService = application.services.rateLimitService;
    }
  );

  step(
    "rate limits are persisted to the DB and reloaded on startup",
    async function () {
      await sqlQuery(db, "DELETE FROM rate_limit_buckets");

      await rateLimitService.requestRateLimitedAction(
        "CHECK_EMAIL_TOKEN",
        "test@example.com"
      );

      const firstResult = await sqlQuery(
        db,
        "SELECT * FROM rate_limit_buckets"
      );
      expect(firstResult.rowCount).to.eq(1);
      expect(firstResult.rows[0]).to.deep.eq({
        action_type: "CHECK_EMAIL_TOKEN",
        action_id: "test@example.com",
        remaining: 9,
        expiry_time: new Date(Date.now() + 60 * 60 * 1000)
      } as RateLimitBucketDB);

      await rateLimitService.requestRateLimitedAction(
        "CHECK_EMAIL_TOKEN",
        "test@example.com"
      );

      const secondResult = await sqlQuery(
        db,
        "SELECT * FROM rate_limit_buckets"
      );
      expect(secondResult.rowCount).to.eq(1);
      expect(secondResult.rows[0]).to.deep.eq({
        action_type: "CHECK_EMAIL_TOKEN",
        action_id: "test@example.com",
        remaining: 8, // One fewer than in the first query
        expiry_time: new Date(Date.now() + 60 * 60 * 1000)
      } as RateLimitBucketDB);

      for (let i = 0; i < 8; i++) {
        await rateLimitService.requestRateLimitedAction(
          "CHECK_EMAIL_TOKEN",
          "test@example.com"
        );
      }

      const thirdResult = await sqlQuery(
        db,
        "SELECT * FROM rate_limit_buckets"
      );
      expect(thirdResult.rowCount).to.eq(1);
      expect(thirdResult.rows[0]).to.deep.eq({
        action_type: "CHECK_EMAIL_TOKEN",
        action_id: "test@example.com",
        remaining: 0, // No requests remaining
        expiry_time: new Date(Date.now() + 60 * 60 * 1000)
      } as RateLimitBucketDB);

      rateLimitService.stop();
      await rateLimitService.start();

      // On restart, the rate limit should be restored from the DB, and the
      // remaining actions should be zero, meaning that the action should not
      // be allowed.
      expect(
        await rateLimitService.requestRateLimitedAction(
          "CHECK_EMAIL_TOKEN",
          "test@example.com"
        )
      ).to.be.false;
    }
  );
});
