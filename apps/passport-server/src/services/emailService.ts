import { readFile } from "fs/promises";
import * as path from "path";
import { IEmailAPI } from "../apis/emailAPI";
import { PCDHTTPError } from "../routing/pcdHttpError";
import { ApplicationContext } from "../types";
import { traced } from "./telemetryService";

/**
 * Responsible for sending emails to users.
 */
export class EmailService {
  private context: ApplicationContext;
  private emailAPI: IEmailAPI | null;

  public constructor(
    context: ApplicationContext,
    emailClient: IEmailAPI | null
  ) {
    this.context = context;
    this.emailAPI = emailClient;
  }

  private async composePretixEmail(
    name: string,
    token: string
  ): Promise<{ text: string; html: string }> {
    const textTemplate = (
      await readFile(
        path.join(this.context.resourcesDir, "email/zupass/email.txt")
      )
    ).toString();
    const htmlTemplate = (
      await readFile(
        path.join(this.context.resourcesDir, "email/zupass/email.html")
      )
    ).toString();

    const text = textTemplate
      .replace("{{name}}", name)
      .replace("{{token}}", token);

    const html = htmlTemplate
      .replace("{{name}}", name)
      .replace("{{token}}", token);

    return {
      text,
      html
    };
  }

  private async composeGenericEmail(
    token: string
  ): Promise<{ text: string; html: string }> {
    const textTemplate = (
      await readFile(
        path.join(this.context.resourcesDir, "email/pcdpass/email.txt")
      )
    ).toString();
    const htmlTemplate = (
      await readFile(
        path.join(this.context.resourcesDir, "email/pcdpass/email.html")
      )
    ).toString();

    const text = textTemplate.replace("{{token}}", token);
    const html = htmlTemplate.replace("{{token}}", token);

    return {
      text,
      html
    };
  }

  public async sendPretixEmail(
    to: string,
    name: string,
    token: string
  ): Promise<void> {
    return traced("Email", "sendEmail", async (span) => {
      span?.setAttribute("email", to);

      const msg = {
        to: to,
        from: "passport@0xparc.org",
        subject: "Welcome to your Zuzalu Passport",
        ...(await this.composePretixEmail(name, token))
      };

      if (!this.emailAPI) {
        throw new PCDHTTPError(503, "[EMAIL] no email client");
      }

      try {
        await this.emailAPI.send(msg);
      } catch (e) {
        throw new PCDHTTPError(500, `Email send error, failed to email ${to}`, {
          cause: e
        });
      }
    });
  }

  public async sendPCDpassEmail(to: string, token: string): Promise<void> {
    return traced("Email", "sendEmail", async (span) => {
      span?.setAttribute("email", to);

      const msg = {
        to: to,
        from: "passport@0xparc.org",
        subject: "Welcome to PCDpass",
        ...(await this.composeGenericEmail(token))
      };

      if (!this.emailAPI) {
        throw new PCDHTTPError(503, "[EMAIL] no email client");
      }

      try {
        this.emailAPI.send(msg);
      } catch (e) {
        throw (
          (new PCDHTTPError(500, `Email send error, failed to email ${to}`),
          { cause: e })
        );
      }
    });
  }
}

export function startEmailService(
  context: ApplicationContext,
  emailClient: IEmailAPI | null
): EmailService {
  return new EmailService(context, emailClient);
}
