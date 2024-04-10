import {
  PCD,
  PCDArgument,
  SerializedPCD,
  StringArgument
} from "@pcd/pcd-types";
import { SemaphoreIdentityPCD } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCD } from "@pcd/semaphore-signature-pcd";
import { ProverConfig, PublicInput } from "@personaelabs/spartan-ecdsa";

export const EthereumGroupPCDTypeName = "ethereum-group-pcd";

export interface EthereumGroupPCDInitArgs {
  // TODO: how do we distribute these in-package, so that consumers
  // of the package don't have to copy-paste these artifacts?
  // TODO: how do we account for different versions of the same type
  // of artifact? eg. this one is parameterized by group size. Should
  // we pre-generate a bunch of artifacts per possible group size?
  // Should we do code-gen?
  zkeyFilePath: string;
  wasmFilePath: string;

  addrMembershipConfig: ProverConfig;
  pubkeyMembershipConfig: ProverConfig;
}

export type EthereumGroupPCDArgs = {
  identity: PCDArgument<SemaphoreIdentityPCD>;
  signatureOfIdentityCommitment: StringArgument;
  merkleProof: StringArgument;
  groupType: StringArgument;
};

export interface EthereumGroupPCDClaim {
  publicInput: PublicInput;
  groupType: GroupType;
}

export enum GroupType {
  PUBLICKEY = "public_key",
  ADDRESS = "address"
}

export interface EthereumGroupPCDProof {
  /**
   * A signature of the serialized spartan-ecdsa group membership proof, using a semaphore identity.
   */
  signatureProof: SerializedPCD<SemaphoreSignaturePCD>;

  /**
   * A hex string of the NIZK proof format defined in https://github.com/personaelabs/spartan-ecdsa
   *
   * In the group membership proof, the semaphore identity is used as the message to sign.
   *
   * https://github.com/personaelabs/spartan-ecdsa/blob/5dae5e1aa4eda726ddffc08eaec0144d003a98a0/packages/Spartan-secq/src/lib.rs#L491
   *
   * https://github.com/personaelabs/spartan-ecdsa/blob/5dae5e1aa4eda726ddffc08eaec0144d003a98a0/packages/Spartan-secq/src/r1csproof.rs#L23
   */
  ethereumGroupProof: string;
}

export class EthereumGroupPCD
  implements PCD<EthereumGroupPCDClaim, EthereumGroupPCDProof>
{
  type = EthereumGroupPCDTypeName;
  claim: EthereumGroupPCDClaim;
  proof: EthereumGroupPCDProof;
  id: string;

  public constructor(
    id: string,
    claim: EthereumGroupPCDClaim,
    proof: EthereumGroupPCDProof
  ) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}
