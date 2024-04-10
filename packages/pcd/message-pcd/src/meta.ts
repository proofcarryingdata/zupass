import { ObjectArgument, StringArgument } from "@pcd/pcd-types";
import { Message } from "./Message";

export const MessagePCDTypeName = "message-pcd";

export type Args = {
  privateKey: StringArgument;
  id: StringArgument;
  message: ObjectArgument<Message>;
};
