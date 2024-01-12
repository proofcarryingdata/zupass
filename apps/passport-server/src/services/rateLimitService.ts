import { ONE_DAY_MS, ONE_HOUR_MS } from "@pcd/util";
import _ from "lodash";
import { RateLimitBucketDB } from "../database/models";
import {
  deleteRateLimitBuckets,
  fetchRateLimitBuckets,
  saveRateLimitBucket
} from "../database/queries/rateLimit";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";
import { RollbarService } from "./rollbarService";
import { traced } from "./telemetryService";

// Types of actions a user might attempt.
export type RateLimitedActionType =
  | "CHECK_EMAIL_TOKEN"
  | "REQUEST_EMAIL_TOKEN"
  | "ACCOUNT_RESET";

// An "action ID" is a unique identifier for related attempts to perform the
// same action type. For account resets this is the account UUID, and for
// email token requests it's the email address the token would be sent to.
type RateLimitedActionId = string;

// When attempting an action, we mostly care about whether the action was
// allowed or not.
// However, we also care about whether the bucket changed, because this tells
// us whether we need to save the bucket state to the DB.
// The case where the bucket does not change is one where remaining attempts
// is already zero, and so each further attempt does not cause the counter to
// decrement further.
interface RateLimitResult {
  allowed: boolean;
  bucketChanged: boolean;
}

interface RateLimitConfiguration {
  // How many attempts can be made?
  maxAttempts: number;
  // Within a time period, given in milliseconds
  timePeriodMs: number;
}

interface RateLimitBucket {
  // When this reaches zero, future attempts will be denied
  attemptsRemaining: number;
  // At this time or later, the rate limit bucket has expired and should be
  // deleted or reset
  expiryTime: number;
}

/**
 * For each action we want to rate-limit, we have a RateLimitTracker.
 * It is responsible for maintaining a number of "buckets" which track how many
 * attempts are allowed for a given "action ID".
 * There is one RateLimitTracker for each "action type".
 */
class RateLimitTracker {
  private buckets: Map<string, RateLimitBucket>;
  private config: RateLimitConfiguration;

  public constructor(
    config: RateLimitConfiguration,
    buckets: Map<string, RateLimitBucket>
  ) {
    this.config = config;
    this.buckets = buckets;
  }

  // Delete any rate limit trackers that have expired.
  public prune(): RateLimitedActionId[] {
    const now = Date.now();
    const prunedBuckets = [];

    for (const [id, bucket] of this.buckets.entries()) {
      const expired = now >= bucket.expiryTime;
      if (expired) {
        this.buckets.delete(id);
        prunedBuckets.push(id);
      }
    }

    return prunedBuckets;
  }

  public getBucket(actionId: RateLimitedActionId): RateLimitBucket | undefined {
    return this.buckets.get(actionId);
  }

  /**
   * Request permission to perform an action.
   * The result will state whether the action was allowed, and whether the
   * state of the rate limit bucket has changed due to the request (in which
   * case the RateLimitService ought to persist the change to the DB).
   * This function in synchronous and therefore should not suffer from race
   * conditions.
   */
  public requestAttempt(id: string): RateLimitResult {
    const now = Date.now();
    let bucket = this.buckets.get(id);
    let bucketChanged = false;

    // If we haven't had a recent attempt at this action, set up default bucket
    // Also set up a new bucket if the previous one has expired
    if (bucket === undefined || bucket.expiryTime <= now) {
      bucket = {
        attemptsRemaining: this.config.maxAttempts,
        expiryTime: now + this.config.timePeriodMs
      };
      this.buckets.set(id, bucket);
      bucketChanged = true;
    }

    let allowed = false;

    if (bucket.attemptsRemaining > 0) {
      bucket.attemptsRemaining--;
      allowed = true;
      bucketChanged = true;
    }

    return { allowed, bucketChanged };
  }
}

export class RateLimitService {
  private readonly context: ApplicationContext;
  private timeout: NodeJS.Timeout | undefined;
  private readonly rollbarService: RollbarService | null;
  private disabled: boolean;
  private trackers: Map<RateLimitedActionType, RateLimitTracker>;

  public constructor(
    context: ApplicationContext,
    rollbarService: RollbarService | null,
    disabled: boolean
  ) {
    this.context = context;
    this.rollbarService = rollbarService;
    this.disabled = disabled;
    this.trackers = new Map();
  }

  public async start(): Promise<void> {
    if (this.disabled) {
      return;
    }

    // Load bucket data from the DB, and initialize the rate limit trackers for
    // each rate limit type.

    const allBuckets = await fetchRateLimitBuckets(this.context.dbPool);
    const bucketsByType = _.groupBy(allBuckets, "action_type");
    const bucketRecordToMapEntry = (
      bucket: RateLimitBucketDB
    ): [RateLimitedActionId, RateLimitBucket] => {
      return [
        bucket.action_id,
        {
          attemptsRemaining: bucket.remaining,
          expiryTime: bucket.expiry_time.getTime()
        }
      ];
    };

    // Set up trackers for each action type. Use the bucket state loaded from
    // the DB, if any, to initialize the trackers.
    this.trackers.set(
      "CHECK_EMAIL_TOKEN",
      new RateLimitTracker(
        {
          maxAttempts: 10,
          timePeriodMs: ONE_HOUR_MS
        },
        new Map(
          // There might not have been any bucket state in the DB, hence the
          // null coalescing operator.
          (bucketsByType["CHECK_EMAIL_TOKEN"] ?? []).map(bucketRecordToMapEntry)
        )
      )
    );

    this.trackers.set(
      "REQUEST_EMAIL_TOKEN",
      new RateLimitTracker(
        {
          maxAttempts: 10,
          timePeriodMs: ONE_HOUR_MS
        },
        new Map(
          (bucketsByType["REQUEST_EMAIL_TOKEN"] ?? []).map(
            bucketRecordToMapEntry
          )
        )
      )
    );

    this.trackers.set(
      "ACCOUNT_RESET",
      new RateLimitTracker(
        {
          maxAttempts: 5,
          timePeriodMs: ONE_DAY_MS
        },
        new Map(
          (bucketsByType["ACCOUNT_RESET"] ?? []).map(bucketRecordToMapEntry)
        )
      )
    );

    this.timeout = setTimeout(() => {
      // Every hour, clear out any expired buckets from the DB.
      (async (): Promise<void> => await this.pruneBuckets())();
    }, ONE_HOUR_MS);
  }

  public stop(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    this.trackers = new Map();
  }

  /**
   * Requests permission to perform a rate-limited action, returning a
   * boolean to indicate whether permission is granted. If the action is
   * permitted then the rate-limit count will be incremented.
   *
   * Rate limits apply to actions and identifiers. The limit on number of
   * actions per hour can vary per action type. Limits on actions are applied
   * to type-id pairs. For example, the REQUEST_EMAIL_TOKEN action might be
   * allowed up to 10 times per hour for a given identifier. In this case the
   * identifier would be the email address, meaning that a maximum of 10 token
   * requests per hour would be served for a given email address.
   *
   * In other cases, the identifier could be something like a user ID, IP
   * address, or other means of categorizing requests.
   *
   * @param actionType The type of action being requested permission for
   * @param actionId The unique identifier of the action being requested
   * @returns Whether or not to permit the action
   */
  public async requestRateLimitedAction(
    actionType: RateLimitedActionType,
    actionId: string
  ): Promise<boolean> {
    return traced(
      "RateLimitService",
      "requestRateLimitedAction",
      async (span) => {
        span?.setAttribute("actionType", actionType);
        span?.setAttribute("actionId", actionId);

        if (this.disabled) {
          span?.setAttribute("rateLimitCheckDisabled", true);
          return true;
        }

        const tracker = this.trackers.get(actionType);

        if (!tracker) {
          throw new Error(
            `Tracker for rate limit type "${actionType}" does not exist.`
          );
        }

        const result = tracker.requestAttempt(actionId);

        // If this attempt caused the bucket to change, persist it to the DB
        // Not all requests cause a change: if the remaining attempts counter
        // is already zero, then nothing changed and we do not need to persist
        // anything. Eliminating DB writes in cases where the user is already
        // over their action limit is also a minor mitigation of denial of
        // service attacks.
        if (result.bucketChanged) {
          const bucket = tracker.getBucket(actionId);
          // In practice this will never be undefined, but TypeScript can't
          // infer this from the logic.
          if (bucket) {
            await this.saveBucket(actionType, actionId, bucket);
          }
        }

        if (!result.allowed) {
          logger(
            `[RATELIMIT] Action "${actionId}" of type "${actionType}" was rate-limited`
          );
          this.rollbarService?.reportError(
            new Error(
              `Action "${actionId}" of type "${actionType}" was rate-limited`
            )
          );
        }

        return result.allowed;
      }
    );
  }

  /**
   * Delete expired rate-limiting buckets from the DB.
   */
  private async pruneBuckets(): Promise<void> {
    for (const [actionType, tracker] of this.trackers.entries()) {
      const prunedIds = tracker.prune();
      if (prunedIds.length > 0) {
        await deleteRateLimitBuckets(
          this.context.dbPool,
          actionType,
          prunedIds
        );
      }
    }
  }

  /**
   * Save a rate limiting bucket after its state has changed.
   */
  private async saveBucket(
    actionType: RateLimitedActionType,
    actionId: RateLimitedActionId,
    bucket: RateLimitBucket
  ): Promise<void> {
    await saveRateLimitBucket(
      this.context.dbPool,
      actionType,
      actionId,
      bucket.attemptsRemaining,
      bucket.expiryTime
    );
  }
}

export async function startRateLimitService(
  context: ApplicationContext,
  rollbarService: RollbarService | null
): Promise<RateLimitService> {
  const service = new RateLimitService(
    context,
    rollbarService,
    process.env.GENERIC_RATE_LIMIT_DISABLED === "true"
  );

  await service.start();

  return service;
}
