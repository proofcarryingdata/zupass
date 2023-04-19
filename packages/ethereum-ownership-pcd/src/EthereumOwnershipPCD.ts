import {
  ArgumentTypeName,
  DisplayOptions,
  PCD,
  PCDArgument,
  PCDPackage,
  SerializedPCD,
  StringArgument,
} from "@pcd/pcd-types";
import {
  SemaphoreIdentityPCD,
  SemaphoreIdentityPCDTypeName,
} from "@pcd/semaphore-identity-pcd";
import {
  SemaphoreSignaturePCD,
  SemaphoreSignaturePCDPackage,
} from "@pcd/semaphore-signature-pcd";
import ethers from "ethers";
import { sha256 } from "js-sha256";
import JSONBig from "json-bigint";
import { v4 as uuid } from "uuid";
import { SemaphoreIdentityCardBody as EthereumOwnershipCardBody } from "./CardBody";

/**
 * All signature PCDs are 'namespaced' to this pseudo-random nullifier,
 * so that they cannot be reused by malicious actors across different
 * applications.
 */
export const STATIC_ETH_PCD_NULLIFIER = generateMessageHash(
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

export const EthereumOwnershipPCDTypeName = "ethereum-ownership-pcd";

export interface EthereumOwnershipPCDInitArgs {
  // TODO: how do we distribute these in-package, so that consumers
  // of the package don't have to copy-paste these artifacts?
  // TODO: how do we account for different versions of the same type
  // of artifact? eg. this one is parameterized by group size. Should
  // we pre-generate a bunch of artifacts per possible group size?
  // Should we do code-gen?
  zkeyFilePath: string;
  wasmFilePath: string;
}

let initArgs: EthereumOwnershipPCDInitArgs | undefined = undefined;

// We hardcode the externalNullifer to also be your identityCommitment
// so that your nullifier for specific groups is not revealed when
// a SemaphoreSignaturePCD is requested from a consumer application.
export interface EthereumOwnershipPCDArgs {
  identity: PCDArgument<SemaphoreIdentityPCD>;
  identityCommitment: StringArgument;
  ethereumAddress: StringArgument;
  ethereumSignatureOfCommitment: StringArgument;
}

export interface EthereumOwnershipPCDClaim {
  /**
   * Stringified `BigInt`.
   */
  identityCommitment: string;

  /**
   * 0x...
   */
  ethereumAddress: string;
}

export interface EthereumOwnershipPCDProof {
  signatureProof: SerializedPCD<SemaphoreSignaturePCD>;
  ethereumSignatureOfCommitment: string;
}

export class EthereumOwnershipPCD
  implements PCD<EthereumOwnershipPCDClaim, EthereumOwnershipPCDProof>
{
  type = EthereumOwnershipPCDTypeName;
  claim: EthereumOwnershipPCDClaim;
  proof: EthereumOwnershipPCDProof;
  id: string;

  public constructor(
    id: string,
    claim: EthereumOwnershipPCDClaim,
    proof: EthereumOwnershipPCDProof
  ) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}

export async function init(args: EthereumOwnershipPCDInitArgs): Promise<void> {
  initArgs = args;
}

export async function prove(
  args: EthereumOwnershipPCDArgs
): Promise<EthereumOwnershipPCD> {
  if (args.identityCommitment.value === undefined) {
    throw new Error(`missing argument identityCommitment`);
  }

  if (args.identity.value === undefined) {
    throw new Error(`missing argument identity`);
  }

  if (args.ethereumSignatureOfCommitment.value === undefined) {
    throw new Error(`missing argument ethereumSignatureOfCommitment`);
  }

  if (args.ethereumAddress.value === undefined) {
    throw new Error(`missing argument ethereumAddress`);
  }

  if (!ethers.isAddress(args.ethereumAddress)) {
    throw new Error(`${args.ethereumAddress} is not a valid Ethereum address`);
  }

  const address = ethers.getAddress(
    ethers.recoverAddress(
      new TextEncoder().encode(args.identityCommitment.value),
      args.ethereumSignatureOfCommitment.value
    )
  );
  const formattedArgAddress = ethers.getAddress(args.ethereumAddress.value);

  if (address !== formattedArgAddress) {
    throw new Error(
      `recovered address ${address} does not match argument address: ${formattedArgAddress} `
    );
  }

  const semaphoreSignature = await SemaphoreSignaturePCDPackage.prove({
    identity: {
      argumentType: ArgumentTypeName.PCD,
      pcdType: SemaphoreIdentityPCDTypeName,
      value: args.identity.value,
    },
    signedMessage: {
      argumentType: ArgumentTypeName.String,
      value: args.ethereumSignatureOfCommitment.value,
    },
  });

  return new EthereumOwnershipPCD(
    uuid(),
    {
      ethereumAddress: args.ethereumAddress.value,
      identityCommitment: args.identityCommitment.value,
    },
    {
      signatureProof: await SemaphoreSignaturePCDPackage.serialize(
        semaphoreSignature
      ),
      ethereumSignatureOfCommitment: args.ethereumSignatureOfCommitment.value,
    }
  );
}

export async function verify(pcd: EthereumOwnershipPCD): Promise<boolean> {
  const semaphoreSignature = await SemaphoreSignaturePCDPackage.deserialize(
    pcd.proof.signatureProof.pcd
  );
  const proofValid = await SemaphoreSignaturePCDPackage.verify(
    semaphoreSignature
  );

  // the semaphore signature of the ethereum signature must be valid
  if (!proofValid) {
    return false;
  }

  // the string that the semaphore signature signed must equal to the ethereum
  // signature of the commitment
  if (
    semaphoreSignature.claim.signedMessage !==
    pcd.proof.ethereumSignatureOfCommitment
  ) {
    return false;
  }

  const recoveredAddress = ethers.recoverAddress(
    new TextEncoder().encode(pcd.claim.identityCommitment),
    pcd.proof.ethereumSignatureOfCommitment
  );

  // the signature of the commitment by the ethereum address must have been
  // signed by the claimed ethereum address
  if (
    ethers.getAddress(recoveredAddress) !==
    ethers.getAddress(pcd.claim.ethereumAddress)
  ) {
    return false;
  }

  return true;
}

export async function serialize(
  pcd: EthereumOwnershipPCD
): Promise<SerializedPCD<EthereumOwnershipPCD>> {
  return {
    type: EthereumOwnershipPCDTypeName,
    pcd: JSONBig().stringify(pcd),
  } as SerializedPCD<EthereumOwnershipPCD>;
}

export async function deserialize(
  serialized: string
): Promise<EthereumOwnershipPCD> {
  return JSONBig().parse(serialized);
}

export function getDisplayOptions(pcd: EthereumOwnershipPCD): DisplayOptions {
  return {
    header: "Ethereum " + pcd.claim.ethereumAddress.substring(0, 12),
    displayName: "eth-owner-" + pcd.id.substring(0, 4),
  };
}

/**
 * PCD-conforming wrapper to sign messages using one's Semaphore public key. This is a small
 * extension of the existing Semaphore protocol, which is mostly geared at group signatures.
 * Find documentation of Semaphore here: https://semaphore.appliedzkp.org/docs/introduction
 */
export const EthereumOwnershipPCDPackage: PCDPackage<
  EthereumOwnershipPCDClaim,
  EthereumOwnershipPCDProof,
  EthereumOwnershipPCDArgs,
  EthereumOwnershipPCDInitArgs
> = {
  name: EthereumOwnershipPCDTypeName,
  renderCardBody: EthereumOwnershipCardBody,
  getDisplayOptions,
  init,
  prove,
  verify,
  serialize,
  deserialize,
};
