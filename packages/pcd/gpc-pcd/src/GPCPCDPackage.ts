import {
  GPCProofConfig,
  GPCProofInputs,
  deserializeGPCBoundConfig,
  deserializeGPCProofConfig,
  deserializeGPCRevealedClaims,
  gpcProve,
  gpcVerify,
  podMembershipListsFromSimplifiedJSON,
  serializeGPCBoundConfig,
  serializeGPCRevealedClaims
} from "@pcd/gpc";
import {
  ArgumentTypeName,
  DisplayOptions,
  PCDPackage,
  ProveDisplayOptions,
  SerializedPCD
} from "@pcd/pcd-types";
import { POD, PODName, PODStringValue, checkPODName } from "@pcd/pod";
import { PODPCDPackage, PODPCDTypeName, isPODPCD } from "@pcd/pod-pcd";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { requireDefinedParameter } from "@pcd/util";
import { v4 as uuid } from "uuid";
import {
  GPCPCD,
  GPCPCDArgs,
  GPCPCDClaim,
  GPCPCDInitArgs,
  GPCPCDProof,
  GPCPCDTypeName
} from "./GPCPCD";

let savedInitArgs: GPCPCDInitArgs | undefined = undefined;

/**
 * Initialize GPCPCDPackage.
 */
export async function init(args: GPCPCDInitArgs): Promise<void> {
  if (args.zkArtifactPath === undefined || args.zkArtifactPath === "") {
    throw new Error("No ZK artifact path given");
  }
  savedInitArgs = args;
}

function ensureInitialized(): string {
  if (
    savedInitArgs === undefined ||
    savedInitArgs.zkArtifactPath === undefined
  ) {
    throw new Error("No ZK artifact path given.  Was init skipped?");
  }
  return savedInitArgs.zkArtifactPath;
}

async function checkProofArgs(args: GPCPCDArgs): Promise<{
  proofConfig: GPCProofConfig;
  proofInputs: GPCProofInputs;
}> {
  if (!args.proofConfig.value) {
    throw new Error("No proof config value provided");
  }
  const proofConfig = deserializeGPCProofConfig(args.proofConfig.value);

  if (!args.pods.value) {
    throw new Error("No PODs provided");
  }
  const pods: Record<PODName, POD> = Object.fromEntries(
    await Promise.all(
      Object.entries(args.pods.value).map(async ([podName, podPCDArg]) => {
        checkPODName(podName);

        if (!podPCDArg.value) {
          throw new Error(`No PODPCD value provided for POD ${podName}`);
        }

        const podPCD = await PODPCDPackage.deserialize(podPCDArg.value.pcd);
        if (!isPODPCD(podPCD)) {
          throw new Error("Wrong PCD type provided for PODPCD ${podName}");
        }

        return [podName, podPCD.pod];
      })
    )
  );

  if (Object.keys(pods).length === 0) {
    throw new Error("No PODs provided");
  }

  const serializedIdentityPCD = args.identity.value?.pcd;
  if (!serializedIdentityPCD) {
    throw new Error("Cannot make proof: missing owner PCD");
  }
  const ownerSemaphorePCD =
    serializedIdentityPCD !== undefined
      ? await SemaphoreIdentityPCDPackage.deserialize(serializedIdentityPCD)
      : undefined;

  const externalNullifier =
    args.externalNullifier.value !== undefined
      ? ({
          type: "string",
          value: args.externalNullifier.value
        } satisfies PODStringValue)
      : undefined;
  if (externalNullifier !== undefined && ownerSemaphorePCD === undefined) {
    throw new Error("External nullifier requires an owner identity PCD.");
  }

  const membershipLists =
    args.membershipLists.value !== undefined
      ? args.membershipLists.value
      : undefined;

  const watermark =
    args.watermark.value !== undefined
      ? ({
          type: "string",
          value: args.watermark.value
        } satisfies PODStringValue)
      : undefined;

  return {
    proofConfig,
    proofInputs: {
      pods,
      ...(ownerSemaphorePCD !== undefined
        ? {
            owner: {
              semaphoreV3: ownerSemaphorePCD?.claim?.identity,
              externalNullifier: externalNullifier
            }
          }
        : {}),
      ...(membershipLists !== undefined
        ? {
            membershipLists:
              podMembershipListsFromSimplifiedJSON(membershipLists)
          }
        : {}),
      watermark: watermark
    }
  };
}

/**
 * Creates a new {@link GPCPCD} by generating an {@link GPCPCDProof}
 * and deriving an {@link GPCPCDClaim} from the given {@link GPCPCDArgs}.
 *
 * This generates a ZK proof using the given config and inputs using a
 * selected circuit from the supported family.
 *
 * @throws if the arguments are invalid
 */
export async function prove(args: GPCPCDArgs): Promise<GPCPCD> {
  const zkArtifactPath = ensureInitialized();
  const { proofConfig, proofInputs } = await checkProofArgs(args);
  const id =
    args.id !== undefined && typeof args.id.value === "string"
      ? args.id.value
      : uuid();

  const { boundConfig, revealedClaims, proof } = await gpcProve(
    proofConfig,
    proofInputs,
    zkArtifactPath
  );

  return new GPCPCD(
    id,
    {
      config: boundConfig,
      revealed: revealedClaims
    },
    { groth16Proof: proof }
  );
}

/**
 * Verifies a POD PCD by checking that its {@link GPCPCDClaim} corresponds to
 * its {@link GPCPCDProof}.
 *
 * This confirms that the claimed configuration and revealed inputs match
 * what was used to prove.
 */
export async function verify(pcd: GPCPCD): Promise<boolean> {
  const zkArtifactPath = ensureInitialized();
  return gpcVerify(
    pcd.proof.groth16Proof,
    pcd.claim.config,
    pcd.claim.revealed,
    zkArtifactPath
  );
}

/**
 * Serializes a {@link GPCPCD}.
 *
 * @param pcd The GPC PCD to be serialized.
 * @returns The serialized version of the GPC PCD.
 */
export async function serialize(pcd: GPCPCD): Promise<SerializedPCD<GPCPCD>> {
  return {
    type: GPCPCDTypeName,
    pcd: JSON.stringify({
      id: pcd.id,
      claim: {
        // These fields are pre-serialized to a string so that JSONBig isn't
        // needed above.
        config: serializeGPCBoundConfig(pcd.claim.config),
        revealed: serializeGPCRevealedClaims(pcd.claim.revealed)
      },
      proof: pcd.proof
    })
  };
}

/**
 * Deserializes a serialized {@link GPCPCD}.
 * @param serialized The serialized PCD to deserialize.
 * @returns The deserialized version of the POD PCD.
 */
export async function deserialize(serialized: string): Promise<GPCPCD> {
  const deserialized = JSON.parse(serialized);

  // TODO(POD-P2): More careful schema validation, likely with Zod, with
  // special handling of the PODEntries type and subtypes.
  // TODO(POD-P3): Backward-compatible schema versioning.
  requireDefinedParameter(deserialized.id, "id");
  requireDefinedParameter(deserialized.claim, "claim");
  requireDefinedParameter(deserialized.claim.config, "config");
  const deserializedConfig = deserializeGPCBoundConfig(
    deserialized.claim.config
  );
  requireDefinedParameter(deserialized.claim.revealed, "revealed");
  const deserializedRevealed = deserializeGPCRevealedClaims(
    deserialized.claim.revealed
  );

  requireDefinedParameter(deserialized.proof, "proof");
  requireDefinedParameter(deserialized.proof.groth16Proof, "groth16Proof");

  return new GPCPCD(
    deserialized.id,
    { config: deserializedConfig, revealed: deserializedRevealed },
    deserialized.proof
  );
}

/**
 * Provides the information about the {@link GPCPCD} that will be displayed
 * to users on Zupass.
 *
 * @param pcd The GPC PCD instance.
 * @returns The information to be displayed, specifically `header` and `displayName`.
 */
export function getDisplayOptions(pcd: GPCPCD): DisplayOptions {
  return {
    header: "GPC Proof PCD",
    displayName: "gpc-proof-" + pcd.id
  };
}

export function getProveDisplayOptions(): ProveDisplayOptions<GPCPCDArgs> {
  return {
    defaultArgs: {
      proofConfig: {
        argumentType: ArgumentTypeName.String,
        defaultVisible: true
      },
      pods: {
        argumentType: ArgumentTypeName.Record,
        description: "Generate a proof for the selected POD object",
        validate: (podName, podPCD, params): boolean => {
          if (podPCD.type !== PODPCDTypeName) {
            return false;
          }

          if (params?.proofConfig !== undefined) {
            const proofConfig = ((): GPCProofConfig | undefined => {
              try {
                return deserializeGPCProofConfig(params.proofConfig);
              } catch (e) {
                if (e instanceof TypeError) {
                  params.notFoundMessage = e.message;
                }
              }
            })();

            if (proofConfig === undefined) {
              return false;
            }

            // POD podName should be present in the config and have all
            // entries specified there.
            const podConfig = proofConfig.pods[podName];
            if (podConfig === undefined) {
              params.notFoundMessage = `The proof configuration does not contain this POD.`;
              return false;
            } else {
              const entries = Object.keys(podConfig.entries);
              // Enumerate POD entries
              const podEntries = podPCD.pod.content.asEntries();
              // Return true iff all elements of `entries` are keys of `podEntries`
              return entries.every(
                (entryName) => podEntries[entryName] !== undefined
              );
            }
          }

          // TODO(POD-P3): Use validatorParams to filter by more constraints
          // not included in config.
          // E.g. require revealed value to be a specific value, or require
          // public key to be a specific key.
          return true;
        },
        validatorParams: {
          notFoundMessage: "You do not have any eligible POD PCDs."
        }
      },
      identity: {
        argumentType: ArgumentTypeName.PCD,
        defaultVisible: false,
        description:
          "Your Zupass comes with a primary Semaphore Identity which represents an user in the Semaphore protocol."
      },
      membershipLists: {
        argumentType: ArgumentTypeName.String,
        defaultVisible: false,
        description:
          "Specify the (named) lists for the list memberships specified in the proof configuration."
      },
      watermark: {
        argumentType: ArgumentTypeName.String,
        defaultVisible: false
      },
      externalNullifier: {
        argumentType: ArgumentTypeName.String,
        defaultVisible: false
      },
      id: {
        argumentType: ArgumentTypeName.String,
        defaultVisible: false
      }
    }
  };
}

/**
 * The PCD package of the POD PCD. It exports an object containing
 * the code necessary to operate on this PCD data.
 */
export const GPCPCDPackage: PCDPackage<
  GPCPCDClaim,
  GPCPCDProof,
  GPCPCDArgs,
  GPCPCDInitArgs
> = {
  name: GPCPCDTypeName,
  getDisplayOptions,
  init,
  getProveDisplayOptions,
  prove,
  verify,
  serialize,
  deserialize
};
