import {
  ArgumentTypeName,
  DisplayOptions,
  PCD,
  PCDArgument,
  PCDPackage,
  SerializedPCD,
  StringArgument
} from "@pcd/pcd-types";
import {
  SemaphoreIdentityPCD,
  SemaphoreIdentityPCDPackage,
  SemaphoreIdentityPCDTypeName
} from "@pcd/semaphore-identity-pcd";
import {
  SemaphoreSignaturePCD,
  SemaphoreSignaturePCDPackage
} from "@pcd/semaphore-signature-pcd";
import { requireDefinedParameter } from "@pcd/util";
import { ethers } from "ethers";
import JSONBig from "json-bigint";
import { v4 as uuid } from "uuid";

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

export type EthereumOwnershipPCDArgs = {
  identity: PCDArgument<SemaphoreIdentityPCD>;
  ethereumAddress: StringArgument;
  ethereumSignatureOfCommitment: StringArgument;
};

export interface EthereumOwnershipPCDClaim {
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
  return SemaphoreSignaturePCDPackage.init?.(args);
}

export async function prove(
  args: EthereumOwnershipPCDArgs
): Promise<EthereumOwnershipPCD> {
  if (args.identity.value === undefined) {
    throw new Error(`missing argument identity`);
  }

  if (args.ethereumSignatureOfCommitment.value === undefined) {
    throw new Error(`missing argument ethereumSignatureOfCommitment`);
  }

  if (args.ethereumAddress.value === undefined) {
    throw new Error(`missing argument ethereumAddress`);
  }

  if (!ethers.utils.isAddress(args.ethereumAddress.value)) {
    throw new Error(`${args.ethereumAddress} is not a valid Ethereum address`);
  }

  const deserializedIdentity = await SemaphoreIdentityPCDPackage.deserialize(
    args.identity.value.pcd
  );
  const message = deserializedIdentity.claim.identity.commitment.toString();

  const address = ethers.utils.getAddress(
    ethers.utils.verifyMessage(
      message,
      args.ethereumSignatureOfCommitment.value
    )
  );
  const formattedArgAddress = ethers.utils.getAddress(
    args.ethereumAddress.value
  );

  if (address !== formattedArgAddress) {
    throw new Error(
      `recovered address ${address} does not match argument address: ${formattedArgAddress} `
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
      value: args.ethereumSignatureOfCommitment.value
    }
  });

  return new EthereumOwnershipPCD(
    uuid(),
    {
      ethereumAddress: args.ethereumAddress.value
    },
    {
      signatureProof:
        await SemaphoreSignaturePCDPackage.serialize(semaphoreSignature),
      ethereumSignatureOfCommitment: args.ethereumSignatureOfCommitment.value
    }
  );
}

export async function verify(pcd: EthereumOwnershipPCD): Promise<boolean> {
  const semaphoreSignature = await SemaphoreSignaturePCDPackage.deserialize(
    pcd.proof.signatureProof.pcd
  );
  const proofValid =
    await SemaphoreSignaturePCDPackage.verify(semaphoreSignature);

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

  const deserializedSignatureProof =
    await SemaphoreSignaturePCDPackage.deserialize(
      pcd.proof.signatureProof.pcd
    );

  try {
    const recoveredAddress = ethers.utils.verifyMessage(
      deserializedSignatureProof.claim.identityCommitment,
      pcd.proof.ethereumSignatureOfCommitment
    );

    // the signature of the commitment by the ethereum address must have been
    // signed by the claimed ethereum address
    if (
      ethers.utils.getAddress(recoveredAddress) !==
      ethers.utils.getAddress(pcd.claim.ethereumAddress.toLowerCase())
    ) {
      return false;
    }
  } catch (e) {
    console.log(e);
    return false;
  }

  return true;
}

export async function serialize(
  pcd: EthereumOwnershipPCD
): Promise<SerializedPCD<EthereumOwnershipPCD>> {
  return {
    type: EthereumOwnershipPCDTypeName,
    pcd: JSONBig().stringify(pcd)
  } as SerializedPCD<EthereumOwnershipPCD>;
}

export async function deserialize(
  serialized: string
): Promise<EthereumOwnershipPCD> {
  const { id, claim, proof } = JSONBig().parse(serialized);

  requireDefinedParameter(id, "id");
  requireDefinedParameter(claim, "claim");
  requireDefinedParameter(proof, "proof");

  return new EthereumOwnershipPCD(id, claim, proof);
}

export function getDisplayOptions(pcd: EthereumOwnershipPCD): DisplayOptions {
  return {
    header: "Ethereum " + pcd.claim.ethereumAddress.substring(0, 12),
    displayName: "eth-owner-" + pcd.id.substring(0, 4)
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
  getDisplayOptions,
  init,
  prove,
  verify,
  serialize,
  deserialize
};
