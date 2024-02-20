import { EdDSAPCDPackage } from "@pcd/eddsa-pcd";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { v4 as uuid } from "uuid";
import { Message } from "../Message";
import { MessagePCD } from "../MessagePCD";
import { serializeUtf8String } from "./serialization";

/**
 * Given a message to sign and a private key, returns
 * a signature wrapped in a {@link PCD}, which is consumable
 * by the rest of the PCD framework.
 */
export async function eddsaSign(
  message: Message,
  privateKey: string,
  id?: string
): Promise<MessagePCD> {
  const stringifiedBody = JSON.stringify(message);
  const stringifiedBodyAsBigInt: bigint = serializeUtf8String(stringifiedBody);
  const signature = await EdDSAPCDPackage.prove({
    id: {
      argumentType: ArgumentTypeName.String,
      value: uuid()
    },
    privateKey: {
      argumentType: ArgumentTypeName.String,
      value: privateKey
    },
    message: {
      argumentType: ArgumentTypeName.StringArray,
      value: [stringifiedBodyAsBigInt.toString()]
    }
  });
  return new MessagePCD(
    id ?? uuid(),
    {},
    { signature: signature, stringLength: stringifiedBody.length }
  );
}
