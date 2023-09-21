import { getRandomValues } from "@pcd/util";

export function newEdDSAPrivateKey(): string {
  return Buffer.from(getRandomValues()).toString("hex");
}
