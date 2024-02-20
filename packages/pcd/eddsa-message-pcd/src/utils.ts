import { EdDSAPCDPackage } from "@pcd/eddsa-pcd";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { toBigIntBE, toBufferBE } from "@trufflesuite/bigint-buffer";
import { v4 as uuid } from "uuid";
import { BaseSignedMessage, EdDSAMessagePCD } from "./EdDSAMessagePCD";

export function stringToBigInts(str: string): bigint[] {
  const stringBuf = Buffer.from(str, "utf-8");
  const bigInt = toBigIntBE(stringBuf);
  return [bigInt];
}

export function bigIntsToStr(bigints: bigint[], length: number): string {
  const first = bigints[0];
  const buf = toBufferBE(first, length);
  return buf.toString("utf-8");
}

export function getMessage(
  pcd: EdDSAMessagePCD
): BaseSignedMessage | undefined {
  try {
    const body = pcd.proof.eddsaPCD.claim.message;
    const strBody = bigIntsToStr(body, pcd.proof.bodyLength);
    const imageData = JSON.parse(strBody) as BaseSignedMessage;
    return imageData;
  } catch (e) {
    console.warn(e);
    return undefined;
  }
}

/**
 * Given a message to sign and a private key, returns
 * a signature wrapped in a {@link PCD}, which is consumable
 * by the rest of the PCD framework.
 */
export async function eddsaSign(
  message: BaseSignedMessage,
  privateKey: string,
  id?: string
): Promise<EdDSAMessagePCD> {
  const stringifiedBody = JSON.stringify(message);
  const bodyAsBigIntArray = stringToBigInts(stringifiedBody).map((v) =>
    v.toString()
  );
  const signature = await EdDSAPCDPackage.prove({
    id: {
      argumentType: ArgumentTypeName.String,
      value: uuid()
    },
    privateKey: {
      argumentType: ArgumentTypeName.String,
      value: privateKey
    },
    message: {
      argumentType: ArgumentTypeName.StringArray,
      value: bodyAsBigIntArray
    }
  });
  return new EdDSAMessagePCD(
    id ?? uuid(),
    {},
    { eddsaPCD: signature, bodyLength: stringifiedBody.length }
  );
}
