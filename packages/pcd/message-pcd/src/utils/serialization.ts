import { toBigIntBE, toBufferBE } from "@trufflesuite/bigint-buffer";
import { Buffer } from "buffer";
import { Message, MessageSchema } from "../Message";

export type MsgAsInt = {
  _msg_as_int: never;
  int: bigint;
  len: number;
};

export type StringifiedMessage = string & {
  _stringified: never;
};

export function stringifyMsg(message: Message): StringifiedMessage {
  return JSON.stringify(message) as StringifiedMessage;
}

export function destringifyMsg(serializedMessage: StringifiedMessage): Message {
  return JSON.parse(serializedMessage) as Message;
}

export function bigintifyMsg(msg: Message): MsgAsInt {
  const str = stringifyMsg(msg);
  const buf = Buffer.from(str, "utf-8");
  const int = toBigIntBE(buf);
  return { int, len: str.length } as MsgAsInt;
}

export function parseBigintifiedMsg(int: MsgAsInt): Message {
  const buf = toBufferBE(int.int, int.len);
  const msgString = buf.toString("utf-8");
  try {
    const msg = MessageSchema.parse(JSON.parse(msgString));
    return msg;
  } catch (e) {
    console.warn(e);
    return MessageSchema.parse({});
  }
}
