import {
  GPCProofConfig,
  GPCProofInputs,
  PODMembershipLists,
  boundConfigFromJSON,
  boundConfigToJSON,
  gpcProve,
  gpcVerify,
  podMembershipListsFromJSON,
  proofConfigFromJSON,
  revealedClaimsFromJSON,
  revealedClaimsToJSON
} from "@pcd/gpc";
import {
  ArgumentTypeName,
  DisplayOptions,
  PCDPackage,
  ProveDisplayOptions,
  SerializedPCD
} from "@pcd/pcd-types";
import { POD, PODName, checkPODName, podValueFromJSON } from "@pcd/pod";
import { PODPCD, PODPCDPackage, isPODPCD } from "@pcd/pod-pcd";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { requireDefinedParameter } from "@pcd/util";
import { v4 as uuid } from "uuid";
import {
  FixedPODEntries,
  GPCPCD,
  GPCPCDArgs,
  GPCPCDClaim,
  GPCPCDInitArgs,
  GPCPCDProof,
  GPCPCDTypeName,
  PODPCDArgValidatorParams
} from "./GPCPCD";
import { fixedPODEntriesFromJSON } from "./json";
import {
  checkPCDType,
  checkPODAgainstPrescribedSignerPublicKeys,
  checkPODEntriesAgainstMembershipLists,
  checkPODEntriesAgainstPrescribedEntries,
  checkPODEntriesAgainstProofConfig,
  checkPrescribedEntriesAgainstProofConfig,
  checkPrescribedSignerPublicKeysAgainstProofConfig
} from "./validatorChecks";

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

function ensureInitialized(): GPCPCDInitArgs {
  if (
    savedInitArgs === undefined ||
    savedInitArgs.zkArtifactPath === undefined
  ) {
    throw new Error("No ZK artifact path given.  Was init skipped?");
  }
  return savedInitArgs;
}

async function checkProofArgs(args: GPCPCDArgs): Promise<{
  proofConfig: GPCProofConfig;
  proofInputs: GPCProofInputs;
}> {
  if (!args.proofConfig.value) {
    throw new Error("No proof config value provided");
  }
  const proofConfig = proofConfigFromJSON(args.proofConfig.value);

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
      ? podValueFromJSON(args.externalNullifier.value)
      : undefined;
  if (externalNullifier !== undefined && ownerSemaphorePCD === undefined) {
    throw new Error("External nullifier requires an owner identity PCD.");
  }

  const membershipLists =
    args.membershipLists.value !== undefined
      ? podMembershipListsFromJSON(args.membershipLists.value)
      : undefined;

  const watermark =
    args.watermark.value !== undefined
      ? podValueFromJSON(args.watermark.value)
      : undefined;

  return {
    proofConfig,
    proofInputs: {
      pods,
      ...(ownerSemaphorePCD !== undefined
        ? {
            owner: {
              semaphoreV3: ownerSemaphorePCD?.claim?.identityV3,
              externalNullifier: externalNullifier
            }
          }
        : {}),
      ...(membershipLists !== undefined
        ? {
            membershipLists
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
  const { zkArtifactPath, circuitFamily } = ensureInitialized();
  const { proofConfig, proofInputs } = await checkProofArgs(args);
  const id =
    args.id !== undefined && typeof args.id.value === "string"
      ? args.id.value
      : uuid();

  const { boundConfig, revealedClaims, proof } = await gpcProve(
    proofConfig,
    proofInputs,
    zkArtifactPath,
    circuitFamily
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
  const { zkArtifactPath, circuitFamily } = ensureInitialized();
  return gpcVerify(
    pcd.proof.groth16Proof,
    pcd.claim.config,
    pcd.claim.revealed,
    zkArtifactPath,
    circuitFamily
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
        jsonConfig: boundConfigToJSON(pcd.claim.config),
        jsonRevealed: revealedClaimsToJSON(pcd.claim.revealed)
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

  requireDefinedParameter(deserialized.id, "id");
  requireDefinedParameter(deserialized.claim, "claim");
  requireDefinedParameter(deserialized.claim.jsonConfig, "jsonConfig");
  const deserializedConfig = boundConfigFromJSON(deserialized.claim.jsonConfig);

  requireDefinedParameter(deserialized.claim.jsonRevealed, "jsonRevealed");
  const deserializedRevealed = revealedClaimsFromJSON(
    deserialized.claim.jsonRevealed
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
    header: "GPC Proof",
    displayName: "gpc-proof-" + pcd.id
  };
}

function validateInputPOD(
  podName: PODName,
  podPCD: PODPCD,
  params: PODPCDArgValidatorParams | undefined
): boolean {
  // Bypass checks if there is nothing to work with.
  if (params === undefined) {
    return true;
  }

  // Deserialise provided parameters
  let proofConfig: GPCProofConfig | undefined;
  let membershipLists: PODMembershipLists | undefined;
  let prescribedEntries: FixedPODEntries | undefined;

  try {
    proofConfig =
      params.proofConfig !== undefined
        ? proofConfigFromJSON(params.proofConfig)
        : undefined;

    membershipLists =
      params.membershipLists !== undefined
        ? podMembershipListsFromJSON(params.membershipLists)
        : undefined;

    prescribedEntries =
      params.prescribedEntries !== undefined
        ? fixedPODEntriesFromJSON(params.prescribedEntries)
        : undefined;
  } catch (e) {
    if (e instanceof TypeError || e instanceof Error) {
      params.notFoundMessage = e.message;
      return false;
    }
    throw e;
  }

  const prescribedSignerPublicKeys = params.prescribedSignerPublicKeys;

  return (
    checkPCDType(podPCD) &&
    // Short-circuit if proof config not specified.
    (proofConfig === undefined ||
      (checkPODEntriesAgainstProofConfig(
        podName,
        podPCD,
        proofConfig,
        params
      ) &&
        checkPrescribedSignerPublicKeysAgainstProofConfig(
          podName,
          proofConfig,
          prescribedSignerPublicKeys,
          params
        ) &&
        checkPODAgainstPrescribedSignerPublicKeys(
          podName,
          podPCD.pod.signerPublicKey,
          prescribedSignerPublicKeys,
          params
        ) &&
        checkPrescribedEntriesAgainstProofConfig(
          podName,
          proofConfig,
          prescribedEntries,
          params
        ) &&
        checkPODEntriesAgainstPrescribedEntries(
          podName,
          podPCD.pod.content.asEntries(),
          prescribedEntries
        ) &&
        checkPODEntriesAgainstMembershipLists(
          podName,
          podPCD,
          proofConfig,
          membershipLists
        )))
  );
}

export function getProveDisplayOptions(): ProveDisplayOptions<GPCPCDArgs> {
  return {
    defaultArgs: {
      proofConfig: {
        argumentType: ArgumentTypeName.Object,
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
        argumentType: ArgumentTypeName.Object,
        defaultVisible: false,
        description: `These are the the lists of allowed or disallowed values
        for membership checks in the proof configuration.`
      },
      watermark: {
        argumentType: ArgumentTypeName.Object,
        defaultVisible: false,
        description: `This watermark will be included in the proof.  It can be
        used tie this proof to a specific purpose.`
      },
      externalNullifier: {
        argumentType: ArgumentTypeName.Object,
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
