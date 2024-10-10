import { ONE_HOUR_MS, ONE_SECOND_MS } from "@pcd/util";
import { expect } from "chai";
import "mocha";
import { step } from "mocha-steps";
import MockDate from "mockdate";
import { Pool, PoolClient } from "postgres-pool";
import { v4 as uuid } from "uuid";
import { stopApplication } from "../src/application";
import { getDB } from "../src/database/postgresPool";
import {
  consumeRateLimitToken,
  deleteUnsupportedRateLimitBuckets
} from "../src/database/queries/rateLimit";
import { sqlQuery } from "../src/database/sqlQuery";
import { RateLimitService } from "../src/services/rateLimitService";
import { Zupass } from "../src/types";
import { overrideEnvironment, testingEnv } from "./util/env";
import { resetRateLimitBuckets } from "./util/rateLimit";
import { startTestingApp } from "./util/startTestingApplication";

describe("generic rate-limiting features", function () {
  let pool: Pool;
  let client: PoolClient;
  let application: Zupass;
  let rateLimitService: RateLimitService;

  this.beforeAll(async () => {
    await overrideEnvironment(testingEnv);
    pool = await getDB();
    client = await pool.connect();
    application = await startTestingApp({});

    // Prevents the date from advancing except via MockDate.set()
    MockDate.set(new Date());
  });

  this.afterAll(async () => {
    await stopApplication(application);
    await client.end();
    await pool.end();
    MockDate.reset();
  });

  step("database should initialize", async function () {
    expect(client).to.not.eq(null);
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
        pool,
        "CHECK_EMAIL_TOKEN",
        "test@example.com"
      );

      expect(result).to.be.true;
    }
  );

  step(
    "password reset should be rate-limited after >10 attempts",
    async function () {
      await resetRateLimitBuckets(pool);

      for (let i = 0; i < 10; i++) {
        const result = await rateLimitService.requestRateLimitedAction(
          pool,
          "CHECK_EMAIL_TOKEN",
          "test@example.com"
        );

        expect(result).to.be.true;
      }

      const exceededLimitResult =
        await rateLimitService.requestRateLimitedAction(
          pool,
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
        pool,
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
          pool,
          "CHECK_EMAIL_TOKEN",
          "test@example.com"
        );

      expect(exceededLimitResult).to.be.false;
    }
  );

  step(
    "after time has elapsed, more attempts should be allowed",
    async function () {
      await resetRateLimitBuckets(pool);

      // Exhaust the rate-limit bucket
      for (let i = 0; i < 10; i++) {
        await rateLimitService.requestRateLimitedAction(
          pool,
          "CHECK_EMAIL_TOKEN",
          "test@example.com"
        );
      }

      // This simulates the case where the "bucket" of available actions has
      // not been re-filled for 30 minutes. Since 10 such actions are allowed
      // per hour, a 30-minute wait should allow 5 new attempts.
      MockDate.set(Date.now() + 30 * 60 * 1000);

      for (let i = 0; i < 5; i++) {
        const result = await rateLimitService.requestRateLimitedAction(
          pool,
          "CHECK_EMAIL_TOKEN",
          "test@example.com"
        );

        expect(result).to.be.true;
      }

      // But the 6th attempt should fail
      const exceededLimitResult =
        await rateLimitService.requestRateLimitedAction(
          pool,
          "CHECK_EMAIL_TOKEN",
          "test@example.com"
        );

      expect(exceededLimitResult).to.be.false;

      // Since we get 10 actions per hour, that means one every six minutes,
      // so advancing forward six minutes gives us one more action.
      MockDate.set(Date.now() + 6 * 60 * 1000);

      // One more should succeed
      const result = await rateLimitService.requestRateLimitedAction(
        pool,
        "CHECK_EMAIL_TOKEN",
        "test@example.com"
      );

      expect(result).to.be.true;

      // But only one more; this should fail.
      const finalExceededLimitResult =
        await rateLimitService.requestRateLimitedAction(
          pool,
          "CHECK_EMAIL_TOKEN",
          "test@example.com"
        );

      expect(finalExceededLimitResult).to.be.false;
    }
  );

  step("clearing expired rate limits works", async function () {
    await resetRateLimitBuckets(pool);

    // This should give us one bucket
    await rateLimitService.requestRateLimitedAction(
      pool,
      "CHECK_EMAIL_TOKEN",
      "test@example.com"
    );

    // Should not clear anything since the above bucket has not expired
    await rateLimitService.pruneBuckets(client);

    expect(
      (await sqlQuery(client, "SELECT * FROM rate_limit_buckets")).rows.length
    ).to.eq(1);

    // One hour later, the rate limits should have expired
    MockDate.set(Date.now() + 60 * 60 * 1000);

    await rateLimitService.pruneBuckets(client);

    expect(
      (await sqlQuery(client, "SELECT * FROM rate_limit_buckets")).rows.length
    ).to.eq(0);
  });

  step("rate limits can have periods other than hourly", async function () {
    const dummyUuid = uuid();

    // Exhaust the available checks
    for (let i = 0; i < 5; i++) {
      const result = await rateLimitService.requestRateLimitedAction(
        pool,
        "ACCOUNT_RESET",
        dummyUuid
      );

      expect(result).to.be.true;
    }

    // Checks now fail
    expect(
      await rateLimitService.requestRateLimitedAction(
        pool,
        "ACCOUNT_RESET",
        dummyUuid
      )
    ).to.be.false;

    // With 5 checks per day, the next check is allowed after 86400/5 seconds
    const timeToNextCheck = 86400 / 5;
    const now = Date.now();

    // One second before the next check is allowed, check should still fail
    MockDate.set(now + (timeToNextCheck - 1) * 1000);
    expect(
      await rateLimitService.requestRateLimitedAction(
        pool,
        "ACCOUNT_RESET",
        dummyUuid
      )
    ).to.be.false;

    // Check should succeed once required time has elapsed
    MockDate.set(now + timeToNextCheck * 1000);
    expect(
      await rateLimitService.requestRateLimitedAction(
        pool,
        "ACCOUNT_RESET",
        dummyUuid
      )
    ).to.be.true;
  });

  step(
    "rate-limiting can be disabled by an environment variable",
    async function () {
      await stopApplication(application);
      await client.end();
      await overrideEnvironment({
        ...testingEnv,
        GENERIC_RATE_LIMIT_DISABLED: "true"
      });

      pool = await getDB();
      client = await pool.connect();

      application = await startTestingApp({});
      expect(application.services.rateLimitService).to.exist;
      rateLimitService = application.services.rateLimitService;

      // Normally, the 10th request would fail, but here >10 requests will
      // succeed due to the rate limiter being disabled.
      for (let i = 0; i < 20; i++) {
        const result = await rateLimitService.requestRateLimitedAction(
          pool,
          "CHECK_EMAIL_TOKEN",
          "test@example.com"
        );

        expect(result).to.be.true;
      }
    }
  );

  step("underlying data model behaves as expected", async function () {
    const actionId = uuid();
    const maxActions = 10;
    const timePeriod = ONE_HOUR_MS;

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    const consumeToken = async () => {
      // We are always going to consume the same token type
      return consumeRateLimitToken(
        client,
        "TEST",
        actionId,
        maxActions,
        timePeriod
      );
    };

    const startTimestamp = Date.now();
    for (let i = 1; i <= maxActions; i++) {
      MockDate.set(Date.now() + ONE_SECOND_MS);
      const result = await consumeToken();

      expect(result.remaining).to.eq(maxActions - i);
      expect(parseInt(result.last_take)).to.eq(Date.now());
      expect(parseInt(result.last_take)).to.not.eq(startTimestamp);
    }

    // Save the time before advancing it again
    // MockDate.set() will advance the clock, so future Date.now() calls will
    // return a different, later value.
    // We do this because if a token is taken in consumeToken() then last_take
    // will be set to the current time, but if not token is taken then it will
    // not be. We want to test that this works as expected by checking to see
    // if last_take has or has not changed.
    let lastSuccessfulTakeTime = Date.now();
    MockDate.set(lastSuccessfulTakeTime + ONE_SECOND_MS);
    {
      const result = await consumeToken();

      // -1 indicates no token was taken
      expect(result.remaining).to.eq(-1);
      // last_take should not have changed
      expect(parseInt(result.last_take)).to.eq(lastSuccessfulTakeTime);
      expect(parseInt(result.last_take)).to.not.eq(Date.now());
    }

    const timeOfFirstRefill = lastSuccessfulTakeTime + timePeriod / maxActions;
    MockDate.set(timeOfFirstRefill);
    {
      const result = await consumeToken();

      // Since a refill occurred, we should have consumed a token
      // But since only *one* refill occurred, this should be only
      expect(result.remaining).to.eq(0);
      // last_take should have changed compared to previous call
      expect(parseInt(result.last_take)).to.eq(timeOfFirstRefill);

      MockDate.set(timeOfFirstRefill + ONE_SECOND_MS);
      const failedResult = await consumeToken();

      // -1 indicates no token was taken
      expect(failedResult.remaining).to.eq(-1);
      // last_take should not have changed
      expect(parseInt(failedResult.last_take)).to.eq(timeOfFirstRefill);
      expect(parseInt(result.last_take)).to.not.eq(Date.now());
    }

    // timeOfFirstRefill is also the last_take time in the DB
    MockDate.set(timeOfFirstRefill + timePeriod);

    // We should be able to take 10 tokens again
    for (let i = 1; i <= maxActions; i++) {
      MockDate.set(Date.now() + ONE_SECOND_MS);

      const result = await consumeToken();

      expect(result.remaining).to.eq(maxActions - i);
      expect(parseInt(result.last_take)).to.eq(Date.now());
    }
    lastSuccessfulTakeTime = Date.now();
    {
      // Since we just exhaused the bucket, this should not consume a token.
      const result = await consumeToken();

      // -1 indicates no token was taken
      expect(result.remaining).to.eq(-1);
      // last_take should not have changed
      expect(parseInt(result.last_take)).to.eq(lastSuccessfulTakeTime);
    }
    // Advance only half-way toward the time needed for the next refill
    MockDate.set(lastSuccessfulTakeTime + timePeriod / maxActions / 2);
    {
      // Since there has not been enough time for a refill, this should not
      // consume a token.
      const result = await consumeToken();

      // -1 indicates no token was taken
      expect(result.remaining).to.eq(-1);
      // last_take should not have changed
      expect(parseInt(result.last_take)).to.eq(lastSuccessfulTakeTime);
      expect(parseInt(result.last_take)).to.not.eq(Date.now());
    }
    // Advance enough for 5 refills
    MockDate.set(lastSuccessfulTakeTime + (timePeriod / maxActions) * 5);

    // We should be able to take 5 tokens
    for (let i = 1; i <= 5; i++) {
      const result = await consumeToken();

      expect(result.remaining).to.eq(5 - i);
      expect(parseInt(result.last_take)).to.eq(Date.now());
    }

    lastSuccessfulTakeTime = Date.now();
    {
      // Since we just exhaused the bucket again, this should not consume a
      // token.
      const result = await consumeToken();

      // -1 indicates no token was taken
      expect(result.remaining).to.eq(-1);
      // last_take should not have changed
      expect(parseInt(result.last_take)).to.eq(lastSuccessfulTakeTime);
    }
  });

  step(
    "buckets with unsupported action types can be deleted",
    async function () {
      await consumeRateLimitToken(
        client,
        "UNSUPPORTED",
        "test",
        10,
        ONE_HOUR_MS
      );

      {
        const result = await sqlQuery(
          client,
          "SELECT * FROM rate_limit_buckets WHERE action_type = 'UNSUPPORTED'"
        );
        expect(result.rowCount).to.eq(1);
      }

      await deleteUnsupportedRateLimitBuckets(client, ["SUPPORTED"]);

      {
        const result = await sqlQuery(
          client,
          "SELECT * FROM rate_limit_buckets WHERE action_type = 'UNSUPPORTED'"
        );
        expect(result.rowCount).to.eq(0);
      }
    }
  );
});
