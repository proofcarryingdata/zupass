import { ONE_HOUR_MS } from "@pcd/util";
import {
  checkRateLimit,
  clearExpiredActions
} from "../database/queries/rateLimit";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";
import { traced } from "./telemetryService";

export type RateLimitedActionType = "CHECK_EMAIL_TOKEN" | "REQUEST_EMAIL_TOKEN";

export class RateLimitService {
  private readonly context: ApplicationContext;
  private timeout: NodeJS.Timeout;

  public constructor(context: ApplicationContext) {
    this.context = context;
    this.timeout = setTimeout(() => {
      // Every hour, clear out any expired actions from the DB.
      (async (): Promise<void> =>
        await clearExpiredActions(this.context.dbPool))();
    }, ONE_HOUR_MS);
  }

  public stop(): void {
    clearTimeout(this.timeout);
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
   * Rate limit types are defined in the database, and new ones are created by
   * adding their type to the `RateLimitedActionType` union type, and by
   * inserting a record into the DB in a migration.
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
        const result = checkRateLimit(
          this.context.dbPool,
          actionType,
          actionId
        );

        if (!result) {
          logger(
            `[RATELIMIT] Action "${actionId}" of type "${actionType}" was rate-limited`
          );
        }

        return result;
      }
    );
  }
}

export function startRateLimitService(
  context: ApplicationContext
): RateLimitService {
  return new RateLimitService(context);
}
