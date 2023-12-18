import {
  BigIntArgument,
  ObjectArgument,
  PCD,
  PCDArgument,
  PCDPackage,
  SerializedPCD,
  StringArgument
} from "@pcd/pcd-types";
import {
  SerializedSemaphoreGroup,
  deserializeSemaphoreGroup
} from "@pcd/semaphore-group-pcd";
import {
  SemaphoreIdentityPCD,
  SemaphoreIdentityPCDPackage
} from "@pcd/semaphore-identity-pcd";
import { requireDefinedParameter } from "@pcd/util";
import { Identity } from "@semaphore-protocol/identity";
import JSONBig from "json-bigint";
import { Proof, RLN, RLNFullProof } from "rlnjs";
import { v4 as uuid } from "uuid";
import verificationKeyJSON from "../artifacts/16.json";

let initArgs: RLNPCDInitArgs | undefined = undefined;

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

function checkClaimProofMatching(claim: RLNPCDClaim, proof: RLNPCDProof) {
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

export async function init(args: RLNPCDInitArgs) {
  initArgs = args;
}

export async function prove(args: RLNPCDArgs): Promise<RLNPCD> {
  if (!initArgs) {
    throw new Error("cannot make proof: init has not been called yet");
  }

  // Make sure all arguments are provided
  const rlnIdentifier = args.rlnIdentifier.value;
  if (!rlnIdentifier) {
    throw new Error("cannot make proof: rlnIdentifier is not provided");
  }
  const serializedIdentityPCD = args.identity.value?.pcd;
  if (!serializedIdentityPCD) {
    throw new Error("cannot make proof: missing semaphore identity PCD");
  }
  const identityPCD = await SemaphoreIdentityPCDPackage.deserialize(
    serializedIdentityPCD
  );
  const serializedGroup = args.group.value;
  if (!serializedGroup) {
    throw new Error("cannot make proof: group is not provided");
  }
  const epoch = args.epoch.value;
  if (!epoch) {
    throw new Error("cannot make proof: epoch is not provided");
  }
  const signal = args.signal.value;
  if (!signal) {
    throw new Error("cannot make proof: signal is not provided");
  }
  const identity = identityPCD.claim.identity;
  const rln = getRLNInstance(BigInt(rlnIdentifier), identity);
  const group = deserializeSemaphoreGroup(serializedGroup);
  const leafIndex = group.indexOf(identity.getCommitment());
  const merkleProof = group.generateMerkleProof(leafIndex);
  const fullProof = await rln.generateProof(signal, merkleProof, epoch);
  return RLNPCD.fromRLNFullProof(fullProof);
}

export async function verify(pcd: RLNPCD): Promise<boolean> {
  checkClaimProofMatching(pcd.claim, pcd.proof);
  const fullProof = pcd.toRLNFullProof();
  return await RLN.verifySNARKProof(verificationKeyJSON, fullProof.snarkProof);
}

function getRLNInstance(rlnIdentifier: bigint, identity?: Identity) {
  if (!initArgs) {
    throw new Error("cannot make proof: init has not been called yet");
  }
  // NOTE: here we preprocess output from `Identity.toString` in order to make it accepted
  // by `Identity.constructor` in RLN. This is a temporary workaround since if the output
  // from `identity.toString()` is directly passed to `RLN` we'll get an error like this:
  // 'Error: invalid BigNumber string (argument="value", value="0x0xc3443f53e7bc98ca74270fdc822b2750c500e66e0d685649c418d8dc813f86", code=INVALID_ARGUMENT, version=bignumber/5.7.0)'
  // TODO: This preprocessing will be unnecessary when we make RLN accept `Identity` directly.
  let identityStr: string | undefined;
  if (identity) {
    // Preprocess output from `Identity.toString` in order to make it accepted by `Identity.constructor` in RLN
    const obj: string[] = JSON.parse(identity.toString());
    identityStr = JSON.stringify(obj.map((e) => BigInt(e).toString(16)));
  } else {
    // Leave it undefined and let RLN handle it
    identityStr = undefined;
  }

  return new RLN(
    initArgs.wasmFilePath,
    initArgs.zkeyFilePath,
    verificationKeyJSON,
    rlnIdentifier,
    identityStr
  );
}

export async function serialize(pcd: RLNPCD): Promise<SerializedPCD<RLNPCD>> {
  return {
    type: RLNPCDTypeName,
    pcd: JSONBig({ useNativeBigInt: true }).stringify(pcd)
  } as SerializedPCD<RLNPCD>;
}

export async function deserialize(serialized: string): Promise<RLNPCD> {
  const { id, claim, proof } = JSONBig({ useNativeBigInt: true }).parse(
    serialized
  );

  requireDefinedParameter(id, "id");
  requireDefinedParameter(claim, "claim");
  requireDefinedParameter(proof, "proof");

  return new RLNPCD(id, claim, proof);
}

/**
 * PCD-conforming wrapper for the RLN protocol. You can
 * find documentation of RLN here: https://rate-limiting-nullifier.github.io/rln-docs/what_is_rln.html
 */
export const RLNPCDPackage: PCDPackage<
  RLNPCDClaim,
  RLNPCDProof,
  RLNPCDArgs,
  RLNPCDInitArgs
> = {
  name: RLNPCDTypeName,
  init,
  prove,
  verify,
  serialize,
  deserialize
};
