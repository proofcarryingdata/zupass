import { DisplayOptions, PCD, PCDPackage, SerializedPCD } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { generateSnarkMessageHash, requireDefinedParameter } from "@pcd/util";
import { Group } from "@semaphore-protocol/group";
import {
  PackedProof,
  SemaphoreProof,
  generateProof,
  verifyProof
} from "@semaphore-protocol/proof";
import JSONBig from "json-bigint";
import { v4 as uuid } from "uuid";
import {
  SemaphoreSignaturePCDArgs,
  SemaphoreSignaturePCDTypeName
} from "./args";

/**
 * All signature PCDs are 'namespaced' to this pseudo-random nullifier,
 * so that they cannot be reused by malicious actors across different
 * applications.
 */
export const STATIC_SIGNATURE_PCD_NULLIFIER = generateSnarkMessageHash(
  "hardcoded-nullifier"
);

export interface SemaphoreSignaturePCDInitArgs {
  // TODO: how do we distribute these in-package, so that consumers
  // of the package don't have to copy-paste these artifacts?
  // TODO: how do we account for different versions of the same type
  // of artifact? eg. this one is parameterized by group size. Should
  // we pre-generate a bunch of artifacts per possible group size?
  // Should we do code-gen?
  zkeyFilePath: string;
  wasmFilePath: string;
}

let initArgs: SemaphoreSignaturePCDInitArgs | undefined = undefined;

export interface SemaphoreSignaturePCDClaim {
  /**
   * Pre-hashed message.
   */
  signedMessage: string;

  /**
   * Stringified `BigInt`.
   */
  identityCommitment: string;

  /**
   * Stringified `BigInt`.
   */
  nullifierHash: string;
}

export type SemaphoreSignaturePCDProof = PackedProof;
export class SemaphoreSignaturePCD
  implements PCD<SemaphoreSignaturePCDClaim, SemaphoreSignaturePCDProof>
{
  type = SemaphoreSignaturePCDTypeName;
  claim: SemaphoreSignaturePCDClaim;
  proof: SemaphoreSignaturePCDProof;
  id: string;

  public constructor(
    id: string,
    claim: SemaphoreSignaturePCDClaim,
    proof: SemaphoreSignaturePCDProof
  ) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}

export async function init(args: SemaphoreSignaturePCDInitArgs): Promise<void> {
  initArgs = args;
}

export async function prove(
  args: SemaphoreSignaturePCDArgs
): Promise<SemaphoreSignaturePCD> {
  if (!initArgs) {
    throw new Error(
      "cannot make semaphore signature proof: init has not been called yet"
    );
  }

  const serializedIdentityPCD = args.identity.value?.pcd;
  if (!serializedIdentityPCD) {
    throw new Error(
      "cannot make semaphore signature proof: identity is not set"
    );
  }
  const identityPCD = await SemaphoreIdentityPCDPackage.deserialize(
    serializedIdentityPCD
  );

  if (args.signedMessage.value === undefined) {
    throw new Error(
      "cannot make semaphore signature proof: signed message is not set"
    );
  }

  // Set up singleton group
  const group = new Group(1, 16);
  group.addMember(identityPCD.claim.identity.commitment);

  // Get Keccak256 hashed version of message for input into Semaphore
  const signal = generateSnarkMessageHash(args.signedMessage.value);

  // Set externalNullifier to be identity commitment to avoid nullifier
  // of other groups being exposed. This means that one must not use their
  // identity commitment as an externalNullifier for other groups, if they
  // wish to maintain anonymity.
  const fullProof = await generateProof(
    identityPCD.claim.identity,
    group,
    STATIC_SIGNATURE_PCD_NULLIFIER,
    signal,
    {
      zkeyFilePath: initArgs.zkeyFilePath,
      wasmFilePath: initArgs.wasmFilePath
    }
  );

  const claim: SemaphoreSignaturePCDClaim = {
    identityCommitment: identityPCD.claim.identity.commitment.toString(),
    signedMessage: args.signedMessage.value,
    nullifierHash: fullProof.nullifierHash + ""
  };

  const proof: SemaphoreSignaturePCDProof = fullProof.proof;

  return new SemaphoreSignaturePCD(uuid(), claim, proof);
}

export async function verify(pcd: SemaphoreSignaturePCD): Promise<boolean> {
  // Set up singleton group
  const group = new Group(1, 16);
  group.addMember(pcd.claim.identityCommitment);

  // Convert PCD into Semaphore FullProof
  const fullProof: SemaphoreProof = {
    externalNullifier: STATIC_SIGNATURE_PCD_NULLIFIER.toString(),
    merkleTreeRoot: group.root + "",
    nullifierHash: pcd.claim.nullifierHash,
    proof: pcd.proof,
    signal: generateSnarkMessageHash(pcd.claim.signedMessage).toString()
  };

  // check if proof is valid
  const validProof = await verifyProof(fullProof, 16);

  return validProof;
}

export async function serialize(
  pcd: SemaphoreSignaturePCD
): Promise<SerializedPCD<SemaphoreSignaturePCD>> {
  return {
    type: SemaphoreSignaturePCDTypeName,
    pcd: JSONBig().stringify(pcd)
  } as SerializedPCD<SemaphoreSignaturePCD>;
}

export async function deserialize(
  serialized: string
): Promise<SemaphoreSignaturePCD> {
  const { id, claim, proof } = JSONBig().parse(serialized);

  requireDefinedParameter(id, "id");
  requireDefinedParameter(claim, "claim");
  requireDefinedParameter(proof, "proof");

  return new SemaphoreSignaturePCD(id, claim, proof);
}

export function getDisplayOptions(pcd: SemaphoreSignaturePCD): DisplayOptions {
  return {
    header: "Semaphore Signature",
    displayName: "semaphore-sig-" + pcd.id.substring(0, 4)
  };
}

/**
 * PCD-conforming wrapper to sign messages using one's Semaphore public key. This is a small
 * extension of the existing Semaphore protocol, which is mostly geared at group signatures.
 * Find documentation of Semaphore here: https://semaphore.appliedzkp.org/docs/introduction
 */
export const SemaphoreSignaturePCDPackage: PCDPackage<
  SemaphoreSignaturePCDClaim,
  SemaphoreSignaturePCDProof,
  SemaphoreSignaturePCDArgs,
  SemaphoreSignaturePCDInitArgs
> = {
  name: SemaphoreSignaturePCDTypeName,
  getDisplayOptions,
  init,
  prove,
  verify,
  serialize,
  deserialize
};
