import { EdDSAPCDPackage } from "@pcd/eddsa-pcd";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { v4 as uuid } from "uuid";
import { Message } from "../Message.js";
import { MessagePCD, MessageProof } from "../MessagePCD.js";
import { bigintifyMsg } from "./serialization.js";

/**
 * Given a {@link Message} to sign, and an EdDSAPrivateKey, returns a
 * {@link MessagePCD}, which can be consumed by the PCD Framework.
 */
export async function eddsaSign(
  message: Message,
  privateKey: string,
  id?: string
): Promise<MessagePCD> {
  id = id ?? uuid();
  const int = bigintifyMsg(message);
  const signature = await EdDSAPCDPackage.prove({
    id: {
      argumentType: ArgumentTypeName.String,
      value: id
    },
    privateKey: {
      argumentType: ArgumentTypeName.String,
      value: privateKey
    },
    message: {
      argumentType: ArgumentTypeName.StringArray,
      value: [(int.int satisfies bigint).toString()]
    }
  });

  return new MessagePCD(id, message, {
    signature: signature,
    stringLength: int.len
  } satisfies MessageProof);
}
