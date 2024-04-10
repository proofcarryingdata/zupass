import { StringArgument } from "@pcd/pcd-types";

export const RSAPCDTypeName = "rsa-pcd";

export type RSAPCDArgs = {
  privateKey: StringArgument;
  signedMessage: StringArgument;
  id: StringArgument;
};
