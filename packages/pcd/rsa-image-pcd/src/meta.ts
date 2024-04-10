import { StringArgument } from "@pcd/pcd-types";

export const RSAImagePCDTypeName = "rsa-image-pcd";

export type RSAImagePCDArgs = {
  privateKey: StringArgument;
  id: StringArgument;
  url: StringArgument;
  title: StringArgument;
};
