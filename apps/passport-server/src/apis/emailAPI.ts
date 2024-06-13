import sendgrid from "@sendgrid/mail";
import PQueue from "p-queue";
import { traced } from "../services/telemetryService";
import { logger } from "../util/logger";

interface SendEmailParams {
  /**
   * senders we have configured on sendgrid (others won't work):
   * - support@zupass.org
   * - noreply@zupass.org
   */
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface IEmailAPI {
  send: (args: SendEmailParams) => Promise<void>;
}

const LOG_NAME = `EmailAPI`;
const LOG_TAG = `[${LOG_NAME}]`;

export class EmailAPI implements IEmailAPI {
  private readonly sendQueue: PQueue;

  public constructor() {
    this.sendQueue = new PQueue({
      // actual rate limit is 600/minute but we want to be well below that
      // https://www.twilio.com/docs/sendgrid/v2-api/using_the_web_api
      interval: 60_000,
      intervalCap: 400
    });
  }

  public async send(params: SendEmailParams): Promise<void> {
    return traced(LOG_NAME, "send", async () => {
      await this.sendQueue.add(async () => {
        const message = await sendgrid.send(params);
        logger(
          LOG_TAG,
          "Sending email via Sendgrid",
          JSON.stringify(params),
          "Sendgrid response was",
          message
        );
      });
    });
  }
}

export async function createEmailAPI(): Promise<IEmailAPI> {
  return new EmailAPI();
}
