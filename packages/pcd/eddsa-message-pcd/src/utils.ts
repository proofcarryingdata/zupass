export function stringToBigInts(str: string): bigint[] {
  return str.split("").map((s) => BigInt(s.charCodeAt(0)));
}

export function bigIntsToStr(bigints: bigint[]): string {
  return bigints.map((int) => String.fromCharCode(Number(int))).join("");
}
