import { StringArgument } from "@pcd/pcd-types";

export const EmailPCDTypeName = "email-pcd";

export type EmailPCDArgs = {
  // The EdDSA private key to sign the message with, as a hex string
  privateKey: StringArgument;
  // the verified email address
  emailAddress: StringArgument;
  // semaphore ID
  semaphoreId: StringArgument;
  // A unique string identifying the PCD
  id: StringArgument;
};
