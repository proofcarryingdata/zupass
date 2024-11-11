import sendgrid, { MailDataRequired } from "@sendgrid/mail";
import _ from "lodash";
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
  private readonly outboundAllowList: string[] | undefined;

  public constructor(outboundAllowList?: string[]) {
    this.outboundAllowList = outboundAllowList;
    this.sendQueue = new PQueue({
      // actual rate limit is 600/minute but we want to be well below that
      // https://www.twilio.com/docs/sendgrid/v2-api/using_the_web_api
      interval: 60_000,
      intervalCap: 400
    });
  }

  public async send(params: SendEmailParams): Promise<void> {
    return traced(LOG_NAME, "send", async (span) => {
      span?.setAttribute("from", params.from);
      span?.setAttribute("to", params.to);
      span?.setAttribute("subject", params.subject);

      if (
        this.outboundAllowList &&
        !this.outboundAllowList.includes(params.to)
      ) {
        logger(
          LOG_TAG,
          `email ${params.to} is not in the outbound allowlist - no-op skipping sending the email`,
          JSON.stringify(params)
        );
        span?.setAttribute("no_op", true);
        return;
      }

      logger(LOG_TAG, "Sending email via Sendgrid", JSON.stringify(params));

      await this.sendQueue.add(async () => {
        const clonedParams = _.clone(params);

        const percentage = parseFloat(
          process.env.SENGRID_DEDICATED_IP_PERCENTAGE ?? "0"
        );

        if (Math.random() < percentage && !isNaN(percentage)) {
          logger(LOG_TAG, "Using dedicated IP pool", JSON.stringify(params));
          Object.assign(clonedParams, {
            ipPoolName: "verification_emails"
          } satisfies Partial<MailDataRequired>);
        }

        const message = await sendgrid.send(clonedParams);

        logger(
          LOG_TAG,
          "sent API request to sendgrid",
          JSON.stringify(params),
          "sendgrid response was",
          message
        );
      });
    });
  }
}

export async function createEmailAPI(): Promise<IEmailAPI> {
  const serializedAllowList: string | undefined =
    process.env.OUTBOUND_ALLOW_LIST;
  let outboundAllowList: string[] | undefined = undefined;

  try {
    outboundAllowList = JSON.parse(serializedAllowList ?? "");
    logger(LOG_TAG, `outbound allow list`, JSON.stringify(outboundAllowList));
  } catch (e) {
    if (serializedAllowList !== "" && serializedAllowList !== undefined) {
      logger(LOG_TAG, `failed to parse ${process.env.OUTBOUND_ALLOW_LIST}`, e);
    }
  }

  return new EmailAPI(outboundAllowList);
}
