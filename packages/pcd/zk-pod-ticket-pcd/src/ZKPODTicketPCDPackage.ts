import { gpcProve, gpcVerify } from "@pcd/gpc";
import {
  ArgumentTypeName,
  PCDPackage,
  ProveDisplayOptions,
  SerializedPCD
} from "@pcd/pcd-types";
import {
  PODTicketPCDPackage,
  podTicketPCDToPOD,
  PODTicketPCDTypeName
} from "@pcd/pod-ticket-pcd";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { requireDefinedParameter } from "@pcd/util";
import JSONBig from "json-bigint";
import { v4 as uuidv4 } from "uuid";
import {
  ZKPODTicketPCD,
  ZKPODTicketPCDArgs,
  ZKPODTicketPCDClaim,
  ZKPODTicketPCDInitArgs,
  ZKPODTicketPCDProof,
  ZKPODTicketPCDTypeName
} from "./ZKPODTicketPCD";
import {
  claimToGPCRevealedClaims,
  makeProofRequest,
  partialPODEntriesToPartialTicketData
} from "./utils";

let savedInitArgs: ZKPODTicketPCDInitArgs | undefined = undefined;

/**
 * Initialize the ZKPODTicketPCDPackage.
 */
export async function init(args: ZKPODTicketPCDInitArgs): Promise<void> {
  if (args.zkArtifactPath === undefined || args.zkArtifactPath === "") {
    throw new Error("No ZK artifact path given");
  }
  savedInitArgs = args;
}

/**
 * Ensure that the ZKPODTicketPCDPackage has been initialized.
 *
 * @returns The ZK artifact path.
 */
function ensureInitialized(): string {
  if (
    savedInitArgs === undefined ||
    savedInitArgs.zkArtifactPath === undefined
  ) {
    throw new Error("No ZK artifact path given.  Was init skipped?");
  }
  return savedInitArgs.zkArtifactPath;
}

/**
 * Create a proof for the ZKPODTicketPCD.
 *
 * @param args - The arguments for the proof.
 * @returns A ZKPODTicketPCD containing a claim and a proof.
 */
export async function prove(args: ZKPODTicketPCDArgs): Promise<ZKPODTicketPCD> {
  const zkArtifactPath = ensureInitialized();

  const serializedTicketPCD = args.ticket.value?.pcd;
  if (!serializedTicketPCD) {
    throw new Error("Cannot make proof: missing ticket PCD");
  }

  const ticketPCD = await PODTicketPCDPackage.deserialize(serializedTicketPCD);
  const ticketPOD = podTicketPCDToPOD(ticketPCD);

  const serializedIdentityPCD = args.identity.value?.pcd;
  if (!serializedIdentityPCD) {
    throw new Error("No identity provided");
  }
  const identityPCD = await SemaphoreIdentityPCDPackage.deserialize(
    serializedIdentityPCD
  );

  const proofRequest = makeProofRequest(args);
  const { proofConfig, membershipLists, externalNullifier, watermark } =
    proofRequest;

  const gpcProof = await gpcProve(
    proofConfig,
    {
      pods: {
        ticketPOD
      },
      membershipLists: membershipLists,
      owner: {
        externalNullifier: externalNullifier,
        semaphoreV3: identityPCD.claim.identity
      },
      watermark: watermark
    },
    zkArtifactPath
  );

  const proofWatermark = gpcProof.revealedClaims.watermark;
  if (!proofWatermark) {
    throw new Error("No watermark found in GPC proof");
  }

  const revealedTicketPOD = gpcProof.revealedClaims.pods.ticketPOD;
  if (!revealedTicketPOD) {
    throw new Error("No ticket POD found in GPC proof");
  }

  const signerPublicKey = revealedTicketPOD.signerPublicKey;
  if (!signerPublicKey) {
    throw new Error("No signer found in ticket POD");
  }

  if (!gpcProof.revealedClaims.owner) {
    throw new Error("No owner found in GPC proof");
  }

  const id = uuidv4();

  return new ZKPODTicketPCD(
    id,
    {
      config: gpcProof.boundConfig,
      ticketPatterns: args.ticket.validatorParams?.ticketPatterns ?? [],
      externalNullifier: gpcProof.revealedClaims.owner.externalNullifier,
      watermark: proofWatermark,
      signerPublicKey,
      nullifierHash: gpcProof.revealedClaims.owner.nullifierHash,
      partialTicket: revealedTicketPOD.entries
        ? partialPODEntriesToPartialTicketData(revealedTicketPOD.entries)
        : {}
    },
    { groth16Proof: gpcProof.proof }
  );
}

/**
 * Verify a proof for the ZKPODTicketPCD.
 *
 * @param pcd - The ZKPODTicketPCD to verify.
 * @returns Whether the proof is valid.
 */
export async function verify(pcd: ZKPODTicketPCD): Promise<boolean> {
  const zkArtifactPath = ensureInitialized();
  return gpcVerify(
    pcd.proof.groth16Proof,
    pcd.claim.config,
    claimToGPCRevealedClaims(pcd.claim),
    zkArtifactPath
  );
}

/**
 * Serialize a ZKPODTicketPCD.
 *
 * @param pcd - The ZKPODTicketPCD to serialize.
 * @returns The serialized ZKPODTicketPCD.
 */
async function serialize(
  pcd: ZKPODTicketPCD
): Promise<SerializedPCD<ZKPODTicketPCD>> {
  const serializedTicketData = JSON.stringify(pcd.claim.partialTicket);
  return {
    type: ZKPODTicketPCDTypeName,
    pcd: JSONBig({ useNativeBigInt: true }).stringify({
      ...pcd,
      claim: {
        ...pcd.claim,
        partialTicket: serializedTicketData
      }
    })
  };
}

/**
 * Deserialize a ZKPODTicketPCD.
 *
 * @param serialized - The serialized ZKPODTicketPCD.
 * @returns The deserialized ZKPODTicketPCD.
 */
async function deserialize(serialized: string): Promise<ZKPODTicketPCD> {
  const deserialized = JSONBig({ useNativeBigInt: true }).parse(serialized);
  const { id, claim, proof } = deserialized;
  const partialTicket = JSON.parse(claim.partialTicket);

  requireDefinedParameter(partialTicket, "partialTicket");
  requireDefinedParameter(deserialized.id, "id");
  requireDefinedParameter(deserialized.claim, "claim");
  requireDefinedParameter(
    deserialized.claim.signerPublicKey,
    "signerPublicKey"
  );
  requireDefinedParameter(deserialized.claim.ticketPatterns, "ticketPatterns");
  requireDefinedParameter(deserialized.claim.watermark, "watermark");
  requireDefinedParameter(
    deserialized.claim.externalNullifier,
    "externalNullifier"
  );
  requireDefinedParameter(deserialized.claim.nullifierHash, "nullifierHash");
  requireDefinedParameter(deserialized.claim.config, "config");
  requireDefinedParameter(deserialized.proof, "proof");
  requireDefinedParameter(deserialized.proof.groth16Proof, "groth16Proof");

  return new ZKPODTicketPCD(id, { ...claim, partialTicket }, proof);
}

/**
 * Get the display options for the ZKPODTicketPCD.
 *
 * @returns The display options for the ZKPODTicketPCD.
 */
export function getProveDisplayOptions(): ProveDisplayOptions<ZKPODTicketPCDArgs> {
  return {
    defaultArgs: {
      ticket: {
        argumentType: ArgumentTypeName.PCD,
        displayName: "",
        description: "Generate a proof for the selected ticket",
        validate(value, params): boolean {
          if (value.type !== PODTicketPCDTypeName || !value.claim) {
            return false;
          }

          if (params?.ticketPatterns?.length) {
            for (const pattern of params.ticketPatterns) {
              if (pattern.signerPublicKey !== value.claim.signerPublicKey) {
                return false;
              }
              if (pattern.events) {
                for (const event of pattern.events) {
                  if (event.id !== value.claim.ticket.eventId) {
                    return false;
                  }
                  if (event.productIds) {
                    for (const productId of event.productIds) {
                      if (productId !== value.claim.ticket.productId) {
                        return false;
                      }
                    }
                  }
                }
              }
            }
          }
          return true;
        },
        validatorParams: {
          ticketPatterns: [],
          notFoundMessage: "You do not have any eligible tickets."
        }
      },
      fieldsToReveal: {
        argumentType: ArgumentTypeName.ToggleList,
        displayName: "",
        description: "The following information will be revealed"
      },
      revealSignerPublicKey: {
        argumentType: ArgumentTypeName.Boolean,
        displayName: "",
        description: "Reveal the identity of the issuer of the ticket",
        defaultVisible: true
      },
      identity: {
        argumentType: ArgumentTypeName.PCD,
        defaultVisible: false,
        description:
          "Your Zupass comes with a primary Semaphore Identity which represents an user in the Semaphore protocol."
      },
      watermark: {
        argumentType: ArgumentTypeName.String,
        defaultVisible: false
      },
      externalNullifier: {
        argumentType: ArgumentTypeName.String,
        defaultVisible: false
      }
    }
  };
}

export const ZKPODTicketPCDPackage: PCDPackage<
  ZKPODTicketPCDClaim,
  ZKPODTicketPCDProof,
  ZKPODTicketPCDArgs,
  ZKPODTicketPCDInitArgs
> = {
  name: ZKPODTicketPCDTypeName,
  init,
  prove,
  verify,
  serialize,
  deserialize,
  getProveDisplayOptions
};
