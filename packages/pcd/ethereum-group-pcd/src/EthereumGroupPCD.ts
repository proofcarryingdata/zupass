import {
  ArgumentTypeName,
  DisplayOptions,
  PCD,
  PCDPackage,
  SerializedPCD
} from "@pcd/pcd-types";
import {
  SemaphoreIdentityPCDPackage,
  SemaphoreIdentityPCDTypeName
} from "@pcd/semaphore-identity-pcd";
import {
  SemaphoreSignaturePCD,
  SemaphoreSignaturePCDPackage
} from "@pcd/semaphore-signature-pcd";
import { requireDefinedParameter } from "@pcd/util";
import {
  CircuitPubInput,
  MembershipProver,
  MembershipVerifier,
  ProverConfig,
  PublicInput
} from "@personaelabs/spartan-ecdsa";
import { ethers } from "ethers";
import JSONBig from "json-bigint";
import { v4 as uuid } from "uuid";
import { EthereumGroupPCDArgs, EthereumGroupPCDTypeName } from "./args";

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

let addrMembershipConfig: ProverConfig;
let pubkeyMembershipConfig: ProverConfig;
let addrProver: MembershipProver;
let pubkeyProver: MembershipProver;
let addrVerifier: MembershipVerifier;
let pubkeyVerifier: MembershipVerifier;

export async function init(args: EthereumGroupPCDInitArgs): Promise<void> {
  addrMembershipConfig = args.addrMembershipConfig ?? addrMembershipConfig;
  pubkeyMembershipConfig =
    args.pubkeyMembershipConfig ?? pubkeyMembershipConfig;
  addrProver = new MembershipProver(addrMembershipConfig);
  pubkeyProver = new MembershipProver(pubkeyMembershipConfig);
  addrVerifier = new MembershipVerifier(addrMembershipConfig);
  pubkeyVerifier = new MembershipVerifier(pubkeyMembershipConfig);
  await Promise.all([
    addrProver.initWasm(),
    pubkeyProver.initWasm(),
    addrVerifier.initWasm(),
    pubkeyVerifier.initWasm()
  ]);
  return SemaphoreSignaturePCDPackage.init?.(args);
}

/**
 * Utility function to get the raw public key buffer from a hex string.
 *
 * The offset that the hex representation of the public key starts at, without the 0x prefix and without the 04 encoding prefix. That's what the spartan-ecdsa circuit expects.
 *
 * https://github.com/indutny/elliptic/issues/86
 *
 * https://dev.to/q9/finally-understanding-ethereum-accounts-1kpe
 */
export function getRawPubKeyBuffer(pubKey: string): Buffer {
  if (pubKey.length !== 132) {
    throw new Error(
      `invalid public key length ${pubKey.length}. Expected 130 (hex string)`
    );
  }
  const hexPubkeyOffset = 2 + 2;
  return Buffer.from(pubKey.slice(hexPubkeyOffset), "hex");
}

export async function prove(
  args: EthereumGroupPCDArgs
): Promise<EthereumGroupPCD> {
  if (args.identity.value === undefined) {
    throw new Error(`missing argument identity`);
  }

  if (args.signatureOfIdentityCommitment.value === undefined) {
    throw new Error(`missing argument signatureOfIdentityCommitment`);
  }

  if (args.merkleProof.value === undefined) {
    throw new Error(`missing argument merkleProof`);
  }

  if (
    ![GroupType.ADDRESS, GroupType.PUBLICKEY].includes(
      args.groupType.value as GroupType
    )
  ) {
    throw new Error(
      `invalid group type ${args.groupType}. Expected ${GroupType.ADDRESS} or ${GroupType.PUBLICKEY} got ${args.groupType.value}}`
    );
  }

  const deserializedIdentity = await SemaphoreIdentityPCDPackage.deserialize(
    args.identity.value.pcd
  );
  const message = deserializedIdentity.claim.identity.commitment.toString();
  const msgHash = ethers.utils.hashMessage(message);

  const prover = args.groupType.value === "address" ? addrProver : pubkeyProver;
  const { proof, publicInput } = await prover.prove(
    args.signatureOfIdentityCommitment.value,
    Buffer.from(msgHash.slice(2), "hex"),
    JSONBig({ useNativeBigInt: true }).parse(args.merkleProof.value)
  );

  const publicInputMsgHash = "0x" + publicInput.msgHash.toString("hex");

  if (msgHash !== publicInputMsgHash) {
    throw new Error(
      `public input message hash ${publicInputMsgHash} does not match commitment ${message} hash ${msgHash} `
    );
  }

  const semaphoreSignature = await SemaphoreSignaturePCDPackage.prove({
    identity: {
      argumentType: ArgumentTypeName.PCD,
      pcdType: SemaphoreIdentityPCDTypeName,
      value: args.identity.value
    },
    signedMessage: {
      argumentType: ArgumentTypeName.String,
      value: Buffer.from(proof).toString("hex")
    }
  });

  return new EthereumGroupPCD(
    uuid(),
    {
      publicInput: publicInput,
      groupType:
        args.groupType.value === "address"
          ? GroupType.ADDRESS
          : GroupType.PUBLICKEY
    },
    {
      signatureProof:
        await SemaphoreSignaturePCDPackage.serialize(semaphoreSignature),
      ethereumGroupProof: Buffer.from(proof).toString("hex")
    }
  );
}

export async function verify(pcd: EthereumGroupPCD): Promise<boolean> {
  const semaphoreSignature = await SemaphoreSignaturePCDPackage.deserialize(
    pcd.proof.signatureProof.pcd
  );
  const signatureProofValid =
    await SemaphoreSignaturePCDPackage.verify(semaphoreSignature);

  // the semaphore signature of the group membership proof must be valid
  if (!signatureProofValid) {
    return false;
  }

  // The message signed by the semaphore signature must be the same as the
  // serialized ethereum group proof
  if (semaphoreSignature.claim.signedMessage !== pcd.proof.ethereumGroupProof) {
    return false;
  }

  const deserializedSignatureProof =
    await SemaphoreSignaturePCDPackage.deserialize(
      pcd.proof.signatureProof.pcd
    );

  const deserializedIdentity =
    deserializedSignatureProof.claim.identityCommitment;
  const message = deserializedIdentity;
  const msgHash = ethers.utils.hashMessage(message);

  const publicInputMsgHash =
    "0x" + pcd.claim.publicInput.msgHash.toString("hex");

  // The string that the ethereum group proof was signed over must the same
  // as the semaphore identity commitment. (Their hashes are equal)
  if (msgHash !== publicInputMsgHash) {
    return false;
  }

  const verifier =
    pcd.claim.groupType === GroupType.ADDRESS ? addrVerifier : pubkeyVerifier;
  const groupMembershipValid = await verifier.verify(
    Buffer.from(pcd.proof.ethereumGroupProof, "hex"),
    pcd.claim.publicInput.serialize()
  );

  if (!groupMembershipValid) {
    return false;
  }

  return true;
}

export async function serialize(
  pcd: EthereumGroupPCD
): Promise<SerializedPCD<EthereumGroupPCD>> {
  return {
    type: EthereumGroupPCDTypeName,
    pcd: JSONBig({ useNativeBigInt: true }).stringify(pcd)
  } as SerializedPCD<EthereumGroupPCD>;
}

export async function deserialize(
  serialized: string
): Promise<EthereumGroupPCD> {
  const { id, claim, proof } = JSONBig({ useNativeBigInt: true }).parse(
    serialized
  );

  requireDefinedParameter(id, "id");
  requireDefinedParameter(claim, "claim");
  requireDefinedParameter(proof, "proof");

  const publicInput = new PublicInput(
    claim.publicInput.r,
    claim.publicInput.rV,
    Buffer.from(claim.publicInput.msgHash),
    new CircuitPubInput(
      claim.publicInput.circuitPubInput.merkleRoot,
      claim.publicInput.circuitPubInput.Tx,
      claim.publicInput.circuitPubInput.Ty,
      claim.publicInput.circuitPubInput.Ux,
      claim.publicInput.circuitPubInput.Uy
    )
  );

  claim.publicInput = publicInput;

  return new EthereumGroupPCD(id, claim, proof);
}

export function getDisplayOptions(pcd: EthereumGroupPCD): DisplayOptions {
  return {
    header:
      "Ethereum Merkle Group " +
      pcd.claim.publicInput.circuitPubInput.merkleRoot
        .toString(16)
        .substring(0, 12),
    displayName: "eth-group-" + pcd.id.substring(0, 4)
  };
}

/**
 * PCD-conforming wrapper for an ethereum group membership proof using the spartan-ecdsa circuit.
 * You can find documentation of spartan-ecdsa here: https://github.com/personaelabs/spartan-ecdsa
 */
export const EthereumGroupPCDPackage: PCDPackage<
  EthereumGroupPCDClaim,
  EthereumGroupPCDProof,
  EthereumGroupPCDArgs,
  EthereumGroupPCDInitArgs
> = {
  name: EthereumGroupPCDTypeName,
  getDisplayOptions,
  init,
  prove,
  verify,
  serialize,
  deserialize
};
