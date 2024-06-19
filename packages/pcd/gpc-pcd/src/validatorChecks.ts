import { GPCProofConfig, PODMembershipLists } from "@pcd/gpc";
import {
  PODEntries,
  PODName,
  applyOrMap,
  decodePublicKey,
  podValueHash
} from "@pcd/pod";
import { PODPCD, PODPCDTypeName } from "@pcd/pod-pcd";
import _ from "lodash";
import {
  PODEntryRecord,
  PODPCDArgValidatorParams,
  PODSignerPublicKeys
} from "./GPCPCD";

export function checkPCDType(podPCD: PODPCD): boolean {
  return podPCD.type === PODPCDTypeName;
}

export function checkPODEntriesAgainstProofConfig(
  podName: PODName,
  podPCD: PODPCD,
  proofConfig: GPCProofConfig | undefined,
  params: PODPCDArgValidatorParams
): proofConfig is GPCProofConfig {
  // Check POD against serialised proof config if it is given.
  if (proofConfig !== undefined) {
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
    } else {
      return true;
    }
  } else {
    params.notFoundMessage =
      "The proof configuration has not been passed to the validator!";
    return false;
  }
}

export function checkPODEntriesAgainstMembershipLists(
  podName: PODName,
  podPCD: PODPCD,
  proofConfig: GPCProofConfig,
  membershipLists: PODMembershipLists | undefined
): boolean {
  // Bypass if there are no membership lists.
  if (membershipLists === undefined) {
    return true;
  }

  const podConfig = proofConfig.pods[podName];
  const podEntries = podPCD.pod.content.asEntries();

  // Record mapping entry names to membership list names.
  const listMembershipRecord = Object.fromEntries(
    Object.entries(podConfig.entries).flatMap(([entryName, entryConfig]) =>
      entryConfig.isMemberOf !== undefined
        ? [[entryName, entryConfig.isMemberOf]]
        : []
    )
  );

  // If there are list membership checks in the proof config *and* the
  // serialised lists are passed in as a parameter, check whether any
  // do not pass.
  return (
    Object.keys(listMembershipRecord).length === 0 ||
    Object.entries(listMembershipRecord).every(([entryName, listName]) =>
      membershipLists[listName]
        .map((value) => applyOrMap(podValueHash, value))
        .includes(podValueHash(podEntries[entryName]))
    )
  );
}

export function checkPrescribedEntriesAgainstProofConfig(
  podName: PODName,
  proofConfig: GPCProofConfig,
  prescribedEntries: PODEntryRecord | undefined,
  params: PODPCDArgValidatorParams
): boolean {
  // Sanity check: All prescribed entry names should appear in the config
  // and their values should be revealed!
  const podConfig = proofConfig.pods[podName];
  for (const [entryName, _] of Object.entries(
    prescribedEntries?.[podName] ?? {}
  )) {
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

  return true;
}

export function checkPODEntriesAgainstPrescribedEntries(
  podName: PODName,
  podPCD: PODPCD,
  prescribedEntries: PODEntryRecord | undefined
): boolean {
  const prescribedEntriesForPod: PODEntries | undefined =
    prescribedEntries?.[podName];
  if (prescribedEntriesForPod !== undefined) {
    const podEntries = podPCD.pod.content.asEntries();
    return Object.entries(prescribedEntriesForPod).every(
      ([entryName, entryValue]) =>
        podValueHash(entryValue) === podValueHash(podEntries[entryName])
    );
  } else {
    return true;
  }
}

export function checkPODAgainstPrescribedSignerPublicKeys(
  podName: PODName,
  podPCD: PODPCD,
  prescribedSignerPublicKeys: PODSignerPublicKeys | undefined,
  params: PODPCDArgValidatorParams
): boolean {
  try {
    return (
      prescribedSignerPublicKeys?.[podName] === undefined ||
      _.isEqual(
        decodePublicKey(prescribedSignerPublicKeys[podName]),
        decodePublicKey(podPCD.pod.signerPublicKey)
      )
    );
  } catch (e) {
    if (e instanceof Error || e instanceof TypeError) {
      params.notFoundMessage = e.message;
      return false;
    }
    throw e;
  }
}
