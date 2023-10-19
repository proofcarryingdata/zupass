import { HexString } from "@pcd/passport-crypto";
import {
  ConfirmEmailResponseValue,
  GetOfflineTicketsRequest,
  GetOfflineTicketsResponseValue,
  UploadOfflineCheckinsRequest,
  UploadOfflineCheckinsResponseValue,
  ZupassUserJson
} from "@pcd/passport-interface";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { ONE_HOUR_MS } from "@pcd/util";
import { Response } from "express";
import { UserRow } from "../database/models";
import { checkInOfflineTickets } from "../database/multitableQueries/checkInOfflineTickets";
import { fetchOfflineTicketsForChecker } from "../database/multitableQueries/fetchOfflineTickets";
import { fetchDevconnectDeviceLoginTicket } from "../database/queries/devconnect_pretix_tickets/fetchDevconnectPretixTicket";
import {
  updateUserAccountRestTimestamps,
  upsertUser
} from "../database/queries/saveUser";
import { fetchUserByEmail, fetchUserByUUID } from "../database/queries/users";
import { PCDHTTPError } from "../routing/pcdHttpError";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";
import { validateEmail } from "../util/util";
import { userRowToZupassUserJson } from "../util/zuzaluUser";
import { EmailService } from "./emailService";
import { EmailTokenService } from "./emailTokenService";
import { SemaphoreService } from "./semaphoreService";

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

    const newEmailToken = await this.emailTokenService.saveNewTokenForEmail(
      email
    );

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
          " Please contact passport@0xparc.org for further assistance."
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
      encryptionKey
    });

    // Reload Merkle trees
    this.semaphoreService.scheduleReload();

    const user = await fetchUserByEmail(this.context.dbPool, email);
    if (!user) {
      throw new PCDHTTPError(403, "no user with that email exists");
    }

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

  public async handleNewDeviceLogin(
    secret: string,
    email: string,
    commitment: string,
    res: Response
  ): Promise<void> {
    const ticket = await fetchDevconnectDeviceLoginTicket(
      this.context.dbPool,
      email,
      secret
    );

    if (!ticket) {
      throw new PCDHTTPError(
        403,
        `Secret key is not valid, or no such device login exists.`
      );
    }

    logger(`[USER_SERVICE] Saving new commitment: ${commitment}`);
    await upsertUser(this.context.dbPool, { email, commitment });
    this.semaphoreService.scheduleReload();

    const user = await fetchUserByEmail(this.context.dbPool, email);
    if (!user) {
      throw new PCDHTTPError(403, `no user with email '${email}' exists`);
    }

    const userJson = userRowToZupassUserJson(user);

    logger(`[USER_SERVICE] logged in a device login user`, userJson);
    res.status(200).json(userJson satisfies ZupassUserJson);
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

  public async handleGetOfflineTickets(
    req: GetOfflineTicketsRequest,
    res: Response
  ): Promise<void> {
    const signaturePCD = await SemaphoreSignaturePCDPackage.deserialize(
      req.checkerProof.pcd
    );
    const valid = await SemaphoreSignaturePCDPackage.verify(signaturePCD);
    if (!valid) {
      throw new PCDHTTPError(403, "invalid proof");
    }

    const offlineTickets = await fetchOfflineTicketsForChecker(
      this.context.dbPool,
      signaturePCD.claim.identityCommitment
    );

    res.json({
      offlineTickets
    } satisfies GetOfflineTicketsResponseValue);
  }

  public async handleUploadOfflineCheckins(
    req: UploadOfflineCheckinsRequest,
    res: Response
  ): Promise<void> {
    const signaturePCD = await SemaphoreSignaturePCDPackage.deserialize(
      req.checkerProof.pcd
    );
    const valid = await SemaphoreSignaturePCDPackage.verify(signaturePCD);

    if (!valid) {
      throw new PCDHTTPError(403, "invalid proof");
    }

    await checkInOfflineTickets(
      this.context.dbPool,
      signaturePCD.claim.identityCommitment,
      req.offlineTickets
    );

    res.json({} satisfies UploadOfflineCheckinsResponseValue);
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
