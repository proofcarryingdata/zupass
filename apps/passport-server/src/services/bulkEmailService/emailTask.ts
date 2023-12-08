import { SendEmailParams } from "../../apis/emailAPI";
import { ApplicationContext } from "../../types";

export interface EmailTask {
  name: string;
  sendTimestamp: Date;

  getRecipientEmails: (
    context: ApplicationContext
  ) => Promise<Iterable<string>>;

  compose: (
    context: ApplicationContext,
    recipientEmail: string
  ) => Promise<SendEmailParams>;
}
