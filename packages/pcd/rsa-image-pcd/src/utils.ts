import NodeRSA from "node-rsa";
import { RSAImagePCD } from "./RSAImagePCD.js";

export function getPublicKey(pcd?: RSAImagePCD): NodeRSA | undefined {
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
