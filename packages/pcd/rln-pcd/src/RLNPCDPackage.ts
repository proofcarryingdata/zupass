import { PCDPackage, SerializedPCD } from "@pcd/pcd-types";
import { deserializeSemaphoreGroup } from "@pcd/semaphore-group-pcd";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { Identity as IdentityV3 } from "@pcd/semaphore-identity-v3-wrapper";
import { requireDefinedParameter } from "@pcd/util";
import JSONBig from "json-bigint";
import { RLN } from "rlnjs";
import verificationKeyJSON from "../artifacts/16.json";
import {
  RLNPCD,
  RLNPCDArgs,
  RLNPCDClaim,
  RLNPCDInitArgs,
  RLNPCDProof,
  RLNPCDTypeName,
  checkClaimProofMatching
} from "./RLNPCD";

let initArgs: RLNPCDInitArgs | undefined = undefined;

export async function init(args: RLNPCDInitArgs): Promise<void> {
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
  const identity = identityPCD.claim.identityV3;
  const rln = getRLNInstance(BigInt(rlnIdentifier), identity);
  const group = await deserializeSemaphoreGroup(serializedGroup);
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

function getRLNInstance(rlnIdentifier: bigint, identity?: IdentityV3): RLN {
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
