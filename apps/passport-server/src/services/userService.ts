import {
  ConfirmEmailResponseValue,
  PCDpassUserJson,
  ZupassUserJson,
  ZuzaluUserRole
} from "@pcd/passport-interface";
import { Response } from "express";
import {
  CommitmentRow,
  LoggedinPCDpassUser,
  LoggedInZuzaluUser,
  ZuzaluUser
} from "../database/models";
import { fetchCommitment } from "../database/queries/commitments";
import {
  fetchDevconnectDeviceLoginTicket,
  fetchDevconnectSuperusersForEmail
} from "../database/queries/devconnect_pretix_tickets/fetchDevconnectPretixTicket";
import {
  insertCommitment,
  updateCommitmentResetList
} from "../database/queries/saveCommitment";
import {
  fetchAllZuzaluUsers,
  fetchZuzaluUser
} from "../database/queries/zuzalu_pretix_tickets/fetchZuzaluUser";
import { insertZuzaluPretixTicket } from "../database/queries/zuzalu_pretix_tickets/insertZuzaluPretixTicket";
import { PCDHTTPError } from "../routing/pcdHttpError";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";
import { validateEmail } from "../util/util";
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

  public async getZuzaluPassportHolder(
    email: string
  ): Promise<ZuzaluUser | null> {
    return fetchZuzaluUser(this.context.dbPool, email);
  }

  public async getZuzaluTicketHolders(): Promise<Array<ZuzaluUser>> {
    return fetchAllZuzaluUsers(this.context.dbPool);
  }

  public async getSaltByEmail(email: string): Promise<string | null> {
    const user = await this.semaphoreService.getUserByEmail(email);

    if (!user) {
      throw new PCDHTTPError(404, `user ${email} does not exist`);
    }

    return user.salt;
  }

  public async handleSendZuzaluEmail(
    email: string,
    commitment: string,
    force: boolean,
    res: Response
  ): Promise<void> {
    logger(
      `[ZUID] send-login-email ${JSON.stringify({
        email,
        commitment,
        force
      })}`
    );

    if (!validateEmail(email)) {
      throw new PCDHTTPError(400, `'${email}' is not a valid email`);
    }

    const token = await this.emailTokenService.saveNewTokenForEmail(email);

    if (this.bypassEmail) {
      await insertZuzaluPretixTicket(this.context.dbPool, {
        email: email,
        name: "Test User",
        order_id: "",
        role: ZuzaluUserRole.Resident,
        visitor_date_ranges: undefined
      });
    }

    const user = await fetchZuzaluUser(this.context.dbPool, email);

    if (user == null) {
      throw new PCDHTTPError(403, `${email} doesn't have a ticket.`);
    }

    if (user.commitment != null && !force) {
      throw new PCDHTTPError(403, `${email} already registered.`);
    }

    logger(
      `Saved login token for ${
        user.commitment == null ? "NEW" : "EXISTING"
      } email=${email} commitment=${commitment}`
    );

    if (this.bypassEmail) {
      logger("[DEV] Bypassing email, returning token");
      res
        .status(200)
        .json({ devToken: token } satisfies ConfirmEmailResponseValue);
      return;
    }

    logger(`[ZUID] Sending token=${token} to email=${email} name=${user.name}`);
    await this.emailService.sendPretixEmail(email, user.name, token);

    res.sendStatus(200);
  }

  public async handleNewZuzaluUser(
    emailToken: string,
    email: string,
    commitment: string,
    res: Response
  ): Promise<void> {
    logger(
      `[ZUID] new-user ${JSON.stringify({
        emailToken,
        email,
        commitment
      })}`
    );

    const user = await fetchZuzaluUser(this.context.dbPool, email);

    if (user == null) {
      throw new PCDHTTPError(403, `${email} doesn't have a ticket`);
    }

    if (!(await this.emailTokenService.checkTokenCorrect(email, emailToken))) {
      throw new PCDHTTPError(
        403,
        `Wrong token. If you got more than one email, use the latest one.`
      );
    }

    if (user.email !== email) {
      throw new PCDHTTPError(403, `Email mismatch.`);
    }

    const existingUser = await fetchCommitment(this.context.dbPool, email);
    if (existingUser) {
      this.checkAndIncrementAccountRateLimit(existingUser);
    }

    // Save commitment to DB.
    logger(`[ZUID] Saving new commitment: ${commitment}`);
    const uuid = await insertCommitment(this.context.dbPool, {
      email,
      commitment
    });

    // Reload Merkle trees
    await this.semaphoreService.reload();

    const newUser = (await this.semaphoreService.getUserByUUID(
      uuid
    )) as LoggedInZuzaluUser;

    if (newUser == null) {
      throw new PCDHTTPError(404, `user with id '${uuid}' not found`);
    }

    if (newUser.commitment !== commitment) {
      throw new PCDHTTPError(403, `commitment mismatch`);
    }

    logger(`[ZUID] Added new Zuzalu user`, newUser);
    res.status(200).json(newUser satisfies ZupassUserJson);
  }

  /**
   * If the service is not ready, returns a 500 server error.
   * If the user does not exist, returns a 404.
   * Otherwise returns the user.
   */
  public async handleGetZuzaluUser(uuid: string, res: Response): Promise<void> {
    logger(`[ZUID] Fetching user ${uuid}`);

    const user = (await this.semaphoreService.getUserByUUID(
      uuid
    )) as LoggedInZuzaluUser;

    if (!user) {
      throw new PCDHTTPError(404, `no user with id '${uuid}' found`);
    }

    res.status(200).json(user satisfies ZupassUserJson);
  }

  public async handleSendPCDpassEmail(
    email: string,
    commitment: string,
    force: boolean,
    res: Response
  ): Promise<void> {
    logger(
      `[PCDPASS] send-login-email ${JSON.stringify({
        email,
        commitment,
        force
      })}`
    );

    if (!validateEmail(email)) {
      throw new PCDHTTPError(400, `'${email}' is not a valid email`);
    }

    const newEmailToken =
      await this.emailTokenService.saveNewTokenForEmail(email);

    const existingCommitment = await fetchCommitment(
      this.context.dbPool,
      email
    );

    if (existingCommitment != null && !force) {
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

    logger(`[PCDPASS] Sending token=${newEmailToken} to email=${email}`);
    await this.emailService.sendPCDpassEmail(email, newEmailToken);

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
    user: CommitmentRow
  ): Promise<void> {
    if (process.env.ACCOUNT_RESET_RATE_LIMIT_DISABLED === "true") {
      logger("[PCDPASS] account rate limit disabled");
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
    const defaultRateLimitDurationMs = 1000 * 60 * 60 * 24; // default 24 hours
    const defaultRateLimitQuantity = 5; // default max 5 resets (not including 1st time account creation) in 24 hours
    const rateLimitDurationMs = isNaN(configuredRateLimitDurationMs)
      ? defaultRateLimitDurationMs
      : configuredRateLimitDurationMs;
    const rateLimitQuantity = isNaN(configuredAccountResetQuantity)
      ? defaultRateLimitQuantity
      : configuredAccountResetQuantity; // max 4 resets (not including 1st time account creation) in 24 hours

    const parsedTimestamps: number[] = user.account_reset_timestamps.map((t) =>
      new Date(t).getTime()
    );
    parsedTimestamps.push(now);

    const maxAgeTimestamp = now - rateLimitDurationMs;
    const resetsNewerThanMaxAge = parsedTimestamps.filter(
      (t) => t > maxAgeTimestamp
    );
    const newEntryExceedsRateLimit =
      resetsNewerThanMaxAge.length > rateLimitQuantity;

    if (newEntryExceedsRateLimit) {
      await updateCommitmentResetList(
        this.context.dbPool,
        user.email,
        resetsNewerThanMaxAge.map((t) => new Date(t).toISOString())
      );
    } else {
      throw new PCDHTTPError(
        429,
        "You've exceeded the maximum number of account resets." +
          " Please contact passport@0xparc.org for further assistance."
      );
    }
  }

  public async handleNewPCDpassUser(
    token: string,
    email: string,
    commitment: string,
    salt: string,
    res: Response
  ): Promise<void> {
    logger(
      `[PCDPASS] new-user ${JSON.stringify({
        token,
        email,
        commitment
      })}`
    );

    if (!(await this.emailTokenService.checkTokenCorrect(email, token))) {
      throw new PCDHTTPError(
        403,
        `Wrong token. If you got more than one email, use the latest one.`
      );
    }

    const existingUser = await fetchCommitment(this.context.dbPool, email);
    if (existingUser) {
      this.checkAndIncrementAccountRateLimit(existingUser);
    }

    logger(`[PCDPASS] Saving commitment: ${commitment}`);
    await insertCommitment(this.context.dbPool, { email, commitment, salt });

    // Reload Merkle trees
    await this.semaphoreService.reload();

    const commitmentRow = await fetchCommitment(this.context.dbPool, email);
    if (!commitmentRow) {
      throw new PCDHTTPError(403, "no user with that email exists");
    }

    const superuserPrivilages = await fetchDevconnectSuperusersForEmail(
      this.context.dbPool,
      commitmentRow.email
    );

    const pcdpassUser: LoggedinPCDpassUser = {
      ...commitmentRow,
      superuserEventConfigIds: superuserPrivilages.map(
        (s) => s.pretix_events_config_id
      )
    };

    logger(`[PCDPASS] logged in a PCDpass user`, pcdpassUser);
    res.status(200).json(pcdpassUser satisfies PCDpassUserJson);
  }

  /**
   * If the service is not ready, returns a 500 server error.
   * If the user does not exist, returns a 404.
   * Otherwise returns the user.
   */
  public async handleGetPCDpassUser(
    uuid: string,
    res: Response
  ): Promise<void> {
    logger(`[PCDPASS] Fetching user ${uuid}`);

    const user = (await this.semaphoreService.getUserByUUID(
      uuid
    )) as LoggedinPCDpassUser;

    if (!user) {
      throw new PCDHTTPError(404, `no user with uuid '${uuid}'`);
    }

    res.status(200).json(user satisfies PCDpassUserJson);
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

    logger(`[PCDPASS] Saving new commitment: ${commitment}`);
    await insertCommitment(this.context.dbPool, { email, commitment });
    await this.semaphoreService.reload();

    const commitmentRow = await fetchCommitment(this.context.dbPool, email);
    if (!commitmentRow) {
      throw new PCDHTTPError(403, `no user with email '${email}' exists`);
    }

    const superuserPrivilages = await fetchDevconnectSuperusersForEmail(
      this.context.dbPool,
      commitmentRow.email
    );

    const pcdpassUser: LoggedinPCDpassUser = {
      ...commitmentRow,
      superuserEventConfigIds: superuserPrivilages.map(
        (s) => s.pretix_events_config_id
      )
    };

    logger(`[PCDPASS] logged in a device login user`, pcdpassUser);
    res.status(200).json(pcdpassUser satisfies PCDpassUserJson);
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
