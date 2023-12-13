import {
  BigIntArgument,
  DisplayOptions,
  ObjectArgument,
  PCD,
  PCDArgument,
  PCDPackage,
  SerializedPCD
} from "@pcd/pcd-types";
import {
  SemaphoreIdentityPCD,
  SemaphoreIdentityPCDPackage
} from "@pcd/semaphore-identity-pcd";
import { STATIC_SIGNATURE_PCD_NULLIFIER } from "@pcd/semaphore-signature-pcd";
import { requireDefinedParameter } from "@pcd/util";
import {
  PackedProof,
  SemaphoreProof,
  generateProof,
  verifyProof
} from "@semaphore-protocol/proof";
import JSONBig from "json-bigint";
import { v4 as uuid } from "uuid";
import {
  SerializedSemaphoreGroup,
  deserializeSemaphoreGroup
} from "./SerializedSemaphoreGroup";

let initArgs: SempahoreGroupPCDInitArgs | undefined = undefined;

export const SemaphoreGroupPCDTypeName = "semaphore-group-signal";

export interface SempahoreGroupPCDInitArgs {
  // TODO: how do we distribute these in-package, so that consumers
  // of the package don't have to copy-paste these artifacts?
  // TODO: how do we account for different versions of the same type
  // of artifact? eg. this one is parameterized by group size. Should
  // we pre-generate a bunch of artifacts per possible group size?
  // Should we do code-gen?
  zkeyFilePath: string;
  wasmFilePath: string;
}

export type SemaphoreGroupPCDArgs = {
  group: ObjectArgument<SerializedSemaphoreGroup>;
  identity: PCDArgument<SemaphoreIdentityPCD>;
  externalNullifier: BigIntArgument;
  signal: BigIntArgument;
};

export interface SemaphoreGroupPCDClaim {
  /**
   * The merkle root of the group being proven membership in. Retreiving members
   * in the root is left to the application logic.
   */
  merkleRoot: string;

  /**
   * Depth of the tree for the Merkle root.
   */
  depth: number;

  /**
   * Stringified `BigInt`.
   */
  signal: string;

  /**
   * Stringified `BigInt`.
   */
  externalNullifier: string;

  /**
   * Stringified `BigInt`.
   */
  nullifierHash: string;
}

export type SemaphoreGroupPCDProof = PackedProof;

export class SemaphoreGroupPCD
  implements PCD<SemaphoreGroupPCDClaim, SemaphoreGroupPCDProof>
{
  type = SemaphoreGroupPCDTypeName;
  claim: SemaphoreGroupPCDClaim;
  proof: SemaphoreGroupPCDProof;
  id: string;

  public constructor(
    id: string,
    claim: SemaphoreGroupPCDClaim,
    proof: SemaphoreGroupPCDProof
  ) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}

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

  const deserializedGroup = deserializeSemaphoreGroup(serializedGroup);

  const fullProof = await generateProof(
    identityPCD.claim.identity,
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
