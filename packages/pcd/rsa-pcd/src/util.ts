import NodeRSA from "node-rsa";

export function newRSAPrivateKey(): string {
  const keyPair = new NodeRSA({ b: 2048 });
  return keyPair.exportKey("private");
}
