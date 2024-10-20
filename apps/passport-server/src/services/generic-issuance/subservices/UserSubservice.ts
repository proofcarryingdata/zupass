import { GenericIssuanceSendEmailResponseValue } from "@pcd/passport-interface";
import { normalizeEmail } from "@pcd/util";
import { Request } from "express";
import { PoolClient } from "postgres-pool";
import { Client, Session } from "stytch";
import {
  IPipelineUserDB,
  PipelineUserDB
} from "../../../database/queries/pipelineUserDB";
import { sqlTransaction } from "../../../database/sqlQuery";
import { PCDHTTPError } from "../../../routing/pcdHttpError";
import { ApplicationContext } from "../../../types";
import { logger } from "../../../util/logger";
import { setError, traced } from "../../telemetryService";
import { traceUser } from "../honeycombQueries";
import { PipelineUser } from "../pipelines/types";

const SERVICE_NAME = "GI_USER_SUBSERVICE";
const LOG_TAG = `[${SERVICE_NAME}]`;

/**
 * Encapsulates functionality related to users of Podbox.
 */
export class UserSubservice {
  private context: ApplicationContext;
  private pipelineUserDB: IPipelineUserDB;
  private stytchClient: Client | undefined;
  private genericIssuanceClientUrl: string;

  public constructor(
    context: ApplicationContext,
    stytchClient: Client | undefined,
    genericIssuanceClientUrl: string
  ) {
    this.context = context;
    this.pipelineUserDB = new PipelineUserDB();
    this.stytchClient = stytchClient;
    this.genericIssuanceClientUrl = genericIssuanceClientUrl;
  }

  /**
   * Should be called immediately after instantiation.
   */
  public async start(): Promise<void> {
    await sqlTransaction(this.context.dbPool, (client) =>
      this.maybeSetupAdmins(client)
    );
  }

  /**
   * Gets the user identified by the normalized version of the given @param email.
   * If one doesn't exist, creates one.
   */
  public async getOrCreateUser(
    client: PoolClient,
    email: string
  ): Promise<PipelineUser> {
    return traced(SERVICE_NAME, "getOrCreateUser", async () => {
      return this.pipelineUserDB.getOrCreateUser(client, email);
    });
  }

  /**
   * Gets the user identified by the given @param id.
   */
  public async getUserById(
    client: PoolClient,
    id: string | undefined
  ): Promise<PipelineUser | undefined> {
    if (id === undefined) {
      return undefined;
    }

    return this.pipelineUserDB.getUserById(client, id);
  }

  /**
   * Given an express.js {@link Request}, either gets/creates a {@link PipelineUser}
   * corresponding to the email the user making the request has successfully logged into
   * Podbox to via Stytch, or @throws if the user has not logged in.
   *
   * Used to protect sensitive routes in the Podbox API (see `genericIssuanceRoutes.ts`).
   */
  public async authSession(
    client: PoolClient,
    req: Request
  ): Promise<PipelineUser> {
    return traced(SERVICE_NAME, "authSession", async (span) => {
      const reqBody = req?.body;
      const jwt = reqBody?.jwt;

      try {
        span?.setAttribute("has_jwt", !!jwt);

        // 1) make sure environment has been configured properly
        //    i.e. if stytch is missing, we MUST be in development
        if (!this.stytchClient && process.env.NODE_ENV === "production") {
          throw new Error("expected to have stytch client in production ");
        }

        // 2) if we have a stytch client - check the user's JWT's session
        if (this.stytchClient) {
          const { session } = await this.stytchClient.sessions.authenticateJwt({
            session_jwt: jwt
          });
          const email = this.getEmailFromSession(session);
          const user = await this.getOrCreateUser(client, email);
          traceUser(user);
          return user;
        } else {
          // 3) if we don't have a stytch client, and that's a valid state,
          //    treats a jwt whose contents is some string with just an email
          //    address in it as a valid JWT authenticate the requester to be
          //    logged in as a new or existing user with the given email address
          const user = await this.getOrCreateUser(client, jwt);
          traceUser(user);
          return user;
        }
      } catch (e) {
        logger(LOG_TAG, "failed to authenticate stytch session", jwt, e);
        throw new PCDHTTPError(401);
      }
    });
  }

  /**
   * A user can log into Podbox by clicking a confirmation link sent to them in
   * an email by stytch, after inputting their email address and clicking 'login'
   * on the Podbox login page, which is what is rendered to visitors of Podbox if
   * they are not logged in.
   */
  public async sendLoginEmail(
    email: string
  ): Promise<GenericIssuanceSendEmailResponseValue> {
    return traced(SERVICE_NAME, "sendLoginEmail", async (span) => {
      const normalizedEmail = normalizeEmail(email);
      logger(LOG_TAG, "sendLoginEmail", normalizedEmail);
      span?.setAttribute("email", normalizedEmail);

      if (!this.stytchClient) {
        span?.setAttribute("bypass", true);

        if (process.env.NODE_ENV === "production") {
          throw new Error(LOG_TAG + " missing stytch client");
        }

        if (process.env.STYTCH_BYPASS !== "true") {
          throw new Error(LOG_TAG + " missing stytch client");
        }

        // sending email with STYTCH_BYPASS enabled is a no-op case
        return undefined;
      } else {
        try {
          await this.stytchClient.magicLinks.email.loginOrCreate({
            email: normalizedEmail,
            login_magic_link_url: this.genericIssuanceClientUrl,
            login_expiration_minutes: 10,
            signup_magic_link_url: this.genericIssuanceClientUrl,
            signup_expiration_minutes: 10
          });
          logger(LOG_TAG, "sendLoginEmail success", normalizedEmail);
        } catch (e) {
          setError(e, span);
          logger(LOG_TAG, `failed to send login email to ${normalizeEmail}`, e);
          throw new PCDHTTPError(500, "Failed to send generic issuance email");
        }

        return undefined;
      }
    });
  }

  /**
   * Uses Stytch to parse an email address from the given Stytch {@link Session}.
   * We know that if this function returns an email address, the user has successfully
   * signed in via Stytch. (in development mode, Stytch can be bypassed).
   *
   * @throws if the {@link Session} does not represent a user that has logged in with Stytch.
   */
  private getEmailFromSession(session: Session): string {
    const email = session.authentication_factors.find(
      (f) => !!f.email_factor?.email_address
    )?.email_factor?.email_address;
    if (!email) {
      throw new PCDHTTPError(400, "Session did not use email authentication");
    }
    return email;
  }

  /**
   * Modifies user identified by emails in the environment variable `GENERIC_ISSUANCE_ADMINS`
   * to be Podbox admins. This is an optional environment variable.
   */
  private async maybeSetupAdmins(client: PoolClient): Promise<void> {
    try {
      const adminEmailsFromEnv = this.pipelineUserDB.getEnvAdminEmails(client);
      logger(LOG_TAG, `setting up generic issuance admins`, adminEmailsFromEnv);
      for (const email of adminEmailsFromEnv) {
        await this.pipelineUserDB.setUserIsAdmin(client, email, true);
      }
    } catch (e) {
      logger(LOG_TAG, `failed to set up generic issuance admins`, e);
    }
  }
}
