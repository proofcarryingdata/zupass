import { readFile } from "fs/promises";
import * as path from "path";
import { ApplicationContext } from "../types";
import { RollbarService } from "./rollbarService";
import { traced } from "./telemetryService";

export interface EmailClient {
  send: (args: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
  }) => Promise<void>;
}

export class EmailService {
  private context: ApplicationContext;
  private rollbarService: RollbarService;
  private client: EmailClient | null;

  public constructor(
    context: ApplicationContext,
    rollbarService: RollbarService,
    emailClient: EmailClient | null
  ) {
    this.context = context;
    this.rollbarService = rollbarService;
    this.client = emailClient;
  }

  /**
   * TODO: deprecate this
   */
  private async composePretixEmail(
    name: string,
    token: string
  ): Promise<{ text: string; html: string }> {
    const textTemplate = (
      await readFile(path.join(this.context.resourcesDir, "/zuzalu/email.txt"))
    ).toString();
    const htmlTemplate = (
      await readFile(path.join(this.context.resourcesDir, "/zuzalu/email.html"))
    ).toString();

    const text = textTemplate
      .replace("{{name}}", name)
      .replace("{{token}}", token);

    const html = htmlTemplate
      .replace("{{name}}", name)
      .replace("{{token}}", token);

    return {
      text,
      html,
    };
  }

  private async composeGenericEmail(
    token: string
  ): Promise<{ text: string; html: string }> {
    const textTemplate = (
      await readFile(path.join(this.context.resourcesDir, "/pcdpass/email.txt"))
    ).toString();
    const htmlTemplate = (
      await readFile(
        path.join(this.context.resourcesDir, "/pcdpass/email.html")
      )
    ).toString();

    const text = textTemplate.replace("{{token}}", token);

    const html = htmlTemplate.replace("{{token}}", token);

    return {
      text,
      html,
    };
  }

  /**
   * TODO: deprecate this
   */
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
        ...(await this.composePretixEmail(name, token)),
      };

      try {
        if (!this.client) {
          throw new Error("[EMAIL] no email client");
        }
        await this.client.send(msg);
      } catch (e: any) {
        console.log(e);
        this.rollbarService?.error(e);
        throw new Error(`Sendgrid error, failed to email ${to}`);
      }
    });
  }

  public async sendPCDPassEmail(to: string, token: string): Promise<void> {
    return traced("Email", "sendEmail", async (span) => {
      span?.setAttribute("email", to);

      const msg = {
        to: to,
        from: "passport@0xparc.org",
        subject: "Welcome to PCDPass",
        ...(await this.composeGenericEmail(token)),
      };

      try {
        if (!this.client) {
          throw new Error("[EMAIL] no email client");
        }

        this.client.send(msg);
      } catch (e: any) {
        console.log(e);
        this, this.rollbarService?.error(e);
        throw new Error(`Sendgrid error, failed to email ${to}`);
      }
    });
  }
}

export function startEmailService(
  context: ApplicationContext,
  rollbarService: RollbarService,
  emailClient: EmailClient | null
) {
  const emailService = new EmailService(context, rollbarService, emailClient);
  return emailService;
}
