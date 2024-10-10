export async function newRSAPrivateKey(): Promise<string> {
  const { default: NodeRSA } = await import("node-rsa");
  const keyPair = new NodeRSA({ b: 2048 });
  return keyPair.exportKey("private");
}
