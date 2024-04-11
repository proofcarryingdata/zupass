import {
  BigIntArgument,
  ObjectArgument,
  PCD,
  PCDArgument,
  StringArgument
} from "@pcd/pcd-types";
import { SerializedSemaphoreGroup } from "@pcd/semaphore-group-pcd";
import { SemaphoreIdentityPCD } from "@pcd/semaphore-identity-pcd";
import { Proof, RLN, RLNFullProof } from "rlnjs";
import { v4 as uuid } from "uuid";

export const RLNPCDTypeName = "rln-pcd";

export interface RLNPCDInitArgs {
  zkeyFilePath: string;
  wasmFilePath: string;
}

// Ref: https://github.com/Rate-Limiting-Nullifier/rlnjs/blob/97fe15e04428c6adf81dbc856859e07527a063c9/src/types.ts#L59-L66
export type RLNPCDArgs = {
  // Identifier of the app. Every app using RLN should use a unique identifier.
  rlnIdentifier: BigIntArgument;
  // The semaphore keypair for a user
  identity: PCDArgument<SemaphoreIdentityPCD>;
  // The semaphore group
  group: ObjectArgument<SerializedSemaphoreGroup>;
  // The message that the user is sending
  signal: StringArgument;
  // The timestamp the message is sent
  epoch: BigIntArgument;
};

// https://rate-limiting-nullifier.github.io/rln-docs/protocol_spec.html#technical-side-of-rln
export interface RLNPCDClaim {
  // The message that the user is sending
  x: bigint;
  // The timestamp the message is sent
  epoch: bigint;
  // Identifier of the app. Every app using RLN should use a unique identifier.
  rlnIdentifier: bigint;
  // The y value calculated from the polynomial of x
  yShare: bigint;
  // The merkle root of the identity commitment tree
  merkleRoot: bigint;
  // The unique identifier for (rlnIdentifier, epoch, identity)
  internalNullifier: bigint;
}

export interface RLNPCDProof {
  // snarkjs proof, including curve points and the protocol metadata
  proof: Proof;
  // The unique identifier for (rlnIdentifier, epoch)
  externalNullifier: bigint;
}

export class RLNPCD implements PCD<RLNPCDClaim, RLNPCDProof> {
  type = RLNPCDTypeName;

  public constructor(
    readonly id: string,
    readonly claim: RLNPCDClaim,
    readonly proof: RLNPCDProof
  ) {
    checkClaimProofMatching(claim, proof);
  }

  static fromRLNFullProof(rlnFullProof: RLNFullProof): RLNPCD {
    const publicSignals = rlnFullProof.snarkProof.publicSignals;
    const claim: RLNPCDClaim = {
      x: BigInt(publicSignals.signalHash),
      epoch: rlnFullProof.epoch,
      rlnIdentifier: rlnFullProof.rlnIdentifier,
      yShare: BigInt(publicSignals.yShare),
      merkleRoot: BigInt(publicSignals.merkleRoot),
      internalNullifier: BigInt(publicSignals.internalNullifier)
    };
    const proof: RLNPCDProof = {
      proof: rlnFullProof.snarkProof.proof,
      externalNullifier: BigInt(publicSignals.externalNullifier)
    };
    return new RLNPCD(uuid(), claim, proof);
  }

  toRLNFullProof(): RLNFullProof {
    return {
      snarkProof: {
        proof: this.proof.proof,
        publicSignals: {
          yShare: this.claim.yShare,
          merkleRoot: this.claim.merkleRoot,
          internalNullifier: this.claim.internalNullifier,
          signalHash: this.claim.x,
          externalNullifier: this.proof.externalNullifier
        }
      },
      epoch: this.claim.epoch,
      rlnIdentifier: this.claim.rlnIdentifier
    };
  }
}

export function checkClaimProofMatching(
  claim: RLNPCDClaim,
  proof: RLNPCDProof
): void {
  const claimExternalNullifier = RLN._genNullifier(
    claim.epoch,
    claim.rlnIdentifier
  );
  if (claimExternalNullifier !== proof.externalNullifier) {
    throw new Error(
      `claim and proof mismatch: claimExternalNullifier=${claimExternalNullifier}, ` +
        `proof.externalNullifier=${proof.externalNullifier}`
    );
  }
}
