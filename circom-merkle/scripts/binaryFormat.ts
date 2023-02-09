import { CIRCOM_BIGINT_N, CIRCOM_BIGINT_K } from "./constants";

export function bytesToString(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

export function stringToBytes(str: string) {
  const encodedText = new TextEncoder().encode(str);
  const toReturn = Uint8Array.from(str, (x) => x.charCodeAt(0));
  const buf = Buffer.from(str, "utf8");
  return toReturn;
  // TODO: Check encoding mismatch if the proof doesnt work
  // Note that our custom encoding function maps (239, 191, 189) -> (253)
  // Note that our custom encoding function maps (207, 181) -> (245)
  // throw Error(
  //   "TextEncoder does not match string2bytes function" +
  //     "\n" +
  //     str +
  //     "\n" +
  //     buf +
  //     "\n" +
  //     Uint8Array.from(buf) +
  //     "\n" +
  //     JSON.stringify(encodedText) +
  //     "\n" +
  //     JSON.stringify(toReturn)
  // );
}

export function toCircomBigIntBytes(num: BigInt | bigint): string[] {
  const res: string[] = [];
  const bigintNum: bigint = typeof num == "bigint" ? num : num.valueOf();
  const msk = (1n << BigInt(CIRCOM_BIGINT_N)) - 1n;
  for (let i = 0; i < CIRCOM_BIGINT_K; ++i) {
    res.push(((bigintNum >> BigInt(i * CIRCOM_BIGINT_N)) & msk).toString());
  }
  return res;
}
