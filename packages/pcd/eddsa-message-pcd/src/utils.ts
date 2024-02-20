import { toBigIntBE, toBufferBE } from "@trufflesuite/bigint-buffer";
import { EdDSAMessagePCD, EdDSAMessagePCDBody } from "./EdDSAMessagePCD";

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

export function getEdDSAMessageBody(
  pcd: EdDSAMessagePCD
): EdDSAMessagePCDBody | undefined {
  try {
    const body = pcd.proof.eddsaPCD.claim.message;
    const strBody = bigIntsToStr(body, pcd.proof.bodyLength);
    const imageData = JSON.parse(strBody) as EdDSAMessagePCDBody;
    return imageData;
  } catch (e) {
    console.warn(e);
    return undefined;
  }
}
