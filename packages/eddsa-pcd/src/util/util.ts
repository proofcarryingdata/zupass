import * as ed from "noble-ed25519";

export function newEdDSAPrivateKey(): string {
  return Buffer.from(ed.utils.randomPrivateKey()).toString("hex");
}
