import { EdDSAPCDPackage } from "@pcd/eddsa-pcd";
import {
  ArgumentTypeName,
  DisplayOptions,
  PCDPackage,
  SerializedPCD
} from "@pcd/pcd-types";
import { generateSnarkMessageHash } from "@pcd/util";
import JSONBig from "json-bigint";
import _ from "lodash";
import { v4 as uuid } from "uuid";
import {
  EmailPCD,
  EmailPCDArgs,
  EmailPCDClaim,
  EmailPCDProof,
  EmailPCDTypeName
} from "./EmailPCD";

export async function prove(args: EmailPCDArgs): Promise<EmailPCD> {
  if (!args.privateKey.value) {
    throw new Error("missing private key");
  }

  if (!args.emailAddress.value) {
    throw new Error("missing email value");
  }

  if (!args.semaphoreId.value) {
    throw new Error("missing semaphore id");
  }

  // Hashes email and returns bigint representation of hash
  const hashedEmail = generateSnarkMessageHash(args.emailAddress.value);

  const eddsaPCD = await EdDSAPCDPackage.prove({
    message: {
      value: [hashedEmail.toString(), args.semaphoreId.value],
      argumentType: ArgumentTypeName.StringArray
    },
    privateKey: {
      value: args.privateKey.value,
      argumentType: ArgumentTypeName.String
    },
    id: {
      value: args.id.value ? args.id.value + "-signature" : undefined,
      argumentType: ArgumentTypeName.String
    }
  });

  const id = args.id.value ?? uuid();

  return new EmailPCD(
    id,
    {
      emailAddress: args.emailAddress.value,
      semaphoreId: args.semaphoreId.value,
      semaphoreV4Id: args.semaphoreV4Id.value
    },
    { eddsaPCD }
  );
}

export async function verify(pcd: EmailPCD): Promise<boolean> {
  const messageDerivedFromClaim = generateSnarkMessageHash(
    pcd.claim.emailAddress
  );

  if (
    !_.isEqual(
      [messageDerivedFromClaim, BigInt(pcd.claim.semaphoreId)],
      pcd.proof.eddsaPCD.claim.message
    )
  ) {
    return false;
  }

  try {
    const valid = await EdDSAPCDPackage.verify(pcd.proof.eddsaPCD);
    return valid;
  } catch (e) {
    return false;
  }
}

export async function serialize(
  pcd: EmailPCD
): Promise<SerializedPCD<EmailPCD>> {
  const serializedEdDSAPCD = await EdDSAPCDPackage.serialize(
    pcd.proof.eddsaPCD
  );

  return {
    type: EmailPCDTypeName,
    pcd: JSONBig().stringify({
      id: pcd.id,
      eddsaPCD: serializedEdDSAPCD,
      emailAddress: pcd.claim.emailAddress,
      semaphoreId: pcd.claim.semaphoreId
    })
  } as SerializedPCD<EmailPCD>;
}

export async function deserialize(serialized: string): Promise<EmailPCD> {
  const deserializedWrapper = JSONBig().parse(serialized);
  const deserializedEdDSAPCD = await EdDSAPCDPackage.deserialize(
    deserializedWrapper.eddsaPCD.pcd
  );
  return new EmailPCD(
    deserializedWrapper.id,
    {
      emailAddress: deserializedWrapper.emailAddress,
      semaphoreId: deserializedWrapper.semaphoreId
    },
    { eddsaPCD: deserializedEdDSAPCD }
  );
}

export function getDisplayOptions(pcd: EmailPCD): DisplayOptions {
  return {
    header: "Verified email",
    displayName: pcd.claim.emailAddress
  };
}

/**
 * PCD-conforming wrapper to sign messages using an EdDSA keypair,
 * representing an attested email.
 */
export const EmailPCDPackage: PCDPackage<
  EmailPCDClaim,
  EmailPCDProof,
  EmailPCDArgs,
  undefined
> = {
  name: EmailPCDTypeName,
  getDisplayOptions,
  prove,
  verify,
  serialize,
  deserialize
};
