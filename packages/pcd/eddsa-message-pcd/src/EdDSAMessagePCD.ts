import { EdDSAPCD, EdDSAPCDPackage } from "@pcd/eddsa-pcd";
import {
  DisplayOptions,
  PCD,
  PCDPackage,
  SerializedPCD,
  StringArgument
} from "@pcd/pcd-types";
import { SemaphoreSignaturePCD } from "@pcd/semaphore-signature-pcd";
import JSONBig from "json-bigint";
import { eddsaSign, getMessage } from "./utils";

export const EdDSAMessagePCDTypeName = "eddsa-message-pcd";

export type EdDSAMessagePCDArgs = {
  privateKey: StringArgument;
  id: StringArgument;
  title: StringArgument;
  markdown: StringArgument;
};

/**
 * EdDSA signed message. Signing generally provided by {@link prove}.
 */
export interface BaseSignedMessage {
  /**
   * ID. Generally set to equal the id of its wrapping
   * {@link EdDSAMessagePCD}.
   */
  id?: string;

  /**
   * Used by Zupass client as the display name shown in the
   * title of PCDs.
   */
  displayName?: string;

  /**
   * Markdown formatted body.
   */
  mdBody?: string;

  authorSemaphoreV3Id?: string;
  authorSemaphoreV3Signature?: SerializedPCD<SemaphoreSignaturePCD>;

  authorSemaphoreV4Id?: string;
  authorSemaphoreV4Signature?: SerializedPCD<SemaphoreSignaturePCD>;

  nonce?: number;
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

  const body: BaseSignedMessage = {
    mdBody: args.markdown.value,
    displayName: args.title.value
  };

  return eddsaSign(body, args.privateKey.value);
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
