import { User, ZuzaluUserRole } from "@pcd/passport-interface";
import { Response } from "express";
import { ZuzaluUser } from "../database/models";
import { fetchCommitment } from "../database/queries/commitments";
import { insertCommitment } from "../database/queries/saveCommitment";
import {
  fetchAllZuzaluUsers,
  fetchZuzaluUser,
} from "../database/queries/zuzalu_pretix_tickets/fetchZuzaluUser";
import { insertZuzaluPretixTicket } from "../database/queries/zuzalu_pretix_tickets/insertZuzaluPretixTicket";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";
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

  public async handleSendZuzaluEmail(
    email: string,
    commitment: string,
    force: boolean,
    res: Response
  ): Promise<void> {
    logger(
      `[ZUID] send-login-email ${JSON.stringify({ email, commitment, force })}`
    );

    const { dbPool } = this.context;

    const token = await this.emailTokenService.saveNewTokenForEmail(email);

    if (this._bypassEmail) {
      await insertZuzaluPretixTicket(dbPool, {
        email: email,
        name: "Test User",
        order_id: "",
        role: ZuzaluUserRole.Resident,
        visitor_date_ranges: undefined,
      });
    }

    const user = await fetchZuzaluUser(dbPool, email);

    if (user == null) {
      throw new Error(`${email} doesn't have a ticket.`);
    } else if (
      user.commitment != null &&
      user.commitment !== commitment &&
      !force
    ) {
      res.status(500).send(`${email} already registered.`);
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
        commitment,
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
        commitment,
      });

      // Reload Merkle trees
      await this.semaphoreService.reload();
      const newUser = this.semaphoreService.getUserByUUID(uuid);
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
      res.sendStatus(500);
    }
  }

  public async handleGetZuzaluUser(uuid: string, res: Response): Promise<void> {
    logger(`[ZUID] Fetching user ${uuid}`);
    const user = this.semaphoreService.getUserByUUID(uuid);
    if (!user) res.status(404);
    res.json(user || null);
  }

  public async handleSendPcdPassEmail(
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
      await this.emailService.sendPCDPassEmail(email, token);
      res.sendStatus(200);
    }
  }

  public async handleNewPcdPassUser(
    token: string,
    email: string,
    commitment: string,
    res: Response
  ): Promise<void> {
    logger(
      `[ZUID] new-user ${JSON.stringify({
        token,
        email,
        commitment,
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
      await insertCommitment(this.context.dbPool, { email, commitment });

      // Reload Merkle trees
      await this.semaphoreService.reload();

      // Return user, including UUID, back to Passport
      const newUser = await fetchCommitment(this.context.dbPool, email);
      const jsonP = JSON.stringify(newUser);
      logger(`[ZUID] logged in a zuzalu user: ${jsonP}`);

      res.json(newUser);
    } catch (e) {
      logger(e);
      this.rollbarService?.reportError(e);
      res.sendStatus(500);
    }
  }

  public async handleGetPcdPassUser(
    uuid: string,
    res: Response
  ): Promise<void> {
    logger(`[ZUID] Fetching user ${uuid}`);
    res.setHeader("Access-Control-Allow-Origin", "*");
    const user = this.semaphoreService.getUserByUUID(uuid);
    if (!user) res.status(404);
    res.json(user || null);
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
