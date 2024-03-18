import { GenericIssuanceSendEmailResponseValue } from "@pcd/passport-interface";
import { normalizeEmail } from "@pcd/util";
import { Client, Session } from "stytch";
import { IPipelineUserDB } from "../../../database/queries/pipelineUserDB";
import { PCDHTTPError } from "../../../routing/pcdHttpError";
import { logger } from "../../../util/logger";
import { setError, traced } from "../../telemetryService";
import { traceUser } from "../honeycombQueries";
import { PipelineUser } from "../pipelines/types";

const SERVICE_NAME = "GENERIC_ISSUANCE_USER";
const LOG_TAG = `[${SERVICE_NAME}]`;

export class GenericIssuanceUserSubservice {
  private userDB: IPipelineUserDB;
  private stytchClient: Client | undefined;
  private genericIssuanceClientUrl: string;
  private stopped: boolean;

  public constructor(
    userDB: IPipelineUserDB,
    stytchClient: Client | undefined,
    genericIssuanceClientUrl: string
  ) {
    this.userDB = userDB;
    this.stytchClient = stytchClient;
    this.genericIssuanceClientUrl = genericIssuanceClientUrl;
    this.stopped = false;
  }

  public async start(): Promise<void> {
    await this.maybeSetupAdmins();
  }

  public async stop(): Promise<void> {
    this.stopped = true;
  }

  public async getOrCreateUser(email: string): Promise<PipelineUser> {
    return traced(SERVICE_NAME, "getOrCreateUser", async () => {
      return this.userDB.getOrCreateUser(email);
    });
  }

  private getEmailFromStytchSession(session: Session): string {
    const email = session.authentication_factors.find(
      (f) => !!f.email_factor?.email_address
    )?.email_factor?.email_address;
    if (!email) {
      throw new PCDHTTPError(400, "Session did not use email authentication");
    }
    return email;
  }

  public async authenticateStytchSession(req: Request): Promise<PipelineUser> {
    return traced(SERVICE_NAME, "authenticateStytchSession", async (span) => {
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
          const email = this.getEmailFromStytchSession(session);
          const user = await this.getOrCreateUser(email);
          traceUser(user);
          return user;
        } else {
          // 3) if we don't have a stytch client, and that's a valid state,
          //    treats a jwt whose contents is some string with just an email
          //    address in it as a valid JWT authenticate the requester to be
          //    logged in as a new or existing user with the given email address
          const user = await this.getOrCreateUser(jwt);
          traceUser(user);
          return user;
        }
      } catch (e) {
        logger(LOG_TAG, "failed to authenticate stytch session", jwt, e);
        throw new PCDHTTPError(401);
      }
    });
  }

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

  private async maybeSetupAdmins(): Promise<void> {
    try {
      const adminEmailsFromEnv = this.userDB.getEnvAdminEmails();
      logger(LOG_TAG, `setting up generic issuance admins`, adminEmailsFromEnv);
      for (const email of adminEmailsFromEnv) {
        await this.userDB.setUserIsAdmin(email, true);
      }
    } catch (e) {
      logger(LOG_TAG, `failed to set up generic issuance admins`, e);
    }
  }
}
