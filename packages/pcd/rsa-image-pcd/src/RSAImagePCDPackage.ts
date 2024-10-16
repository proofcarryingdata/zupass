import {
  ArgumentTypeName,
  DisplayOptions,
  PCDPackage,
  SerializedPCD
} from "@pcd/pcd-types";
import { RSAPCDPackage } from "@pcd/rsa-pcd";
import JSONBig from "json-bigint";
import { v4 as uuid } from "uuid";
import {
  RSAImagePCD,
  RSAImagePCDArgs,
  RSAImagePCDClaim,
  RSAImagePCDProof,
  RSAImagePCDTypeName
} from "./RSAImagePCD";

export async function prove(args: RSAImagePCDArgs): Promise<RSAImagePCD> {
  if (args.url.value === undefined || args.url.value === "") {
    throw new Error("missing url");
  }

  if (args.title.value === undefined || args.title.value === "") {
    throw new Error("missing title");
  }

  if (args.privateKey.value === undefined || args.title.value === "") {
    throw new Error("missing private key");
  }

  const proof = await RSAPCDPackage.prove({
    id: args.id,
    privateKey: args.privateKey,
    signedMessage: {
      argumentType: ArgumentTypeName.String,
      value: JSON.stringify({
        url: args.url.value,
        title: args.title.value
      })
    }
  });

  const id = args.id.value ?? uuid();

  return new RSAImagePCD(id, {}, { rsaPCD: proof });
}

export async function verify(pcd: RSAImagePCD): Promise<boolean> {
  try {
    const valid = await RSAPCDPackage.verify(pcd.proof.rsaPCD);
    return valid;
  } catch (e) {
    return false;
  }
}

export async function serialize(
  pcd: RSAImagePCD
): Promise<SerializedPCD<RSAImagePCD>> {
  const serializedRSAPCD = await RSAPCDPackage.serialize(pcd.proof.rsaPCD);

  return {
    type: RSAImagePCDTypeName,
    pcd: JSONBig().stringify({
      id: pcd.id,
      rsaPCD: serializedRSAPCD
    })
  } as SerializedPCD<RSAImagePCD>;
}

export async function deserialize(serialized: string): Promise<RSAImagePCD> {
  const deserializedWrapper = JSONBig().parse(serialized);
  const deserializedRSAPCD = await RSAPCDPackage.deserialize(
    deserializedWrapper.rsaPCD.pcd
  );
  return new RSAImagePCD(
    deserializedWrapper.id,
    {},
    { rsaPCD: deserializedRSAPCD }
  );
}

export function getDisplayOptions(pcd: RSAImagePCD): DisplayOptions {
  // todo: create a helper for this
  const imageData = JSON.parse(pcd.proof.rsaPCD.claim.message);
  const header = imageData.title;

  return {
    header: header,
    displayName: "image-" + pcd.id.substring(0, 4)
  };
}

/**
 * PCD-conforming wrapper to sign image urls using an RSA keypair.
 */
export const RSAImagePCDPackage: PCDPackage<
  RSAImagePCDClaim,
  RSAImagePCDProof,
  RSAImagePCDArgs
> = {
  name: RSAImagePCDTypeName,
  getDisplayOptions,
  prove,
  verify,
  serialize,
  deserialize
};
