import { ZUPASS_SENDER_EMAIL } from "@pcd/util";
import { SendEmailParams } from "../../../apis/emailAPI";
import { getPacificTimeStamp } from "../../../util/date";
import { EmailTask } from "../emailTask";

export const ADMIN_HELLO_EMAIL: EmailTask = {
  name: "ADMIN_HELLO",
  sendTimestamp: getPacificTimeStamp({
    year: 2023,
    month: 11,
    day: 8,
    hour: 4,
    minute: 0
  }),
  compose: async (context, recipientEmail): Promise<SendEmailParams> => {
    return {
      from: ZUPASS_SENDER_EMAIL,
      subject: "hello to the admins",
      to: recipientEmail,
      text: "this is a test email",
      html: "this is a test email"
    };
  },
  getRecipientEmails: async (context): Promise<Iterable<string>> => {
    return ["ivan@0xparc.org"];
  }
};
