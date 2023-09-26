import { getRandomValues, toHexString } from "@pcd/util";

export function newEdDSAPrivateKey(): string {
  return toHexString(getRandomValues(32));
}
