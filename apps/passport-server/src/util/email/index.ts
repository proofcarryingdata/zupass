import { readFile } from "fs/promises";
import request from "request";
import { traced } from "../../services/telemetry";
import { ApplicationContext } from "../../types";

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
    }): Promise<void> => {
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
    },
  };
}

/**
 * TODO: deprecate this
 */
async function composePretixEmail(
  name: string,
  token: string
): Promise<{ text: string; html: string }> {
  // Get this files path
  const basePath = __dirname;

  const textTemplate = (
    await readFile(basePath + "/pretix/email.txt")
  ).toString();
  const htmlTemplate = (
    await readFile(basePath + "/pretix/email.html")
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

async function composeGenericEmail(
  token: string
): Promise<{ text: string; html: string }> {
  // Get this files path
  const basePath = __dirname;

  const textTemplate = (
    await readFile(basePath + "/generic/email.txt")
  ).toString();
  const htmlTemplate = (
    await readFile(basePath + "/generic/email.html")
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
export async function sendPretixEmail(
  context: ApplicationContext,
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
      ...(await composePretixEmail(name, token)),
    };

    try {
      await getMailingClient().send(msg);
    } catch (e: any) {
      console.log(e);
      context.rollbar?.error(e);
      throw new Error(`Sendgrid error, failed to email ${to}`);
    }
  });
}

export async function sendPCDPassEmail(
  context: ApplicationContext,
  to: string,
  token: string
): Promise<void> {
  return traced("Email", "sendEmail", async (span) => {
    span?.setAttribute("email", to);

    const msg = {
      to: to,
      from: "passport@0xparc.org",
      subject: "Welcome to PCDPass",
      ...(await composeGenericEmail(token)),
    };

    try {
      await getMailingClient().send(msg);
    } catch (e: any) {
      console.log(e);
      context.rollbar?.error(e);
      throw new Error(`Sendgrid error, failed to email ${to}`);
    }
  });
}
