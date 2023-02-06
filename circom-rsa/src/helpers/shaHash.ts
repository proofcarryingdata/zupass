const { subtle } = require("crypto").webcrypto;

export async function shaHash(str: Uint8Array) {
  const res = new Uint8Array(await subtle.digest("SHA-512", str));
  return res;
}
