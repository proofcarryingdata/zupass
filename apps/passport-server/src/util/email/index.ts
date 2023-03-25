import { readFile } from "fs/promises";
import request from "request";

function getMailingClient() {
  if (process.env.MAILGUN_API_KEY === undefined) {
    throw new Error("Missing environment variable: MAILGUN_API_KEY");
  }

  return {
    send: ({
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
    }) => {
      request(
        "https://api.mailgun.net/v3/0xparc.org/messages",
        {
          headers: {
            Authorization: `Basic ${process.env.MAILGUN_API_KEY}`,
          },
          method: "POST",
          formData: { from, to, subject, text, html },
        },
        (err, res, body) => {
          if (err) {
            console.log(err);
          }
          if (body) {
            console.log(body);
          }
        }
      );
    },
  };
}

async function composeMail(
  name: string,
  token: string
): Promise<{ text: string; html: string }> {
  // Get this files path
  const basePath = __dirname;

  const textTemplate = (await readFile(basePath + "/email.txt")).toString();
  const htmlTemplate = (await readFile(basePath + "/email.html")).toString();

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

export async function sendEmail(
  to: string,
  name: string,
  token: string
): Promise<void> {
  const msg = {
    to: to,
    from: "passport@0xparc.org",
    subject: "Welcome to your Zuzalu Passport",
    ...(await composeMail(name, token)),
  };

  try {
    await getMailingClient().send(msg);
  } catch (e) {
    throw new Error(`Sendgrid error, failed to email ${to}`);
  }
}
