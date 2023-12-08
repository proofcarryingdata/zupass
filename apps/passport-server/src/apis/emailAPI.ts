import sendgrid from "@sendgrid/mail";
import request from "request";
import { logger } from "../util/logger";

export interface SendEmailParams {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface IEmailAPI {
  send: (args: SendEmailParams) => Promise<void>;
}

export async function sendgridSendEmail({
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

export function mailgunSendEmail({
  from,
  to,
  subject,
  text,
  html
}: SendEmailParams): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    request(
      "https://api.mailgun.net/v3/zupass.org/messages",
      {
        headers: {
          Authorization: `Basic ${process.env.MAILGUN_API_KEY}`
        },
        method: "POST",
        formData: { from, to, subject, text, html }
      },
      (err: any, _res: any, _body: any) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}
