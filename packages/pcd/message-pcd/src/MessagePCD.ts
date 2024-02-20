import { EdDSAPCD, EdDSAPCDPackage } from "@pcd/eddsa-pcd";
import {
  DisplayOptions,
  ObjectArgument,
  PCD,
  PCDPackage,
  SerializedPCD,
  StringArgument
} from "@pcd/pcd-types";
import JSONBig from "json-bigint";
import { Message, getMessage } from "./Message";
import { eddsaSign } from "./utils/eddsaSign";

export const EdDSAMessagePCDTypeName = "message-pcd";

export type MessagePCDArgs<T> = {
  privateKey: StringArgument;
  id: StringArgument;
  message: ObjectArgument<Message<T>>;
};

export interface Proof {
  signature: EdDSAPCD;

  /**
   * {@link MessagePCD} serializes {@link MessagePCD#claim} into a string, and
   * stuffs it into a single {@link BigInt}, so that it can be signed by
   * {@link EdDSAPCD}. Deserialization requires knowledge of the string's initial
   * length, an it's stored in this variable here.
   */
  stringLength: number;
}

export class MessagePCD<MsgT extends Message> implements PCD<MsgT, Proof> {
  type = EdDSAMessagePCDTypeName;
  claim: MsgT;
  proof: Proof;
  id: string;

  public constructor(id: string, claim: MsgT, proof: Proof) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}

export async function prove<T extends Message>(
  args: MessagePCDArgs<T>
): Promise<MessagePCD<T>> {
  if (args.message.value == null) {
    throw new Error("missing message");
  }

  if (args.privateKey.value == null) {
    throw new Error("missing private key");
  }

  return eddsaSign(args.message.value, args.privateKey.value);
}

export async function verify(pcd: MessagePCD): Promise<boolean> {
  try {
    const valid = await EdDSAPCDPackage.verify(pcd.proof.eddsaPCD);
    return valid;
  } catch (e) {
    return false;
  }
}

export async function serialize(
  pcd: MessagePCD
): Promise<SerializedPCD<MessagePCD>> {
  const serialized = await EdDSAPCDPackage.serialize(pcd.proof.eddsaPCD);
  return {
    type: EdDSAMessagePCDTypeName,
    pcd: JSONBig().stringify({
      id: pcd.id,
      eddsaPCD: serialized,
      bodyLength: pcd.proof.bodyLength
    })
  } as SerializedPCD<MessagePCD>;
}

export async function deserialize(serialized: string): Promise<MessagePCD> {
  const deserializedWrapper = JSONBig().parse(serialized);
  const deserializedEdDSAPCD = await EdDSAPCDPackage.deserialize(
    deserializedWrapper.eddsaPCD.pcd
  );
  return new MessagePCD(
    deserializedWrapper.id,
    {},
    {
      signature: deserializedEdDSAPCD,
      stringLength: deserializedWrapper.bodyLength
    }
  );
}

export function getDisplayOptions(pcd: MessagePCD): DisplayOptions {
  const body = getMessage(pcd);
  return {
    header: body?.displayName ?? "untitled",
    displayName: "msg-" + pcd.id.substring(0, 4)
  };
}

/**
 * PCD-conforming wrapper to sign markdown messages using an EdDSA keypair.
 */
export const EdDSAMessagePCDPackage: PCDPackage<
  Message,
  Proof,
  MessagePCDArgs
> = {
  name: EdDSAMessagePCDTypeName,
  getDisplayOptions,
  prove,
  verify,
  serialize,
  deserialize
};
