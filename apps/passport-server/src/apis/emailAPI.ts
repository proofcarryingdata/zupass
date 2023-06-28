import request from "request";

export interface IEmailAPI {
  send: (args: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
  }) => Promise<void>;
}

export function sendEmail({
  from,
  to,
  subject,
  text,
  html,
}: {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    request(
      "https://api.mailgun.net/v3/0xparc.org/messages",
      {
        headers: {
          Authorization: `Basic ${process.env.MAILGUN_API_KEY}`,
        },
        method: "POST",
        formData: { from, to, subject, text, html },
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
