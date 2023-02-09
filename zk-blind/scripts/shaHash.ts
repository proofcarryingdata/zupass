import { createHash } from "crypto";

export async function shaHash(str: Uint8Array) {
  return createHash("sha256").update(str).digest();
}
