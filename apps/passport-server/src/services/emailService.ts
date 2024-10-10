import { ZUPASS_SENDER_EMAIL } from "@pcd/util";
import { readFile } from "fs/promises";
import * as path from "path";
import { IEmailAPI } from "../apis/emailAPI";
import { PCDHTTPError } from "../routing/pcdHttpError";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";
import { traced } from "./telemetryService";

const LOG_NAME = "EmailService";
const LOG_TAG = `[${LOG_NAME}]`;

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
    return traced(LOG_NAME, "sendTokenEmail", async (span) => {
      logger(LOG_TAG, `sendTokenEmail`, JSON.stringify({ to, token }));

      span?.setAttribute("email", to);

      const msg = {
        to,
        from: `Zupass <${ZUPASS_SENDER_EMAIL}>`,
        subject: `${token} is your confirmation code`,
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

    const text = textTemplate.replace(
      "{{oneClickLoginLink}}",
      oneClickLoginLink
    );
    const html = htmlTemplate.replace(
      "{{oneClickLoginLink}}",
      oneClickLoginLink
    );

    return {
      text,
      html
    };
  }

  public async sendEsmeraldaOneClickEmail(
    to: string,
    oneClickLoginLink: string
  ): Promise<void> {
    return traced(LOG_NAME, "sendEsmeraldaOneClickEmail", async (span) => {
      logger(
        LOG_TAG,
        `sendEsmeraldaOneClickEmail`,
        JSON.stringify({ to, oneClickLoginLink })
      );
      span?.setAttribute("email", to);
      span?.setAttribute("oneClickLoginLink", oneClickLoginLink);

      const msg = {
        to,
        from: `Edge Esmeralda <${ZUPASS_SENDER_EMAIL}>`,
        subject: "Your Edge Esmeralda Ticket & QR Code",
        ...(await this.composeOneClickLoginEmail(oneClickLoginLink))
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
