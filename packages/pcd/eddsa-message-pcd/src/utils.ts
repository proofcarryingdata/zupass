import { toBigIntBE, toBufferBE } from "@trufflesuite/bigint-buffer";

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
