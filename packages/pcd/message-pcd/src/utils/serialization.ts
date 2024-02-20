import { toBigIntBE, toBufferBE } from "@trufflesuite/bigint-buffer";
import { Message } from "../Message";

export type SerializedMessage = string & {
  _never: never;
};

export function serializeMessage(message: Message): SerializedMessage {
  return JSON.stringify(message) as SerializedMessage;
}

export function deserializeMessage(
  serializedMessage: SerializedMessage
): Message {
  return JSON.parse(serializedMessage) as Message;
}

export function serializeUtf8String(utf8String: string): bigint {
  const stringBuf = Buffer.from(utf8String, "utf-8");
  const bigInt = toBigIntBE(stringBuf);
  return bigInt;
}

export function derializeUtf8String(
  serializedUtf8String: bigint,
  originalStringLength: number
): string {
  const buf = toBufferBE(serializedUtf8String, originalStringLength);
  return buf.toString("utf-8");
}
