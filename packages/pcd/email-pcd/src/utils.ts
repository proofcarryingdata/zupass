import { EdDSAPublicKey } from "@pcd/eddsa-pcd";
import { EmailPCD } from "./EmailPCD";

export function getEmailAddress(pcd?: EmailPCD): string | undefined {
  return pcd?.claim?.emailAddress;
}

export function getPublicKey(pcd?: EmailPCD): EdDSAPublicKey | undefined {
  return pcd?.proof?.eddsaPCD?.claim?.publicKey;
}
