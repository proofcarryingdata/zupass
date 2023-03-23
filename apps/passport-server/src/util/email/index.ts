import { MailService } from "@sendgrid/mail";
import { readFile } from "fs/promises";

function getMailingClient(): MailService {
  const sgMail = new MailService();
  if (process.env.SENDGRID_API_KEY === undefined) {
    throw new Error("Missing environment variable: SENDGRID_API_KEY");
  }
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  return sgMail;
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
