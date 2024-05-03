import {
  ProtoPODGPC,
  ProtoPODGPCCircuitDesc,
  ProtoPODGPCCircuitParams
} from "@pcd/gpcircuits";
import {
  POD,
  calcMinMerkleDepthForEntries,
  checkPODName,
  checkPODValue,
  checkPublicKeyFormat,
  podValueHash,
  requireType
} from "@pcd/pod";
import { Identity } from "@semaphore-protocol/identity";
import {
  GPCBoundConfig,
  GPCIdentifier,
  GPCProofConfig,
  GPCProofEntryConfig,
  GPCProofInputs,
  GPCProofObjectConfig,
  GPCRevealedClaims,
  GPCRevealedObjectClaims
} from "./gpcTypes";
import {
  checkPODEntryIdentifier,
  splitCircuitIdentifier,
  splitPODEntryIdentifier
} from "./gpcUtil";

// TODO(POD-P2): Split out the parts of this which should be public from
// internal implementation details.  E.g. the returning of ciruit parameters
// isn't relevant to checking objects after deserialization.

/**
 * Checks the validity of the arguments for generating a proof.  This will throw
 * if any of the arguments is malformed, or if the different fields do not
 * correctly correspond to each other.
 *
 * @param proofConfig proof configuration
 * @param proofInputs proof inputs
 * @returns the minimum circuit parameter requirements for proving with
 *   these arguments
 * @throws TypeError if one of the objects is malformed
 * @throws Error if logical requirements between fields are not met
 */
export function checkProofArgs(
  proofConfig: GPCProofConfig,
  proofInputs: GPCProofInputs
): ProtoPODGPCCircuitParams {
  // Check that config and inputs are individually valid, and extract their
  // circuit requirements.
  const requriedParams = ProtoPODGPC.mergeRequiredParams(
    checkProofConfig(proofConfig),
    checkProofInputs(proofInputs)
  );

  // Check that config and inputs properly correspond to each other.
  checkProofInputsForConfig(proofConfig, proofInputs);

  return requriedParams;
}

/**
 * Checks the validity of a proof configuration, throwing if it is invalid.
 *
 * @param proofConfig proof configuration
 * @returns the minimum circuit parameter requirements for proving with
 *   this configuration
 * @throws TypeError if one of the objects is malformed
 * @throws Error if logical requirements between fields are not met
 */
export function checkProofConfig(
  proofConfig: GPCProofConfig
): ProtoPODGPCCircuitParams {
  if (proofConfig.circuitIdentifier !== undefined) {
    requireType("circuitIdentifier", proofConfig.circuitIdentifier, "string");
  }

  if (Object.keys(proofConfig.pods).length === 0) {
    throw new TypeError("Must prove at least one object.");
  }

  let totalObjects = 0;
  let totalEntries = 0;
  let requiredMerkleDepth = 0;
  for (const [objName, objConfig] of Object.entries(proofConfig.pods)) {
    checkPODName(objName);
    const nEntries = checkProofObjConfig(objName, objConfig);
    totalObjects++;
    totalEntries += nEntries;
    requiredMerkleDepth = Math.max(
      requiredMerkleDepth,
      calcMinMerkleDepthForEntries(nEntries)
    );
  }

  return {
    maxObjects: totalObjects,
    maxEntries: totalEntries,
    merkleMaxDepth: requiredMerkleDepth
  };
}

function checkProofObjConfig(
  nameForErrorMessages: string,
  objConfig: GPCProofObjectConfig
): number {
  if (Object.keys(objConfig.entries).length === 0) {
    throw new TypeError(
      `Must prove at least one entry in object "${nameForErrorMessages}.`
    );
  }

  let nEntries = 0;
  for (const [entryName, entryConfig] of Object.entries(objConfig.entries)) {
    checkPODName(entryName);
    checkProofEntryConfig(`${nameForErrorMessages}.${entryName}`, entryConfig);
    nEntries++;
  }
  return nEntries;
}

function checkProofEntryConfig(
  nameForErrorMessages: string,
  entryConfig: GPCProofEntryConfig
): void {
  requireType(
    `${nameForErrorMessages}.isValueRevealed`,
    entryConfig.isRevealed,
    "boolean"
  );

  if (entryConfig.isOwnerID !== undefined) {
    requireType(
      `${nameForErrorMessages}.isOwnerID`,
      entryConfig.isOwnerID,
      "boolean"
    );
    if (entryConfig.equalsEntry !== undefined) {
      throw new Error("Can't use isOwnerID and equalsEntry on the same entry.");
    }
  }

  if (entryConfig.equalsEntry !== undefined) {
    checkPODEntryIdentifier(
      `${nameForErrorMessages}.equalsEntry`,
      entryConfig.equalsEntry
    );
  }
}

/**
 * Checks the validity of a proof inputs, throwing if they are invalid.
 *
 * @param proofInputs proof inputs
 * @returns the minimum circuit parameter requirements for proving with
 *   this configuration
 * @throws TypeError if one of the objects is malformed
 * @throws Error if logical requirements between fields are not met
 */
export function checkProofInputs(
  proofInputs: GPCProofInputs
): ProtoPODGPCCircuitParams {
  requireType("pods", proofInputs.pods, "object");

  let totalObjects = 0;
  let requiredMerkleDepth = 0;
  for (const [podName, pod] of Object.entries(proofInputs.pods)) {
    checkPODName(podName);
    requireType(`pods.${podName}`, pod, "object");
    if (!(pod instanceof POD)) {
      throw new TypeError(`pods.${podName} must be a POD object.`);
    }
    totalObjects++;
    requiredMerkleDepth = Math.max(
      requiredMerkleDepth,
      pod.content.merkleTreeDepth
    );
  }

  if (proofInputs.owner !== undefined) {
    requireType(`owner.SemaphoreV3`, proofInputs.owner.semaphoreV3, "object");
    if (!(proofInputs.owner.semaphoreV3 instanceof Identity)) {
      throw new TypeError(
        `owner.semaphoreV3 must be a SemaphoreV3 Identity object.`
      );
    }

    if (proofInputs.owner.externalNullifier !== undefined) {
      checkPODValue(
        "owner.externalNullifier",
        proofInputs.owner.externalNullifier
      );
    }
  }

  if (proofInputs.watermark !== undefined) {
    checkPODValue("watermark", proofInputs.watermark);
  }

  return {
    maxObjects: totalObjects,
    maxEntries: 1,
    merkleMaxDepth: requiredMerkleDepth
  };
}

/**
 * Checks that proof config and inputs correctly correspond to each other, and
 * that the provided inputs meet the requirements of the proof.
 *
 * The individual arguments are assumed to already be valid
 * (see {@link checkProofConfig} and {@link checkProofInputs}).
 *
 * @param proofConfig proof config
 * @param proofInputs proof inputs
 * @throws ReferenceError if named objects or entries do not exist
 * @throws Error if logical requirements between fields, or the requirements
 *   of the proof are not met.
 */
export function checkProofInputsForConfig(
  proofConfig: GPCProofConfig,
  proofInputs: GPCProofInputs
): void {
  // TODO(POD-P3): Think whether we should actually check proof requirements
  // here, vs. letting prove() simply fail.  At minimum this function could
  // simply check references between confing and inputs.

  // Config and inputs should have same number of objects.
  const nConfiguredObjects = Object.keys(proofConfig.pods).length;
  const nInputObjects = Object.keys(proofConfig.pods).length;
  if (nConfiguredObjects !== nInputObjects) {
    throw new Error(
      `Incorrect number of input objects.` +
        `  Configuration expects ${nConfiguredObjects}.` +
        `  Input includes ${nInputObjects}.`
    );
  }

  // Examine config for each object.
  let hasOwnerEntry = false;
  for (const [objName, objConfig] of Object.entries(proofConfig.pods)) {
    // This named object in config should be provided in input.
    const pod = proofInputs.pods[objName];
    if (pod === undefined) {
      throw new ReferenceError(
        `Configured POD object ${objName} not provided in inputs.`
      );
    }

    // Examine config for each entry.
    for (const [entryName, entryConfig] of Object.entries(objConfig.entries)) {
      // This named entry should exist in the given POD.
      const podValue = pod.content.getValue(entryName);
      if (podValue === undefined) {
        throw new ReferenceError(
          `Configured entry ${objName}.${entryName} doesn't exist in input.`
        );
      }

      // If this entry identifies the owner, we should have a matching Identity.
      if (entryConfig.isOwnerID) {
        hasOwnerEntry = true;
        if (proofInputs.owner === undefined) {
          throw new Error(
            "Proof configuration expects owner, but no owner identity given."
          );
        }
        if (podValue.value !== proofInputs.owner.semaphoreV3.commitment) {
          throw new Error(
            `Configured owner commitment in POD doesn't match given Identity.`
          );
        }

        // Owner commitment value must be a cryptographic number, so that its
        // plaintext value can be included in the circuit.
        if (podValue.type !== "cryptographic") {
          throw new Error(
            "Owner identity commitment must be of cryptographic type."
          );
        }
      }

      // Identified equal entry must also exist.
      if (entryConfig.equalsEntry !== undefined) {
        const { objName: otherPODName, entryName: otherEntryName } =
          splitPODEntryIdentifier(entryConfig.equalsEntry);
        const otherPOD = proofInputs.pods[otherPODName];
        const otherValue = otherPOD?.content?.getValue(otherEntryName);
        if (otherValue === undefined) {
          throw new ReferenceError(
            `Input entry ${objName}.${entryName} should be proved to equal` +
              ` ${otherPODName}.${otherEntryName} which doesn't exist in input.`
          );
        }

        if (podValueHash(otherValue) !== podValueHash(podValue)) {
          throw new Error(
            `Input entry ${objName}.${entryName} doesn't equal ${otherPODName}.${otherEntryName}.`
          );
        }
      }
    }
  }
  // Check that nullifier isn't requested if it's not linked to anything.
  // An owner ID not checked against a commitment can be any arbitray numbers.
  if (proofInputs.owner?.externalNullifier !== undefined && !hasOwnerEntry) {
    throw new Error("Nullifier requires an entry containing owner ID.");
  }
}

/**
 * Checks the validity of the arguments for verifying a proof.  This will throw
 * if any of the arguments is malformed, or if the different fields do not
 * correctly correspond to each other.
 *
 * @param boundConfig proof configuration bound to a specific circuit
 * @param revealedClaims revealed values from the proof
 * @returns the minimum circuit parameter requirements for proving with
 *   these arguments
 * @throws TypeError if one of the objects is malformed
 * @throws Error if logical requirements between fields are not met
 */
export function checkVerifyArgs(
  boundConfig: GPCBoundConfig,
  revealedClaims: GPCRevealedClaims
): ProtoPODGPCCircuitParams {
  // Check that config and inputs are individually valid, and extract their
  // circuit requirements.
  const requriedParams = ProtoPODGPC.mergeRequiredParams(
    checkProofConfig(boundConfig),
    checkRevealedClaims(revealedClaims)
  );

  // Check that config and inputs properly correspond to each other.
  checkVerifyClaimsForConfig(boundConfig, revealedClaims);

  return requriedParams;
}

/**
 * Checks the validity of a proof configuration, throwing if it is invalid.
 *
 * @param boundConfig bound configuration
 * @returns the minimum circuit parameter requirements for proving with
 *   this configuration
 * @throws TypeError if one of the objects is malformed
 * @throws Error if logical requirements between fields are not met
 */
export function checkBoundConfig(
  boundConfig: GPCBoundConfig
): ProtoPODGPCCircuitParams {
  if (boundConfig.circuitIdentifier === undefined) {
    throw new TypeError("Bound config must include circuit name.");
  }

  return checkProofConfig(boundConfig);
}

/**
 * Checks the validity of revealed claims for verification, throwing if they
 * are invalid.
 *
 * @param revealedClaims revealed claims to be verified
 * @returns the minimum circuit parameter requirements for proving with
 *   this configuration
 * @throws TypeError if one of the objects is malformed
 * @throws Error if logical requirements between fields are not met
 */
export function checkRevealedClaims(
  revealedClaims: GPCRevealedClaims
): ProtoPODGPCCircuitParams {
  let totalObjects = 0;
  let totalEntries = 0;
  let requiredMerkleDepth = 0;
  for (const [objName, objClaims] of Object.entries(revealedClaims.pods)) {
    checkPODName(objName);
    const nEntries = checkRevealedObjectClaims(objName, objClaims);
    totalObjects++;
    totalEntries += nEntries;
    requiredMerkleDepth = Math.max(
      requiredMerkleDepth,
      calcMinMerkleDepthForEntries(nEntries)
    );
  }

  if (revealedClaims.owner !== undefined) {
    checkPODValue(
      "owner.externalNullifier",
      revealedClaims.owner.externalNullifier
    );
    requireType(
      "owner.nullifierHash",
      revealedClaims.owner.nullifierHash,
      "bigint"
    );
  }

  if (revealedClaims.watermark !== undefined) {
    checkPODValue("watermark", revealedClaims.watermark);
  }

  return {
    maxObjects: totalObjects,
    maxEntries: totalEntries,
    merkleMaxDepth: requiredMerkleDepth
  };
}

function checkRevealedObjectClaims(
  nameForErrorMessages: string,
  objClaims: GPCRevealedObjectClaims
): number {
  let nEntries = 0;
  if (objClaims.entries !== undefined) {
    for (const [entryName, entryValue] of Object.entries(objClaims.entries)) {
      checkPODName(entryName);
      checkPODValue(`${nameForErrorMessages}.${entryName}`, entryValue);
      nEntries++;
    }
  }

  requireType("signerPublicKey", objClaims.signerPublicKey, "string");
  checkPublicKeyFormat(objClaims.signerPublicKey);

  return nEntries;
}

/**
 * Checks that verify config and claims correctly correspond to each other.
 *
 * The individual arguments are assumed to already be valid
 * (see {@link checkBoundConfig} and {@link checkRevealedClaims}).
 *
 * @param boundConfig bound config to verify
 * @param revealedClaims revealed claims to verify
 * @throws ReferenceError if named objects or entries do not exist
 * @throws Error if logical requirements between fields, or the requirements
 *   of the proof are not met.
 */
export function checkVerifyClaimsForConfig(
  boundConfig: GPCBoundConfig,
  revealedClaims: GPCRevealedClaims
): void {
  // Every configured POD should be revealed, with at least signing key.
  const nConfiguredObjects = Object.keys(boundConfig.pods).length;
  const nClaimedObjects = Object.keys(revealedClaims.pods).length;
  if (nConfiguredObjects !== nClaimedObjects) {
    throw new Error(
      `Incorrect number of claimed objects.` +
        `  Configuration expects ${nConfiguredObjects}.` +
        `  Claims include ${nClaimedObjects}.`
    );
  }

  // Each configured entry to be revealed should be revealed in claims.
  for (const [objName, objConfig] of Object.entries(boundConfig.pods)) {
    // Examine config for each revealed entry.
    for (const [entryName, entryConfig] of Object.entries(objConfig.entries)) {
      if (entryConfig.isRevealed) {
        // This named object in config should be provided in claims.
        const objClaims = revealedClaims.pods[objName];
        if (objClaims === undefined) {
          throw new ReferenceError(
            `Configuration reveals entry "${objName}.${entryName}" but the` +
              ` POD is not revealed in claims.`
          );
        }

        // Claims must contain PODs.
        if (objClaims.entries === undefined) {
          throw new ReferenceError(
            `Configuration reveals entry "${objName}.${entryName}", but no` +
              ` entries are revealed in claims.`
          );
        }

        // This named entry should exist in the given POD.
        const revealedValue = objClaims.entries[entryName];
        if (revealedValue === undefined) {
          throw new ReferenceError(
            `Configuration reveals entry "${objName}.${entryName}" which` +
              ` doesn't exist in claims.`
          );
        }
      }
    }
  }

  // Reverse check that each revealed entry and object exists and is revealed
  // in config.
  for (const [objName, objClaims] of Object.entries(revealedClaims.pods)) {
    const objConfig = boundConfig.pods[objName];
    if (objConfig === undefined) {
      throw new ReferenceError(
        `Claims include object "${objName}" which doesn't exist in config.`
      );
    }
    if (objClaims.entries !== undefined) {
      for (const entryName of Object.keys(objClaims.entries)) {
        const entryConfig = objConfig.entries[entryName];
        if (entryConfig === undefined) {
          throw new ReferenceError(
            `Claims reveal entry "${objName}.${entryName}" which doesn't exist` +
              ` in config.`
          );
        }

        if (!entryConfig.isRevealed) {
          throw new ReferenceError(
            `Claims reveal entry "${objName}.${entryName}" which is not` +
              ` revealed in config.`
          );
        }
      }
    }
  }
}

/**
 * Checks that the required circuit parameters for a proof can be satisfied
 * by a known circuit.  This is not an exact match, but instead each parameter
 * of the chosen circuit must be greater than or equal to the required value.
 *
 * If the circuit name is not given, this will pick the check will pick the
 * smallest known circuit which can satisfy the requirements.
 *
 * @param requiredParameters the minimum required parameter values
 * @param circuitIdentifier a specific circuit to be used
 * @returns the full description of the circuit to be used for the proof
 * @throws Error if no known circuit can support the given parameters, or if
 *   the named circuit cannot do so.
 */
export function checkCircuitParameters(
  requiredParameters: ProtoPODGPCCircuitParams,
  circuitIdentifier?: GPCIdentifier
): ProtoPODGPCCircuitDesc {
  if (circuitIdentifier !== undefined) {
    const { familyName, circuitName } =
      splitCircuitIdentifier(circuitIdentifier);
    const foundDesc = ProtoPODGPC.findCircuit(familyName, circuitName);
    if (foundDesc === undefined) {
      throw new Error(`Unknown circuit name: "${circuitIdentifier}"`);
    }
    if (!ProtoPODGPC.circuitMeetsRequirements(foundDesc, requiredParameters)) {
      throw new Error(
        `Specified circuit "${circuitIdentifier}" does not meet proof requirements.`
      );
    }
    return foundDesc;
  } else {
    const pickedDesc = ProtoPODGPC.pickCircuit(requiredParameters);
    if (pickedDesc === undefined) {
      throw new Error(`No supported circuit meets proof requirements.`);
    }
    return pickedDesc;
  }
}
