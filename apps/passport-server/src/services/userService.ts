import { HexString } from "@pcd/passport-crypto";
import {
  AgreeTermsResult,
  ConfirmEmailResponseValue,
  LATEST_PRIVACY_NOTICE,
  UNREDACT_TICKETS_TERMS_VERSION,
  ZupassUserJson
} from "@pcd/passport-interface";
import { SerializedPCD } from "@pcd/pcd-types";
import {
  SemaphoreSignaturePCD,
  SemaphoreSignaturePCDPackage
} from "@pcd/semaphore-signature-pcd";
import { ONE_HOUR_MS, ZUPASS_SUPPORT_EMAIL } from "@pcd/util";
import { Response } from "express";
import { z } from "zod";
import { UserRow } from "../database/models";
import { agreeTermsAndUnredactTickets } from "../database/queries/devconnect_pretix_tickets/devconnectPretixRedactedTickets";
import { checkRateLimit } from "../database/queries/rateLimit";
import {
  updateUserAccountRestTimestamps,
  upsertUser
} from "../database/queries/saveUser";
import {
  fetchUserByCommitment,
  fetchUserByEmail,
  fetchUserByUUID
} from "../database/queries/users";
import { PCDHTTPError } from "../routing/pcdHttpError";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";
import { validateEmail } from "../util/util";
import { userRowToZupassUserJson } from "../util/zuzaluUser";
import { EmailService } from "./emailService";
import { EmailTokenService } from "./emailTokenService";
import { SemaphoreService } from "./semaphoreService";

const AgreedTermsSchema = z.object({
  version: z.number().max(LATEST_PRIVACY_NOTICE)
});

/**
 * Responsible for high-level user-facing functionality like logging in.
 */
export class UserService {
  public readonly bypassEmail: boolean;
  private readonly context: ApplicationContext;
  private readonly semaphoreService: SemaphoreService;
  private readonly emailTokenService: EmailTokenService;
  private readonly emailService: EmailService;

  public constructor(
    context: ApplicationContext,
    semaphoreService: SemaphoreService,
    emailTokenService: EmailTokenService,
    emailService: EmailService
  ) {
    this.context = context;
    this.semaphoreService = semaphoreService;
    this.emailTokenService = emailTokenService;
    this.emailService = emailService;
    this.bypassEmail =
      process.env.BYPASS_EMAIL_REGISTRATION === "true" &&
      process.env.NODE_ENV !== "production";
  }

  public async getSaltByEmail(email: string): Promise<string | null> {
    const user = await this.getUserByEmail(email);

    if (!user) {
      throw new PCDHTTPError(404, `user ${email} does not exist`);
    }

    return user.salt;
  }

  /**
   * Returns the encryption key for a given user, if it is stored on
   * our server. Returns null if the user does not exist, or if
   * the user does not have an encryption key stored on the server.
   */
  public async getEncryptionKeyForUser(
    email: string
  ): Promise<HexString | null> {
    const existingUser = await fetchUserByEmail(this.context.dbPool, email);
    return existingUser?.encryption_key ?? null;
  }

  public async handleSendTokenEmail(
    email: string,
    commitment: string,
    force: boolean,
    res: Response
  ): Promise<void> {
    logger(
      `[USER_SERVICE] send-token-email ${JSON.stringify({
        email,
        commitment,
        force
      })}`
    );

    if (!validateEmail(email)) {
      throw new PCDHTTPError(400, `'${email}' is not a valid email`);
    }

    if (
      !(await checkRateLimit(this.context.dbPool, "REQUEST_EMAIL_TOKEN", email))
    ) {
      throw new PCDHTTPError(401, "Too many attempts. Come back later.");
    }

    const newEmailToken =
      await this.emailTokenService.saveNewTokenForEmail(email);

    const existingCommitment = await fetchUserByEmail(
      this.context.dbPool,
      email
    );

    if (
      existingCommitment != null &&
      !force &&
      // Users with an `encryption_key` do not have a password,
      // so we will need to verify email ownership with code.
      !existingCommitment.encryption_key
    ) {
      throw new PCDHTTPError(403, `'${email}' already registered`);
    }

    logger(
      `Saved login token for ${
        existingCommitment === null ? "NEW" : "EXISTING"
      } email=${email} commitment=${commitment}`
    );

    if (this.bypassEmail) {
      logger("[DEV] Bypassing email, returning token");
      res.status(200).json({
        devToken: newEmailToken
      } satisfies ConfirmEmailResponseValue);
      return;
    }

    logger(`[USER_SERVICE] Sending token=${newEmailToken} to email=${email}`);
    await this.emailService.sendTokenEmail(email, newEmailToken);

    res.sendStatus(200);
  }

  /**
   * Checks whether allowing a user to reset their account one more time
   * would cause them to exceed the account reset rate limit. If it does,
   * throws an error. If it doesn't, saves this account reset timestamp
   * to the database and proceeds. Can only be called on users that have
   * already created an account.
   */
  private async checkAndIncrementAccountRateLimit(
    user: UserRow
  ): Promise<void> {
    if (process.env.ACCOUNT_RESET_RATE_LIMIT_DISABLED === "true") {
      logger("[USER_SERVICE] account rate limit disabled");
      return;
    }

    const now = Date.now();
    const configuredRateLimitDurationMs = parseInt(
      process.env.ACCOUNT_RESET_LIMIT_DURATION_MS ?? "",
      10
    );
    const configuredAccountResetQuantity = parseInt(
      process.env.ACCOUNT_RESET_LIMIT_QUANTITY ?? "",
      10
    );
    const defaultRateLimitDurationMs = ONE_HOUR_MS * 24; // default 24 hours
    const defaultRateLimitQuantity = 5; // default max 5 resets (not including 1st time account creation) in 24 hours
    const rateLimitDurationMs = isNaN(configuredRateLimitDurationMs)
      ? defaultRateLimitDurationMs
      : configuredRateLimitDurationMs;
    const rateLimitQuantity = isNaN(configuredAccountResetQuantity)
      ? defaultRateLimitQuantity
      : configuredAccountResetQuantity;

    const parsedTimestamps: number[] = user.account_reset_timestamps.map((t) =>
      new Date(t).getTime()
    );

    parsedTimestamps.push(now);

    const maxAgeTimestamp = now - rateLimitDurationMs;
    const resetsNewerThanMaxAge = parsedTimestamps.filter(
      (t) => t > maxAgeTimestamp
    );
    const exceedsRateLimit = resetsNewerThanMaxAge.length > rateLimitQuantity;

    if (exceedsRateLimit) {
      throw new PCDHTTPError(
        429,
        "You've exceeded the maximum number of account resets." +
          ` Please contact ${ZUPASS_SUPPORT_EMAIL} for further assistance.`
      );
    }

    await updateUserAccountRestTimestamps(
      this.context.dbPool,
      user.email,
      resetsNewerThanMaxAge.map((t) => new Date(t).toISOString())
    );
  }

  public async handleNewUser(
    token: string,
    email: string,
    commitment: string,
    salt: string | undefined,
    encryptionKey: string | undefined,
    res: Response
  ): Promise<void> {
    logger(
      `[USER_SERVICE] new-user ${JSON.stringify({
        token,
        email,
        commitment
      })}`
    );

    if ((!salt && !encryptionKey) || (salt && encryptionKey)) {
      throw new PCDHTTPError(
        400,
        "Must have exactly either salt or encryptionKey, but not both or none."
      );
    }

    if (!(await this.emailTokenService.checkTokenCorrect(email, token))) {
      throw new PCDHTTPError(
        403,
        `Wrong token. If you got more than one email, use the latest one.`
      );
    }

    const existingUser = await fetchUserByEmail(this.context.dbPool, email);
    if (existingUser) {
      await this.checkAndIncrementAccountRateLimit(existingUser);
    }

    await this.emailTokenService.saveNewTokenForEmail(email);

    logger(`[USER_SERVICE] Saving commitment: ${commitment}`);
    await upsertUser(this.context.dbPool, {
      email,
      commitment,
      salt,
      encryptionKey,
      // If the user already exists, then they're accessing this via the
      // "forgot password" flow, and not the registration flow in which they
      // are prompted to agree to the latest legal terms. In this case,
      // preserve whichever version they already agreed to.
      terms_agreed: existingUser
        ? existingUser.terms_agreed
        : LATEST_PRIVACY_NOTICE
    });

    // Reload Merkle trees
    this.semaphoreService.scheduleReload();

    const user = await fetchUserByEmail(this.context.dbPool, email);
    if (!user) {
      throw new PCDHTTPError(403, "no user with that email exists");
    }

    // Slightly redundantly, this will set the "terms agreed" again
    // However, having a single canonical transaction for this seems like
    // a benefit
    logger(`[USER_SERVICE] Unredacting tickets for email`, user.email);
    await agreeTermsAndUnredactTickets(
      this.context.dbPool,
      user.email,
      LATEST_PRIVACY_NOTICE
    );

    const userJson = userRowToZupassUserJson(user);

    logger(`[USER_SERVICE] logged in a user`, userJson);
    res.status(200).json(userJson satisfies ZupassUserJson);
  }

  /**
   * If the service is not ready, returns a 500 server error.
   * If the user does not exist, returns a 404.
   * Otherwise returns the user.
   */
  public async handleGetUser(uuid: string, res: Response): Promise<void> {
    logger(`[USER_SERVICE] Fetching user ${uuid}`);

    const user = await this.getUserByUUID(uuid);

    if (!user) {
      throw new PCDHTTPError(410, `no user with uuid '${uuid}'`);
    }

    const userJson = userRowToZupassUserJson(user);

    res.status(200).json(userJson);
  }

  /**
   * Returns either the user, or null if no user with the given uuid can be found.
   */
  public async getUserByUUID(uuid: string): Promise<UserRow | null> {
    const user = await fetchUserByUUID(this.context.dbPool, uuid);

    if (!user) {
      logger("[SEMA] no user with that email exists");
      return null;
    }
    return user;
  }

  /**
   * Gets a user by email address, or null if no user with that email exists.
   */
  public async getUserByEmail(email: string): Promise<UserRow | null> {
    const user = await fetchUserByEmail(this.context.dbPool, email);

    if (!user) {
      logger("[SEMA] no user with that email exists");
      return null;
    }

    return user;
  }

  /**
   * Updates the version of the legal terms the user agrees to
   */
  public async handleAgreeTerms(
    serializedPCD: SerializedPCD<SemaphoreSignaturePCD>
  ): Promise<AgreeTermsResult> {
    const pcd = await SemaphoreSignaturePCDPackage.deserialize(
      serializedPCD.pcd
    );
    if (!(await SemaphoreSignaturePCDPackage.verify(pcd))) {
      return {
        success: false,
        error: "Invalid signature"
      };
    }

    const parsedPayload = AgreedTermsSchema.safeParse(
      JSON.parse(pcd.claim.signedMessage)
    );

    if (!parsedPayload.success) {
      return {
        success: false,
        error: "Invalid terms specified"
      };
    }

    const payload = parsedPayload.data;
    const user = await fetchUserByCommitment(
      this.context.dbPool,
      pcd.claim.identityCommitment
    );
    if (!user) {
      return {
        success: false,
        error: "User does not exist"
      };
    }

    // If the user hasn't already agreed to have their tickets unredacted,
    // do it now
    if (
      payload.version >= UNREDACT_TICKETS_TERMS_VERSION &&
      user.terms_agreed < UNREDACT_TICKETS_TERMS_VERSION
    ) {
      logger(
        `[USER_SERVICE] Unredacting tickets for email due to accepting version ${payload.version} of legal terms`,
        user.email
      );
      await agreeTermsAndUnredactTickets(
        this.context.dbPool,
        user.email,
        payload.version
      );
    } else {
      logger(
        `[USER_SERVICE] Updating user to version ${payload.version} of legal terms`,
        user.email
      );
      await upsertUser(this.context.dbPool, {
        ...user,
        terms_agreed: payload.version
      });
    }

    return {
      success: true,
      value: { version: payload.version }
    };
  }
}

export function startUserService(
  context: ApplicationContext,
  semaphoreService: SemaphoreService,
  emailTokenService: EmailTokenService,
  emailService: EmailService
): UserService {
  return new UserService(
    context,
    semaphoreService,
    emailTokenService,
    emailService
  );
}
