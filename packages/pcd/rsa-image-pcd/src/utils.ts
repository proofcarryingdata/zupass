import type NodeRSA from "node-rsa";
import { RSAImagePCD } from "./RSAImagePCD";

export async function getPublicKey(
  pcd?: RSAImagePCD
): Promise<NodeRSA | undefined> {
  const encodedPublicKey = pcd?.proof?.rsaPCD?.proof?.publicKey;
  if (!encodedPublicKey) {
    return undefined;
  }

  try {
    const { default: NodeRSA } = await import("node-rsa");
    const key = new NodeRSA(encodedPublicKey, "public");
    return key;
  } catch (e) {
    console.log("failed to deserialize key");
  }

  return undefined;
}
