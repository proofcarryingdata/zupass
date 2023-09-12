import { User, ZuzaluUserRole } from "@pcd/passport-interface";
import { Response } from "express";
import { LoggedinPCDpassUser, ZuzaluUser } from "../database/models";
import { fetchCommitment } from "../database/queries/commitments";
import {
  fetchDevconnectDeviceLoginTicket,
  fetchDevconnectSuperusersForEmail
} from "../database/queries/devconnect_pretix_tickets/fetchDevconnectPretixTicket";
import { insertCommitment } from "../database/queries/saveCommitment";
import {
  fetchAllZuzaluUsers,
  fetchZuzaluUser
} from "../database/queries/zuzalu_pretix_tickets/fetchZuzaluUser";
import { insertZuzaluPretixTicket } from "../database/queries/zuzalu_pretix_tickets/insertZuzaluPretixTicket";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";
import { validateEmail } from "../util/util";
import { EmailService } from "./emailService";
import { EmailTokenService } from "./emailTokenService";
import { RollbarService } from "./rollbarService";
import { SemaphoreService } from "./semaphoreService";

/**
 * Responsible for high-level user-facing functionality like logging in.
 */
export class UserService {
  private context: ApplicationContext;
  private semaphoreService: SemaphoreService;
  private emailTokenService: EmailTokenService;
  private emailService: EmailService;
  private rollbarService: RollbarService | null;
  private _bypassEmail: boolean;

  public get bypassEmail(): boolean {
    return this._bypassEmail;
  }

  public constructor(
    context: ApplicationContext,
    semaphoreService: SemaphoreService,
    emailTokenService: EmailTokenService,
    emailService: EmailService,
    rollbarService: RollbarService | null
  ) {
    this.context = context;
    this.semaphoreService = semaphoreService;
    this.emailTokenService = emailTokenService;
    this.emailService = emailService;
    this.rollbarService = rollbarService;
    this._bypassEmail =
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
      throw Error("User does not exist");
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
      `[ZUID] send-login-email ${JSON.stringify({ email, commitment, force })}`
    );

    if (!validateEmail(email)) {
      const errMsg = `'${email}' is not a valid email`;
      logger(errMsg);
      res.status(500).send(errMsg);
      return;
    }

    const { dbPool } = this.context;

    const token = await this.emailTokenService.saveNewTokenForEmail(email);

    if (this._bypassEmail) {
      await insertZuzaluPretixTicket(dbPool, {
        email: email,
        name: "Test User",
        order_id: "",
        role: ZuzaluUserRole.Resident,
        visitor_date_ranges: undefined
      });
    }

    const user = await fetchZuzaluUser(dbPool, email);

    if (user == null) {
      const errMsg = `${email} doesn't have a ticket.`;
      logger(errMsg);
      res.status(500).send(errMsg);
      return;
    } else if (user.commitment != null && !force) {
      const errMsg = `${email} already registered.`;
      logger("[ZUID]", errMsg);
      res.status(500).send(errMsg);
      return;
    }
    const stat = user.commitment == null ? "NEW" : "EXISTING";
    logger(
      `Saved login token for ${stat} email=${email} commitment=${commitment}`
    );

    // Send an email with the login token.
    if (this._bypassEmail) {
      logger("[DEV] Bypassing email, returning token");

      res.json({ token });
    } else {
      const { name } = user;
      logger(`[ZUID] Sending token=${token} to email=${email} name=${name}`);
      await this.emailService.sendPretixEmail(email, name, token);

      res.sendStatus(200);
    }
  }

  public async handleNewZuzaluUser(
    emailToken: string,
    email: string,
    commitment: string,
    res: Response
  ): Promise<void> {
    const { dbPool } = this.context;
    logger(
      `[ZUID] new-user ${JSON.stringify({
        emailToken,
        email,
        commitment
      })}`
    );

    try {
      const user = await fetchZuzaluUser(dbPool, email);

      if (user == null) {
        throw new Error(`Ticket for ${email} not found`);
      } else if (
        !(await this.emailTokenService.checkTokenCorrect(email, emailToken))
      ) {
        throw new Error(
          `Wrong token. If you got more than one email, use the latest one.`
        );
      } else if (user.email !== email) {
        throw new Error(`Email mismatch.`);
      }

      // Save commitment to DB.
      logger(`[ZUID] Saving new commitment: ${commitment}`);
      const uuid = await insertCommitment(dbPool, {
        email,
        commitment
      });

      // Reload Merkle trees
      await this.semaphoreService.reload();
      const newUser = await this.semaphoreService.getUserByUUID(uuid);
      if (newUser == null) {
        throw new Error(`${uuid} not found`);
      } else if (newUser.commitment !== commitment) {
        throw new Error(`Commitment mismatch`);
      }

      // Return user, including UUID, back to Passport
      const zuzaluUser = newUser as User;
      const jsonP = JSON.stringify(zuzaluUser);
      logger(`[ZUID] Added new Zuzalu user: ${jsonP}`);

      res.json(zuzaluUser);
    } catch (e: any) {
      logger(e);
      this.rollbarService?.reportError(e);
      res.status(500).send(e.message);
    }
  }

  public async handleGetZuzaluUser(uuid: string, res: Response): Promise<void> {
    logger(`[ZUID] Fetching user ${uuid}`);
    const user = await this.semaphoreService.getUserByUUID(uuid);
    if (!user) res.status(404);
    res.json(user || null);
  }

  public async handleSendPCDpassEmail(
    email: string,
    commitment: string,
    force: boolean,
    res: Response
  ): Promise<void> {
    logger(
      `[ZUID] send-login-email ${JSON.stringify({ email, commitment, force })}`
    );

    const devBypassEmail =
      process.env.BYPASS_EMAIL_REGISTRATION === "true" &&
      process.env.NODE_ENV !== "production";

    if (!validateEmail(email)) {
      const errMsg = `'${email}' is not a valid email`;
      logger(errMsg);
      res.status(500).send(errMsg);
      return;
    }

    const token = await this.emailTokenService.saveNewTokenForEmail(email);

    const existingCommitment = await fetchCommitment(
      this.context.dbPool,
      email
    );

    if (existingCommitment != null && !force) {
      res.status(500).send(`${email} already registered.`);
      return;
    }

    logger(
      `Saved login token for ${
        existingCommitment === null ? "NEW" : "EXISTING"
      } email=${email} commitment=${commitment}`
    );

    // Send an email with the login token.
    if (devBypassEmail) {
      logger("[DEV] Bypassing email, returning token");
      res.json({ token });
    } else {
      logger(`[ZUID] Sending token=${token} to email=${email}`);
      await this.emailService.sendPCDpassEmail(email, token);
      res.sendStatus(200);
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
      `[ZUID] new-user ${JSON.stringify({
        token,
        email,
        commitment
      })}`
    );

    try {
      if (!(await this.emailTokenService.checkTokenCorrect(email, token))) {
        throw new Error(
          `Wrong token. If you got more than one email, use the latest one.`
        );
      }

      // Save commitment to DB.
      logger(`[ZUID] Saving new commitment: ${commitment}`);
      await insertCommitment(this.context.dbPool, { email, commitment, salt });

      // Reload Merkle trees
      await this.semaphoreService.reload();

      // Return user, including UUID, back to Passport
      const commitmentRow = await fetchCommitment(this.context.dbPool, email);

      if (!commitmentRow) {
        throw new Error("no user with that email exists");
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

      const jsonP = JSON.stringify(pcdpassUser);
      logger(`[ZUID] logged in a PCDpass user: ${jsonP}`);
      res.json(pcdpassUser);
    } catch (e) {
      logger(e);
      this.rollbarService?.reportError(e);
      res.sendStatus(500);
    }
  }

  public async handleGetPCDpassUser(
    uuid: string,
    res: Response
  ): Promise<void> {
    logger(`[ZUID] Fetching user ${uuid}`);
    const user = await this.semaphoreService.getUserByUUID(uuid);
    if (!user) res.status(404);
    res.json(user || null);
  }

  public async handleNewDeviceLogin(
    secret: string,
    email: string,
    commitment: string,
    res: Response
  ): Promise<void> {
    try {
      const ticket = await fetchDevconnectDeviceLoginTicket(
        this.context.dbPool,
        email,
        secret
      );

      if (!ticket) {
        const err = `Secret key is not valid, or no such device login exists.`;
        logger(err);
        this.rollbarService?.reportError(err);
        res.status(500).send(err);
        return;
      }

      logger(`[ZUID] Saving new commitment: ${commitment}`);
      await insertCommitment(this.context.dbPool, { email, commitment });

      // Reload Merkle trees
      await this.semaphoreService.reload();

      // Return user, including UUID, back to Passport
      const commitmentRow = await fetchCommitment(this.context.dbPool, email);

      if (!commitmentRow) {
        throw new Error("no user with that email exists");
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

      const jsonP = JSON.stringify(pcdpassUser);
      logger(`[ZUID] logged in a device login user: ${jsonP}`);
      res.json(pcdpassUser);
    } catch (e) {
      logger(e);
      this.rollbarService?.reportError(e);
      res.sendStatus(500);
    }
  }
}

export function startUserService(
  context: ApplicationContext,
  semaphoreService: SemaphoreService,
  emailTokenService: EmailTokenService,
  emailService: EmailService,
  rollbarService: RollbarService | null
): UserService {
  const userService = new UserService(
    context,
    semaphoreService,
    emailTokenService,
    emailService,
    rollbarService
  );
  return userService;
}
