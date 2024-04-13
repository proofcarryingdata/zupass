import { EdDSAPCD } from "@pcd/eddsa-pcd";
import { ObjectArgument, PCD, StringArgument } from "@pcd/pcd-types";
import { Message } from "./Message";

export const MessagePCDTypeName = "message-pcd";

export type Args = {
  privateKey: StringArgument;
  id: StringArgument;
  message: ObjectArgument<Message>;
};

export interface MessageProof {
  /**
   * Signature of an {@link Message}, encoded by
   */
  signature: EdDSAPCD;

  /**
   * {@link MessagePCD} serializes {@link MessagePCD#claim} into a string, and
   * stuffs it into a single {@link BigInt}, so that it can be signed by
   * {@link EdDSAPCD}. Deserialization requires knowledge of the string's initial
   * length, an it's stored in this variable here.
   */
  stringLength: number;
}

export class MessagePCD implements PCD<Message, MessageProof> {
  type = MessagePCDTypeName;
  claim: Message;
  proof: MessageProof;
  id: string;

  public constructor(id: string, claim: Message, proof: MessageProof) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}
