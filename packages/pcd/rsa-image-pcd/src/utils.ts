import type { default as NodeRSA } from "node-rsa";
import { RSAImagePCD } from "./RSAImagePCD";

export async function getPublicKey(
  pcd?: RSAImagePCD
): Promise<NodeRSA | undefined> {
  const { default: NodeRSA } = await import("node-rsa");
  const encodedPublicKey = pcd?.proof?.rsaPCD?.proof?.publicKey;
  if (!encodedPublicKey) {
    return undefined;
  }

  try {
    const key = new NodeRSA(encodedPublicKey, "public");
    return key;
  } catch (e) {
    console.log("failed to deserialize key");
  }

  return undefined;
}
