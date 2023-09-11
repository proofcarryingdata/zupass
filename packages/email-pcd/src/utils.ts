import { EDdSAPublicKey } from "@pcd/eddsa-pcd";
import { textToBigint } from "bigint-conversion";
import { EmailPCD, IEmailData } from "./EmailPCD";

/**
 * One big int for each signed field in {@link IEmailData}
 */
export type SerializedEmailData = [bigint];

export function emailDataToBigInts(data: IEmailData): SerializedEmailData {
  return [textToBigint(data.emailAddress)];
}

export function getEmailData(pcd?: EmailPCD): IEmailData | undefined {
  return pcd?.claim?.email;
}

export function getPublicKey(pcd?: EmailPCD): EDdSAPublicKey | undefined {
  return pcd?.proof?.eddsaPCD?.claim?.publicKey;
}
