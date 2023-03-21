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
  to: string,
  name: string,
  magicLink: string
): Promise<{ text: string; html: string }> {
  // Get this files path
  const basePath = __dirname;

  const textTemplate = (await readFile(basePath + "/email.txt")).toString();
  const htmlTemplate = (await readFile(basePath + "/email.html")).toString();

  const text = textTemplate
    .replace("{{name}}", name)
    .replace("{{magicLink}}", magicLink)
    .replace("{{emailAddress}}", to);

  const html = htmlTemplate
    .replace("{{name}}", name)
    .replace("{{magicLink}}", magicLink)
    .replace("{{emailAddress}}", to);

  return {
    text,
    html,
  };
}

export async function sendEmail(
  to: string,
  name: string,
  magicLink: string
): Promise<void> {
  const msg = {
    to: to,
    from: "nalin@0xparc.org", // TODO: Get better verified sender
    subject: "Welcome to your Zuzalu Passport",
    ...(await composeMail(to, name, magicLink)),
  };

  try {
    await getMailingClient().send(msg);
  } catch (e) {
    throw new Error(`Sendgrid error, failed to email ${to}`);
  }
}
