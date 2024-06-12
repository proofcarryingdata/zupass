import { ZUPASS_SENDER_EMAIL } from "@pcd/util";
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

  private async composeTokenEmail(
    token: string
  ): Promise<{ text: string; html: string }> {
    const textTemplate = (
      await readFile(path.join(this.context.resourcesDir, "email/email.txt"))
    ).toString();
    const htmlTemplate = (
      await readFile(path.join(this.context.resourcesDir, "email/email.html"))
    ).toString();

    const text = textTemplate.replace("{{token}}", token);
    const html = htmlTemplate.replace("{{token}}", token);

    return {
      text,
      html
    };
  }

  public async sendTokenEmail(to: string, token: string): Promise<void> {
    return traced("Email", "sendEmail", async (span) => {
      span?.setAttribute("email", to);

      const msg = {
        to: to,
        from: `Zupass <${ZUPASS_SENDER_EMAIL}>`,
        subject: "Welcome to Zupass",
        ...(await this.composeTokenEmail(token))
      };

      if (!this.emailAPI) {
        throw new PCDHTTPError(503, "[EMAIL] no email client");
      }

      try {
        this.emailAPI.send(msg);
      } catch (e) {
        throw new PCDHTTPError(500, `Email send error, failed to email ${to}`, {
          cause: e
        });
      }
    });
  }

  private async composeOneClickLoginEmail(
    name: string,
    email: string,
    oneClickLoginLink: string
  ): Promise<{ text: string; html: string }> {
    const textTemplate = (
      await readFile(
        path.join(this.context.resourcesDir, "email/one-click-email/email.txt")
      )
    ).toString();
    const htmlTemplate = (
      await readFile(
        path.join(this.context.resourcesDir, "email/one-click-email/email.html")
      )
    ).toString();

    let text = textTemplate.replace("{{name}}", name);
    text = textTemplate.replace("{{email}}", email);
    text = textTemplate.replace("{{oneClickLoginLink}}", oneClickLoginLink);

    let html = htmlTemplate.replace("{{name}}", name);
    html = textTemplate.replace("{{email}}", email);
    html = textTemplate.replace("{{oneClickLoginLink}}", oneClickLoginLink);

    return {
      text,
      html
    };
  }

  public async sendEsmeraldaOneClickEmail(
    to: string,
    name: string,
    email: string,
    oneClickLoginLink: string
  ): Promise<void> {
    return traced("Email", "sendEmail", async (span) => {
      span?.setAttribute("email", to);

      const msg = {
        to: to,
        from: `Zupass <${ZUPASS_SENDER_EMAIL}>`,
        subject: "Welcome to Zupass",
        ...(await this.composeOneClickLoginEmail(
          name,
          email,
          oneClickLoginLink
        ))
      };

      if (!this.emailAPI) {
        throw new PCDHTTPError(503, "[EMAIL] no email client");
      }

      try {
        this.emailAPI.send(msg);
      } catch (e) {
        throw new PCDHTTPError(500, `Email send error, failed to email ${to}`, {
          cause: e
        });
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
