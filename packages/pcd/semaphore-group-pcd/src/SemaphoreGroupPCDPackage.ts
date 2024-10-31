import { DisplayOptions, PCDPackage, SerializedPCD } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { STATIC_SIGNATURE_PCD_NULLIFIER } from "@pcd/semaphore-signature-pcd";
import { requireDefinedParameter } from "@pcd/util";
import type { SemaphoreProof } from "@semaphore-protocol/proof";
import JSONBig from "json-bigint";
import { v4 as uuid } from "uuid";
import {
  SemaphoreGroupPCD,
  SemaphoreGroupPCDArgs,
  SemaphoreGroupPCDClaim,
  SemaphoreGroupPCDProof,
  SemaphoreGroupPCDTypeName,
  SempahoreGroupPCDInitArgs
} from "./SemaphoreGroupPCD";
import { deserializeSemaphoreGroup } from "./SerializedSemaphoreGroup";

let initArgs: SempahoreGroupPCDInitArgs | undefined = undefined;

export async function init(args: SempahoreGroupPCDInitArgs): Promise<void> {
  initArgs = args;
}

export async function prove(
  args: SemaphoreGroupPCDArgs
): Promise<SemaphoreGroupPCD> {
  if (!initArgs) {
    throw new Error("Cannot make group proof: init has not been called yet");
  }

  const serializedIdentityPCD = args.identity.value?.pcd;
  if (!serializedIdentityPCD) {
    throw new Error("Cannot make group proof: missing semaphore identity PCD");
  }
  const identityPCD = await SemaphoreIdentityPCDPackage.deserialize(
    serializedIdentityPCD
  );

  const serializedGroup = args.group.value;
  if (!serializedGroup) {
    throw new Error("Cannot make group proof: missing semaphore group");
  }

  if (!args.externalNullifier.value) {
    throw new Error("Cannot make group proof: missing externalNullifier");
  }

  if (!args.signal.value) {
    throw new Error("Cannot make group proof: missing signal");
  }

  // Restrict the SemaphoreGroupPCD from having the same externalNullifier as the
  // SemaphoreSignaturePCD. The nullifierHash in a SemaphoreGroupPCD is supposed
  // to be a unique string that is one-to-one with a specific member of the group,
  // but unlinkable to any specific member. However, if an adversarial SemaphoreGroupPCD
  // is set up with the same externalNullifier as the SemaphoreSignaturePCD, then the
  // outputted nullifierHash for a user will be the same as the nullifierHash outputted
  // from the same user's SemaphoreSignaturePCD. Thus, an adversary could link a
  // nullifierHash back to a user if they also have access to a signature from them,
  // which is unintended behavior that would break their anonymity.
  if (BigInt(args.externalNullifier.value) === STATIC_SIGNATURE_PCD_NULLIFIER) {
    throw new Error(
      "Cannot make group proof: same externalNullifier as SemaphoreSignaturePCD, which would break anonymity"
    );
  }

  const deserializedGroup = await deserializeSemaphoreGroup(serializedGroup);

  const { generateProof } = await import("@semaphore-protocol/proof");

  const fullProof = await generateProof(
    identityPCD.claim.identityV3,
    deserializedGroup,
    args.externalNullifier.value,
    args.signal.value,
    {
      zkeyFilePath: initArgs.zkeyFilePath,
      wasmFilePath: initArgs.wasmFilePath
    }
  );

  const claim: SemaphoreGroupPCDClaim = {
    merkleRoot: deserializedGroup.root.toString(),
    depth: deserializedGroup.depth,
    externalNullifier: args.externalNullifier.value.toString(),
    nullifierHash: fullProof.nullifierHash.toString(),
    signal: args.signal.value.toString()
  };

  const proof: SemaphoreGroupPCDProof = fullProof.proof;

  return new SemaphoreGroupPCD(uuid(), claim, proof);
}

export async function verify(pcd: SemaphoreGroupPCD): Promise<boolean> {
  const fullProof: SemaphoreProof = {
    externalNullifier: pcd.claim.externalNullifier,
    merkleTreeRoot: pcd.claim.merkleRoot + "",
    nullifierHash: pcd.claim.nullifierHash,
    signal: pcd.claim.signal,
    proof: pcd.proof
  };

  const { verifyProof } = await import("@semaphore-protocol/proof");

  const valid = await verifyProof(fullProof, pcd.claim.depth);

  return valid;
}

export async function serialize(
  pcd: SemaphoreGroupPCD
): Promise<SerializedPCD<SemaphoreGroupPCD>> {
  return {
    type: SemaphoreGroupPCDTypeName,
    pcd: JSONBig().stringify(pcd)
  } as SerializedPCD<SemaphoreGroupPCD>;
}

export async function deserialize(
  serialized: string
): Promise<SemaphoreGroupPCD> {
  const { id, claim, proof } = JSONBig().parse(serialized);

  requireDefinedParameter(id, "id");
  requireDefinedParameter(claim, "claim");
  requireDefinedParameter(proof, "proof");

  return new SemaphoreGroupPCD(id, claim, proof);
}

export function getDisplayOptions(pcd: SemaphoreGroupPCD): DisplayOptions {
  return {
    header: "Semaphore Group Signal",
    displayName: "semaphore-group-" + pcd.id.substring(0, 4)
  };
}

/**
 * PCD-conforming wrapper for the Semaphore zero-knowledge protocol. You can
 * find documentation of Semaphore here: https://semaphore.appliedzkp.org/docs/introduction
 */
export const SemaphoreGroupPCDPackage: PCDPackage<
  SemaphoreGroupPCDClaim,
  SemaphoreGroupPCDProof,
  SemaphoreGroupPCDArgs,
  SempahoreGroupPCDInitArgs
> = {
  name: SemaphoreGroupPCDTypeName,
  getDisplayOptions,
  init,
  prove,
  verify,
  serialize,
  deserialize
};
