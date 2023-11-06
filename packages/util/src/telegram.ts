import { sha256 } from "js-sha256";

export function getMessageWatermark(message: string): bigint {
  const hashed = sha256(message).substring(0, 16);
  return BigInt("0x" + hashed);
}

export function encodeAnonMessageIdAndReaction(
  anonMessageId: string,
  reaction: string
): string {
  return `REACT:${anonMessageId}:${reaction}`;
}

export const getAnonTopicNullifier = (): bigint => {
  return BigInt("0x" + sha256("anon_message").substring(0, 16));
};
