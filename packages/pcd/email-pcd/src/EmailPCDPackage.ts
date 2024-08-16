import { DisplayOptions, PCDPackage, SerializedPCD } from "@pcd/pcd-types";
import { POD, podEntriesFromSimplifiedJSON } from "@pcd/pod";
import { generateSnarkMessageHash, requireDefinedParameter } from "@pcd/util";
import JSONBig from "json-bigint";
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

  const pod = POD.sign(
    podEntriesFromSimplifiedJSON(
      JSON.stringify({
        hashedEmail: hashedEmail.toString(),
        semaphoreId: args.semaphoreId.value
      })
    ),
    args.privateKey.value
  );

  const id = args.id.value ?? uuid();

  return new EmailPCD(
    id,
    {
      emailAddress: args.emailAddress.value,
      semaphoreId: args.semaphoreId.value,
      signerPublicKey: pod.signerPublicKey
    },
    { signature: pod.signature }
  );
}

export async function verify(pcd: EmailPCD): Promise<boolean> {
  try {
    const hashedEmail = generateSnarkMessageHash(pcd.claim.emailAddress);

    const loadedPOD = POD.load(
      podEntriesFromSimplifiedJSON(
        JSON.stringify({
          hashedEmail: hashedEmail.toString(),
          semaphoreId: pcd.claim.semaphoreId
        })
      ),
      pcd.proof.signature,
      pcd.claim.signerPublicKey
    );

    return (
      loadedPOD.signature === pcd.proof.signature && loadedPOD.verifySignature()
    );
  } catch (e) {
    console.error("Verifying invalid POD data:", e);
    return false;
  }
}

export async function serialize(
  pcd: EmailPCD
): Promise<SerializedPCD<EmailPCD>> {
  return {
    type: EmailPCDTypeName,
    pcd: JSONBig().stringify({
      id: pcd.id,
      claim: pcd.claim,
      proof: pcd.proof
    })
  } as SerializedPCD<EmailPCD>;
}

export async function deserialize(serialized: string): Promise<EmailPCD> {
  const deserialized = JSONBig().parse(serialized);
  requireDefinedParameter(deserialized.id, "id");
  requireDefinedParameter(deserialized.claim, "claim");
  requireDefinedParameter(
    deserialized.claim.signerPublicKey,
    "signerPublicKey"
  );
  requireDefinedParameter(deserialized.proof, "proof");
  requireDefinedParameter(deserialized.proof.signature, "signature");

  return new EmailPCD(deserialized.id, deserialized.claim, deserialized.proof);
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
