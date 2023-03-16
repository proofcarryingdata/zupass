import {
  BigIntArgument,
  ObjectArgument,
  PCD,
  PCDArgument,
  PCDArguments,
  PCDPackage,
  SerializedPCD,
} from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import {
  FullProof,
  generateProof,
  verifyProof,
} from "@semaphore-protocol/proof";
import JSONBig from "json-bigint";
import { v4 as uuid } from "uuid";
import {
  deserializeSemaphoreGroup,
  SerializedSemaphoreGroup,
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

export interface SemaphoreGroupPCDArgs extends PCDArguments {
  group: ObjectArgument<SerializedSemaphoreGroup>;
  identity: PCDArgument<SemaphoreGroupPCD>;
  externalNullifier: BigIntArgument;
  signal: BigIntArgument;
}

export interface SemaphoreGroupPCDClaim {
  group: SerializedSemaphoreGroup;

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

export interface SemaphoreGroupPCDProof {
  proof: FullProof;
}

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
    throw new Error("cannot make group proof: init has not been called yet");
  }

  const serializedIdentityPCD = args.identity.value?.pcd;
  if (!serializedIdentityPCD) {
    throw new Error("cannot make group proof: missing semaphore identity PCD");
  }
  const identityPCD = await SemaphoreIdentityPCDPackage.deserialize(
    serializedIdentityPCD
  );

  const serializedGroup = args.group.value;
  if (!serializedGroup) {
    throw new Error("cannot make group proof: missing semaphore group");
  }
  const deserializedGroup = deserializeSemaphoreGroup(serializedGroup);

  const fullProof = await generateProof(
    identityPCD.claim.identity,
    deserializedGroup,
    args.externalNullifier.value!,
    args.signal.value!,
    {
      zkeyFilePath: initArgs.zkeyFilePath,
      wasmFilePath: initArgs.wasmFilePath,
    }
  );

  const claim: SemaphoreGroupPCDClaim = {
    group: serializedGroup,
    externalNullifier: args.externalNullifier.toString(),
    nullifierHash: fullProof.nullifierHash.toString(),
    signal: args.signal.toString(),
  };

  const proof: SemaphoreGroupPCDProof = {
    proof: fullProof,
  };

  return new SemaphoreGroupPCD(uuid(), claim, proof);
}

export async function verify(pcd: SemaphoreGroupPCD): Promise<boolean> {
  const valid = await verifyProof(pcd.proof.proof, pcd.claim.group.depth);

  return valid;
}

export async function serialize(
  pcd: SemaphoreGroupPCD
): Promise<SerializedPCD> {
  return { type: SemaphoreGroupPCDTypeName, pcd: JSONBig().stringify(pcd) };
}

export async function deserialize(
  serialized: string
): Promise<SemaphoreGroupPCD> {
  return JSONBig().parse(serialized);
}

/**
 * PCD-conforming wrapper for the Semaphore zero-knowledge protocol. You can
 * find documentation of Semaphore here: https://semaphore.appliedzkp.org/docs/introduction
 */
export const SemaphoreGroupPCDPackage: PCDPackage<
  SemaphoreGroupPCDClaim,
  SemaphoreGroupPCDProof,
  SemaphoreGroupPCDArgs
> = {
  name: SemaphoreGroupPCDTypeName,
  init,
  prove,
  verify,
  serialize,
  deserialize,
};
