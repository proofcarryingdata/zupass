import {
  GPCProofConfig,
  GPCProofInputs,
  PODMembershipLists,
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
import {
  POD,
  PODName,
  PODStringValue,
  applyOrMap,
  checkPODName,
  podValueHash
} from "@pcd/pod";
import { PODPCD, PODPCDPackage, PODPCDTypeName, isPODPCD } from "@pcd/pod-pcd";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { requireDefinedParameter } from "@pcd/util";
import { v4 as uuid } from "uuid";
import {
  GPCPCD,
  GPCPCDArgs,
  GPCPCDClaim,
  GPCPCDInitArgs,
  GPCPCDPrescribedPODValues,
  GPCPCDProof,
  GPCPCDTypeName,
  PODPCDArgValidatorParams
} from "./GPCPCD";
import { gpcPCDPrescribedPODValuesFromSimplifiedJSON } from "./util";

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
 * and deriving a {@link GPCPCDClaim} from the given {@link GPCPCDArgs}.
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

function validateInputPOD(
  podName: PODName,
  podPCD: PODPCD,
  params: PODPCDArgValidatorParams | undefined
): boolean {
  if (podPCD.type !== PODPCDTypeName) {
    return false;
  }

  // Check POD against proof config if it is given.
  if (params?.proofConfig !== undefined) {
    let proofConfig: GPCProofConfig;
    try {
      proofConfig = deserializeGPCProofConfig(params.proofConfig);
    } catch (e) {
      if (e instanceof TypeError) {
        params.notFoundMessage = e.message;
        return false;
      }
      throw e;
    }

    // POD podName should be present in the config and have all
    // entries specified there.
    const podConfig = proofConfig.pods[podName];
    if (podConfig === undefined) {
      params.notFoundMessage = `The proof configuration does not contain this POD.`;
      return false;
    }
    const configEntries = Object.keys(podConfig.entries);

    // Enumerate POD entries
    const podEntries = podPCD.pod.content.asEntries();
    // Return false if some entry in the config is not in the POD
    if (
      configEntries.some((entryName) => podEntries[entryName] === undefined)
    ) {
      return false;
    }

    // Alist of (entry name, membership list name) pairs.
    const listMembershipAlist = Object.entries(podConfig.entries).flatMap(
      ([entryName, entryConfig]) =>
        entryConfig.isMemberOf !== undefined
          ? [[entryName, entryConfig.isMemberOf]]
          : []
    );

    // If there are list membership checks in the proof config *and* the
    // serialised lists are passed in as a parameter, check whether any
    // do not pass.
    if (
      listMembershipAlist.length > 0 &&
      params.membershipLists !== undefined
    ) {
      // Deserialise membership Lists.
      let membershipLists: PODMembershipLists;

      try {
        membershipLists = podMembershipListsFromSimplifiedJSON(
          params.membershipLists
        );
      } catch (_) {
        params.notFoundMessage = "Error deserialising membership lists.";
        return false;
      }

      if (
        listMembershipAlist.some(
          ([entryName, listName]) =>
            !membershipLists[listName]
              .map((value) => applyOrMap(podValueHash, value))
              .includes(podValueHash(podEntries[entryName]))
        )
      ) {
        return false;
      }
    }

    // Check for prescribed values.
    if (params.prescribedValues !== undefined) {
      let prescribedValues: GPCPCDPrescribedPODValues;
      try {
        prescribedValues = gpcPCDPrescribedPODValuesFromSimplifiedJSON(
          params.prescribedValues
        );
      } catch (e) {
        if (e instanceof TypeError) {
          params.notFoundMessage = e.message;
          return false;
        }
        throw e;
      }

      const prescribedValuesForPod = prescribedValues[podName];

      if (prescribedValuesForPod !== undefined) {
        // Check signer's public key.
        if (
          prescribedValuesForPod.signerPublicKey !== undefined &&
          prescribedValuesForPod.signerPublicKey !== podPCD.pod.signerPublicKey
        ) {
          return false;
        }

        // Check POD for prescribed entries (if any).
        if (prescribedValuesForPod?.entries !== undefined) {
          const prescribedEntryAlist = Object.entries(
            prescribedValuesForPod.entries
          );

          // Sanity check: All prescribed entry names should appear in the config
          // and their values should be revealed!
          for (const [entryName, _] of prescribedEntryAlist) {
            if (podConfig.entries[entryName] === undefined) {
              params.notFoundMessage =
                "Invalid prescribed entry record: Not all entries are present in the proof configuration.";
              return false;
            }
            if (!podConfig.entries[entryName].isRevealed) {
              params.notFoundMessage =
                "Prescribed entry is not revealed in proof configuration!";
              return false;
            }
          }

          for (const [entryName, entryValue] of prescribedEntryAlist) {
            if (
              podValueHash(podEntries[entryName]) !== podValueHash(entryValue)
            ) {
              return false;
            }
          }
        }
      }
    }
  }

  // TODO(POD-P3): Use validatorParams to filter by more constraints
  // not included in config.
  return true;
}

export function getProveDisplayOptions(): ProveDisplayOptions<GPCPCDArgs> {
  return {
    defaultArgs: {
      proofConfig: {
        argumentType: ArgumentTypeName.String,
        defaultVisible: true,
        displayName: "Proof Configuration",
        description: `This specifies what to prove about the inputs, and which
        parts of the inputs are revealed.`
      },
      pods: {
        argumentType: ArgumentTypeName.RecordContainer,
        defaultVisible: true,
        displayName: "POD",
        description: "Generate a proof for the selected POD object",
        validate: validateInputPOD,
        validatorParams: {
          notFoundMessage: "You do not have any eligible POD PCDs."
        }
      },
      identity: {
        argumentType: ArgumentTypeName.PCD,
        defaultVisible: false,
        displayName: "User Identity",
        description: `Your identity is used to prove your ownership of PODs.
        Your Zupass comes with a primary Semaphore Identity which represents a
        user in the Semaphore protocol.`
      },
      membershipLists: {
        argumentType: ArgumentTypeName.String,
        defaultVisible: false,
        description: `These are the the lists of allowed or disallowed values
        for membership checks in the proof configuration.`
      },
      watermark: {
        argumentType: ArgumentTypeName.String,
        defaultVisible: false,
        description: `This watermark will be included in the proof.  It can be
        used tie this proof to a specific purpose.`
      },
      externalNullifier: {
        argumentType: ArgumentTypeName.String,
        defaultVisible: false,
        description: `This input is combined with your identity to produce a
        nullifier, which can be used to identify proofs which come from the
        same user, without deanonymizing the user.`
      },
      id: {
        argumentType: ArgumentTypeName.String,
        defaultVisible: false,
        description: `Unique identifier for the resulting proof PCD.  This is
        used to store it in Zupass, but is not a cryptographic part of the
        proof.`
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
