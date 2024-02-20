import { EdDSAPCD, EdDSAPCDPackage } from "@pcd/eddsa-pcd";
import {
  ArgumentTypeName,
  DisplayOptions,
  PCD,
  PCDPackage,
  SerializedPCD,
  StringArgument
} from "@pcd/pcd-types";
import JSONBig from "json-bigint";
import { v4 as uuid } from "uuid";
import { getEdDSAMessageBody, stringToBigInts } from "./utils";

export const EdDSAMessagePCDTypeName = "eddsa-message-pcd";

export type EdDSAMessagePCDArgs = {
  privateKey: StringArgument;
  id: StringArgument;
  title: StringArgument;
  markdown: StringArgument;
};

export interface EdDSAMessagePCDBody {
  message: string;
  title: string;
}

export interface EdDSAMessagePCDClaim {}

export interface EdDSAMessagePCDProof {
  eddsaPCD: EdDSAPCD;
  bodyLength: number;
}

export class EdDSAMessagePCD
  implements PCD<EdDSAMessagePCDClaim, EdDSAMessagePCDProof>
{
  type = EdDSAMessagePCDTypeName;
  claim: EdDSAMessagePCDClaim;
  proof: EdDSAMessagePCDProof;
  id: string;

  public constructor(
    id: string,
    claim: EdDSAMessagePCDClaim,
    proof: EdDSAMessagePCDProof
  ) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}

export async function prove(
  args: EdDSAMessagePCDArgs
): Promise<EdDSAMessagePCD> {
  if (args.markdown.value == null) {
    throw new Error("missing markdown");
  }

  if (args.title.value == null) {
    throw new Error("missing title");
  }

  if (args.privateKey.value == null) {
    throw new Error("missing private key");
  }

  const body: EdDSAMessagePCDBody = {
    message: args.markdown.value,
    title: args.title.value
  };

  const stringifiedBody = JSON.stringify(body);
  const bodyAsBigIntArray = stringToBigInts(stringifiedBody).map((v) =>
    v.toString()
  );

  const proof = await EdDSAPCDPackage.prove({
    id: args.id,
    privateKey: args.privateKey,
    message: {
      argumentType: ArgumentTypeName.StringArray,
      value: bodyAsBigIntArray
    }
  });

  const id = args.id.value ?? uuid();

  return new EdDSAMessagePCD(
    id,
    {},
    { eddsaPCD: proof, bodyLength: stringifiedBody.length }
  );
}

export async function verify(pcd: EdDSAMessagePCD): Promise<boolean> {
  try {
    const valid = await EdDSAPCDPackage.verify(pcd.proof.eddsaPCD);
    return valid;
  } catch (e) {
    return false;
  }
}

export async function serialize(
  pcd: EdDSAMessagePCD
): Promise<SerializedPCD<EdDSAMessagePCD>> {
  const serializedEdDSAPCD = await EdDSAPCDPackage.serialize(
    pcd.proof.eddsaPCD
  );

  return {
    type: EdDSAMessagePCDTypeName,
    pcd: JSONBig().stringify({
      id: pcd.id,
      eddsaPCD: serializedEdDSAPCD,
      bodyLength: pcd.proof.bodyLength
    })
  } as SerializedPCD<EdDSAMessagePCD>;
}

export async function deserialize(
  serialized: string
): Promise<EdDSAMessagePCD> {
  const deserializedWrapper = JSONBig().parse(serialized);
  const deserializedEdDSAPCD = await EdDSAPCDPackage.deserialize(
    deserializedWrapper.eddsaPCD.pcd
  );
  return new EdDSAMessagePCD(
    deserializedWrapper.id,
    {},
    {
      eddsaPCD: deserializedEdDSAPCD,
      bodyLength: deserializedWrapper.bodyLength
    }
  );
}

export function getDisplayOptions(pcd: EdDSAMessagePCD): DisplayOptions {
  const body = getEdDSAMessageBody(pcd);
  return {
    header: body?.title ?? "untitled",
    displayName: "msg-" + pcd.id.substring(0, 4)
  };
}

/**
 * PCD-conforming wrapper to sign markdown messages using an EdDSA keypair.
 */
export const EdDSAMessagePCDPackage: PCDPackage<
  EdDSAMessagePCDClaim,
  EdDSAMessagePCDProof,
  EdDSAMessagePCDArgs
> = {
  name: EdDSAMessagePCDTypeName,
  getDisplayOptions,
  prove,
  verify,
  serialize,
  deserialize
};
