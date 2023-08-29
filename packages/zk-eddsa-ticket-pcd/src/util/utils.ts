import { stringify } from "uuid";

export const toHexString = (bytes: Uint8Array) =>
  Buffer.from(bytes).toString("hex");
export const fromHexString = (hexString: string) =>
  Buffer.from(hexString, "hex");
export const isNegativeOne = (value: string) =>
  BigInt(value) ===
    BigInt(
      "21888242871839275222246405745257275088548364400416034343698204186575808495616"
    ) || BigInt(value) === BigInt(-1);
export const decStringToBigIntToUuid = (value: string) => {
  let hexStr = BigInt(value).toString(16);
  while (hexStr.length < 32) hexStr = "0" + hexStr;
  const buf = Buffer.from(hexStr, "hex");
  return stringify(buf);
};
