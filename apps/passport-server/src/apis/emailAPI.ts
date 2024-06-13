import sendgrid from "@sendgrid/mail";
import PQueue from "p-queue";
import { logger } from "../util/logger";

interface SendEmailParams {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface IEmailAPI {
  send: (args: SendEmailParams) => Promise<void>;
}

export class EmailAPI implements IEmailAPI {
  private readonly sendQueue: PQueue;

  public constructor() {
    this.sendQueue = new PQueue();
  }

  public async send({
    from,
    to,
    subject,
    text,
    html
  }: SendEmailParams): Promise<void> {
    const message = await sendgrid.send({
      to,
      from,
      subject,
      text,
      html
    });
    logger("[EMAIL] Sending email via Sendgrid", message);
  }
}

export async function createEmailAPI(): Promise<IEmailAPI> {
  return new EmailAPI();
}
