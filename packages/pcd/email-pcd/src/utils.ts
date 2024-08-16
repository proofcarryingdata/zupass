import { EmailPCD } from "./EmailPCD";

export function getEmailAddress(pcd?: EmailPCD): string | undefined {
  return pcd?.claim?.emailAddress;
}
