import {
  PCD,
  PCDArgument,
  PCDPackage,
  SerializedPCD,
  StringArgument,
} from "@pcd/pcd-types";
import {
  SemaphoreIdentityPCD,
  SemaphoreIdentityPCDPackage,
} from "@pcd/semaphore-identity-pcd";
import { Group } from "@semaphore-protocol/group";
import {
  FullProof,
  generateProof,
  Proof,
  verifyProof,
} from "@semaphore-protocol/proof";
import { sha256 } from "js-sha256";
import JSONBig from "json-bigint";
import { v4 as uuid } from "uuid";

/**
 * All signature PCDs are 'namespaced' to this pseudo-random nullifier,
 * so that they cannot be reused by malicious actors across different
 * applications.
 */
export const STATIC_SIGNATURE_PCD_NULLIFIER = generateMessageHash(
  "hardcoded-nullifier"
);

/**
 * Hashes a message to be signed with sha256 and fits it into a baby jub jub field element.
 * @param signal The initial message.
 * @returns The outputted hash, fed in as a signal to the Semaphore proof.
 */
export function generateMessageHash(signal: string): bigint {
  // right shift to fit into a field element, which is 254 bits long
  // shift by 8 ensures we have a 253 bit element
  return BigInt("0x" + sha256(signal)) >> BigInt(8);
}

export const SemaphoreSignaturePCDTypeName = "semaphore-signature-pcd";

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

// We hardcode the externalNullifer to also be your identityCommitment
// so that your nullifier for specific groups is not revealed when
// a SemaphoreSignaturePCD is requested from a consumer application.
export interface SemaphoreSignaturePCDArgs {
  identity: PCDArgument<SemaphoreIdentityPCD>;
  signedMessage: StringArgument;
}

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

export type SemaphoreSignaturePCDProof = Proof;
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
  const signal = generateMessageHash(args.signedMessage.value);

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
      wasmFilePath: initArgs.wasmFilePath,
    }
  );

  const claim: SemaphoreSignaturePCDClaim = {
    identityCommitment: identityPCD.claim.identity.commitment.toString(),
    signedMessage: args.signedMessage.value,
    nullifierHash: fullProof.nullifierHash + "",
  };

  const proof: SemaphoreSignaturePCDProof = fullProof.proof;

  return new SemaphoreSignaturePCD(uuid(), claim, proof);
}

export async function verify(pcd: SemaphoreSignaturePCD): Promise<boolean> {
  // Set up singleton group
  const group = new Group(1, 16);
  group.addMember(pcd.claim.identityCommitment);

  // Convert PCD into Semaphore FullProof
  const fullProof: FullProof = {
    externalNullifier: STATIC_SIGNATURE_PCD_NULLIFIER,
    merkleTreeRoot: group.root + "",
    nullifierHash: pcd.claim.nullifierHash,
    proof: pcd.proof,
    signal: generateMessageHash(pcd.claim.signedMessage),
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
    pcd: JSONBig().stringify(pcd),
  } as SerializedPCD<SemaphoreSignaturePCD>;
}

export async function deserialize(
  serialized: string
): Promise<SemaphoreSignaturePCD> {
  return JSONBig().parse(serialized);
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
  init,
  prove,
  verify,
  serialize,
  deserialize,
};
