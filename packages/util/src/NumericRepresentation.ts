import { stringify } from "uuid";

/**
 * Converts a byte array to a hex string.  Opposite of fromHexString().
 */
export const toHexString = (bytes: Uint8Array) =>
  Buffer.from(bytes).toString("hex");

/**
 * Converts a hex string to a byte-array.  Opposite of toHexString().
 */
export const fromHexString = (hexString: string) =>
  Buffer.from(hexString, "hex");

/**
 * Converts a number (as decimal string) to a UUID (as string) in the
 * format of uuid.stringify.
 */
export const decStringToBigIntToUuid = (value: string) => {
  let hexStr = BigInt(value).toString(16);
  while (hexStr.length < 32) hexStr = "0" + hexStr;
  const buf = Buffer.from(hexStr, "hex");
  return stringify(buf);
};
