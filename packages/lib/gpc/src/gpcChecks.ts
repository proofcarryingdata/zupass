import {
  ProtoPODGPC,
  ProtoPODGPCCircuitDesc,
  requiredNumTuples
} from "@pcd/gpcircuits";
import {
  POD,
  PODName,
  PODValue,
  PODValueTuple,
  calcMinMerkleDepthForEntries,
  checkPODName,
  checkPODValue,
  checkPublicKeyFormat,
  podValueHash,
  requireType
} from "@pcd/pod";
import { Identity } from "@semaphore-protocol/identity";
import _ from "lodash";
import {
  GPCBoundConfig,
  GPCIdentifier,
  GPCProofConfig,
  GPCProofEntryConfig,
  GPCProofInputs,
  GPCProofObjectConfig,
  GPCRevealedClaims,
  GPCRevealedObjectClaims,
  PODEntryIdentifier
} from "./gpcTypes";
import {
  GPCProofMembershipListConfig,
  GPCRequirements,
  checkPODEntryIdentifier,
  isTupleIdentifier,
  listConfigFromProofConfig,
  resolvePODEntryIdentifier,
  resolvePODEntryOrTupleIdentifier,
  splitCircuitIdentifier,
  widthOfEntryOrTuple
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
 * @returns the circuit size requirements for proving with these arguments
 * @throws TypeError if one of the objects is malformed
 * @throws Error if logical requirements between fields are not met
 */
export function checkProofArgs(
  proofConfig: GPCProofConfig,
  proofInputs: GPCProofInputs
): GPCRequirements {
  // Check that config and inputs are individually valid, and extract their
  // circuit requirements.
  const circuitReq = mergeRequirements(
    checkProofConfig(proofConfig),
    checkProofInputs(proofInputs)
  );

  // Check that config and inputs properly correspond to each other.
  checkProofInputsForConfig(proofConfig, proofInputs);

  return circuitReq;
}

/**
 * Checks the validity of a proof configuration, throwing if it is invalid.
 *
 * @param proofConfig proof configuration
 * @returns the circuit size requirements for proving with this configuration
 * @throws TypeError if one of the objects is malformed
 * @throws Error if logical requirements between fields are not met
 */
export function checkProofConfig(proofConfig: GPCProofConfig): GPCRequirements {
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

  if (proofConfig.tuples !== undefined) {
    checkProofTupleConfig(proofConfig);
  }

  const listConfig: GPCProofMembershipListConfig =
    checkProofListMembershipConfig(proofConfig);

  const numLists = _.sum(
    Object.values(listConfig).map((elements) => elements.length)
  );

  const maxListSize = numLists > 0 ? 1 : 0;

  const tupleArities = Object.fromEntries(
    Object.entries(proofConfig.tuples ?? {}).map((pair) => [
      pair[0],
      pair[1].entries.length
    ])
  );

  return GPCRequirements(
    totalObjects,
    totalEntries,
    requiredMerkleDepth,
    numLists,
    maxListSize,
    tupleArities
  );
}

function checkProofObjConfig(
  nameForErrorMessages: string,
  objConfig: GPCProofObjectConfig
): number {
  if (Object.keys(objConfig.entries).length === 0) {
    throw new TypeError(
      `Must prove at least one entry in object "${nameForErrorMessages}".`
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

export function checkProofTupleConfig(proofConfig: GPCProofConfig): void {
  for (const [tupleName, tupleConfig] of Object.entries(
    proofConfig.tuples ?? {}
  )) {
    if (tupleConfig.entries.length < 2) {
      throw new TypeError(
        `Tuple ${tupleName} specifies invalid tuple configuration. Tuples must have arity at least 2.`
      );
    }

    for (const entryId of tupleConfig.entries) {
      checkPODEntryIdentifierExists(tupleName, entryId, proofConfig.pods);
    }
  }
}

export function checkProofListMembershipConfig(
  proofConfig: GPCProofConfig
): GPCProofMembershipListConfig {
  const listConfig: GPCProofMembershipListConfig =
    listConfigFromProofConfig(proofConfig);

  for (const [listName, elements] of Object.entries(listConfig)) {
    elements.forEach((identifier) => {
      if (!isTupleIdentifier(identifier)) {
        checkPODEntryIdentifier(listName, identifier);
      }
    });
  }

  return listConfig;
}

export function checkListMembershipInput(
  membershipLists: Record<PODName, PODValue[] | PODValueTuple[]>
): Record<PODName, number> {
  const numListElements = Object.fromEntries(
    Object.entries(membershipLists).map((pair) => [pair[0], pair[1].length])
  );

  // All lists of valid values must be non-empty.
  for (const [listName, listLength] of Object.entries(numListElements)) {
    if (listLength === 0) {
      throw new Error(`Membership list ${listName} is empty.`);
    }
  }

  // All lists should be width homogeneous.
  for (const [listName, validValueList] of Object.entries(membershipLists)) {
    // First ensure that there are no tuples of arity less than 2.
    for (const value of validValueList as PODValueTuple[]) {
      if (Array.isArray(value) && value.length < 2) {
        throw new TypeError(
          `Membership list ${listName} in input contains an invalid tuple. Tuples must have arity at least 2.`
        );
      }
    }
    // Check width homogeneity.
    const expectedWidth = widthOfEntryOrTuple(validValueList[0]);
    for (const value of validValueList.slice(1)) {
      const valueWidth = widthOfEntryOrTuple(value);
      if (valueWidth !== expectedWidth) {
        throw new TypeError(
          `Membership list ${listName} in input has a type mismatch: It contains an element of width ${expectedWidth} and one of width ${valueWidth}.`
        );
      }
    }
  }

  return numListElements;
}

/**
 * Checks the validity of a proof inputs, throwing if they are invalid.
 *
 * @param proofInputs proof inputs
 * @returns the circuit size requirements for proving with this configuration
 * @throws TypeError if one of the objects is malformed
 * @throws Error if logical requirements between fields are not met
 */
export function checkProofInputs(proofInputs: GPCProofInputs): GPCRequirements {
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

  const numListElements =
    proofInputs.membershipLists === undefined
      ? {}
      : checkListMembershipInput(proofInputs.membershipLists);

  const maxListSize = Math.max(...Object.values(numListElements));

  if (proofInputs.watermark !== undefined) {
    checkPODValue("watermark", proofInputs.watermark);
  }

  return GPCRequirements(
    totalObjects,
    totalObjects,
    requiredMerkleDepth,
    // The number of required lists cannot be properly deduced here, so we
    // return 0.
    0,
    maxListSize,
    // The tuple arities are handled solely in the proof config, hence we return
    // an empty object here.
    {}
  );
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
  const nInputObjects = Object.keys(proofInputs.pods).length;
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
        const otherValue = resolvePODEntryIdentifier(
          entryConfig.equalsEntry,
          proofInputs.pods
        );
        if (otherValue === undefined) {
          throw new ReferenceError(
            `Input entry ${objName}.${entryName} should be proved to equal` +
              ` ${entryConfig.equalsEntry} which doesn't exist in input.`
          );
        }

        if (podValueHash(otherValue) !== podValueHash(podValue)) {
          throw new Error(
            `Input entry ${objName}.${entryName} doesn't equal ${entryConfig.equalsEntry}.`
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

  checkProofListMembershipInputsForConfig(proofConfig, proofInputs);
}

export function checkProofListMembershipInputsForConfig(
  proofConfig: GPCProofConfig,
  proofInputs: GPCProofInputs
): void {
  // Config and input list membership checks should have the same list names.
  const listConfig: GPCProofMembershipListConfig =
    listConfigFromProofConfig(proofConfig);
  checkInputListNamesForConfig(
    listConfig,
    Object.keys(proofInputs.membershipLists ?? {})
  );

  // The list membership check's list of valid values should be well formed in
  // the sense that the types of list values and comparison values should match
  // up.
  if (proofInputs.membershipLists !== undefined) {
    for (const [listName, comparisonIds] of Object.entries(listConfig)) {
      for (const comparisonId of comparisonIds) {
        const inputList = proofInputs.membershipLists[listName];

        // The configuration and input list element types should
        // agree.
        const comparisonValue = resolvePODEntryOrTupleIdentifier(
          comparisonId,
          proofInputs.pods,
          proofConfig.tuples
        );

        if (comparisonValue === undefined) {
          throw new ReferenceError(
            `Comparison value with identifier ${comparisonId} should be a member of list ${listName} but it doesn't exist in the proof input.`
          );
        }

        // The comparison value and list value widths should match up.
        const comparisonWidth = widthOfEntryOrTuple(comparisonValue);

        for (const element of inputList) {
          const elementWidth = widthOfEntryOrTuple(element);

          if (!_.isEqual(elementWidth, comparisonWidth)) {
            throw new TypeError(
              `Membership list ${listName} in input contains element of width ${JSON.stringify(
                elementWidth
              )} while comparison value with identifier ${JSON.stringify(
                comparisonId
              )} has width ${JSON.stringify(comparisonWidth)}.`
            );
          }
        }

        // The comparison value should lie in the membership list.
        if (
          inputList.find((element) => _.isEqual(element, comparisonValue)) ===
          undefined
        ) {
          throw new Error(
            `Comparison value ${JSON.stringify(
              comparisonValue
            )} corresponding to identifier ${JSON.stringify(
              comparisonId
            )} is not a member of list ${JSON.stringify(listName)}.`
          );
        }
      }
    }
  }
}

export function checkInputListNamesForConfig(
  listConfig: GPCProofMembershipListConfig,
  listNames: PODName[]
): void {
  // Config and input list membership checks should have the same list names.
  const configListNames = new Set(Object.keys(listConfig));
  const inputListNames = new Set(listNames);

  if (!_.isEqual(configListNames, inputListNames)) {
    throw new Error(
      `Config and input list mismatch.` +
        `  Configuration expects lists ${JSON.stringify(
          Array.from(configListNames)
        )}.` +
        `  Input contains ${JSON.stringify(Array.from(inputListNames))}.`
    );
  }
}

/**
 * Checks the validity of the arguments for verifying a proof.  This will throw
 * if any of the arguments is malformed, or if the different fields do not
 * correctly correspond to each other.
 *
 * @param boundConfig proof configuration bound to a specific circuit
 * @param revealedClaims revealed values from the proof
 * @returns the circuit size requirements for proving with these arguments
 * @throws TypeError if one of the objects is malformed
 * @throws Error if logical requirements between fields are not met
 */
export function checkVerifyArgs(
  boundConfig: GPCBoundConfig,
  revealedClaims: GPCRevealedClaims
): GPCRequirements {
  // Check that config and inputs are individually valid, and extract their
  // circuit requirements.
  const circuitReq = mergeRequirements(
    checkBoundConfig(boundConfig),
    checkRevealedClaims(revealedClaims)
  );

  // Check that config and inputs properly correspond to each other.
  checkVerifyClaimsForConfig(boundConfig, revealedClaims);

  return circuitReq;
}

/**
 * Checks the validity of a proof configuration, throwing if it is invalid.
 *
 * @param boundConfig bound configuration
 * @returns the size requirements for proving with this configuration
 * @throws TypeError if one of the objects is malformed
 * @throws Error if logical requirements between fields are not met
 */
export function checkBoundConfig(boundConfig: GPCBoundConfig): GPCRequirements {
  if (boundConfig.circuitIdentifier === undefined) {
    throw new TypeError("Bound config must include circuit identifier.");
  }

  return checkProofConfig(boundConfig);
}

/**
 * Checks the validity of revealed claims for verification, throwing if they
 * are invalid.
 *
 * @param revealedClaims revealed claims to be verified
 * @returns the circuit size requirements for proving with this configuration
 * @throws TypeError if one of the objects is malformed
 * @throws Error if logical requirements between fields are not met
 */
export function checkRevealedClaims(
  revealedClaims: GPCRevealedClaims
): GPCRequirements {
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

  const numListElements =
    revealedClaims.membershipLists === undefined
      ? {}
      : checkListMembershipInput(revealedClaims.membershipLists);

  const maxListSize = Math.max(...Object.values(numListElements));

  if (revealedClaims.watermark !== undefined) {
    checkPODValue("watermark", revealedClaims.watermark);
  }

  return GPCRequirements(
    totalObjects,
    totalEntries,
    requiredMerkleDepth,
    0,
    maxListSize,
    {}
  );
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
    if (nEntries === 0) {
      throw new TypeError(
        `Revealed object "${nameForErrorMessages}" entries should be undefined not empty.`
      );
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

  // Config and input list membership checks should have the same list names.
  const { circuitIdentifier: _circuitId, ...proofConfig } = boundConfig;
  const listConfig: GPCProofMembershipListConfig =
    listConfigFromProofConfig(proofConfig);
  checkInputListNamesForConfig(
    listConfig,
    Object.keys(revealedClaims.membershipLists ?? {})
  );
}

/**
 * Picks the smallest available circuit in this family which can handle the
 * size parameters of a desired configuration.
 *
 * @param circuitReq the circuit size requirements
 * @returns the circuit description, or undefined if no circuit can handle
 *   the required parameters.
 * @throws Error if there are no circuits satisfying the given requirements.
 */
export function pickCircuitForRequirements(
  circuitReq: GPCRequirements
): ProtoPODGPCCircuitDesc {
  for (const circuitDesc of ProtoPODGPC.CIRCUIT_FAMILY) {
    if (circuitDescMeetsRequirements(circuitDesc, circuitReq)) {
      return circuitDesc;
    }
  }

  throw new Error(
    `There are no circuits with parameters satisfying these requirements: ${JSON.stringify(
      circuitReq
    )}`
  );
}

/**
 * Checks whether a described circuit can meet given GPC size requirements.
 *
 * @param circuitDesc description of the circuit to check
 * @param circuitReq the circuit size requirements
 * @returns `true` if the circuit meets the requirements.
 */
export function circuitDescMeetsRequirements(
  circuitDesc: ProtoPODGPCCircuitDesc,
  circuitReq: GPCRequirements
): boolean {
  // Check tuple parameter compatibility.
  const tupleCheck =
    // If we don't require tuples, then this check passes.
    Object.keys(circuitReq.tupleArities).length === 0 ||
    // Else we ought to be checking a circuit that can accommodate tuples.
    (circuitDesc.tupleArity >= 2 &&
      // The circuit description should have enough tuples of arity `tupleArity` to
      // cover all input tuples when represent as a chain of tuples of arity `arity`.
      // This is determined by the `requiredNumTuples` procedure.
      circuitDesc.maxTuples >=
        Object.values(circuitReq.tupleArities)
          .map((arity) => requiredNumTuples(circuitDesc.tupleArity, arity))
          .reduce((sum, requiredNum) => sum + requiredNum, 0));
  return (
    tupleCheck &&
    circuitDesc.maxObjects >= circuitReq.nObjects &&
    circuitDesc.maxEntries >= circuitReq.nEntries &&
    circuitDesc.merkleMaxDepth >= circuitReq.merkleMaxDepth &&
    circuitDesc.maxLists >= circuitReq.nLists &&
    // The circuit description should be able to contain the largest of the lists.
    circuitDesc.maxListElements >= circuitReq.maxListSize
  );
}

/**
 * Calculates the merged set of GPC size requirements meeting the unified
 * (maximum) requirements of both inputs.
 *
 * @param rs1 first set of required sizes
 * @param rs2 second set of required sizes
 * @returns unified (maximum) sizes
 * @throws Error if the requirements cannot be merged
 */
export function mergeRequirements(
  rs1: GPCRequirements,
  rs2: GPCRequirements
): GPCRequirements {
  // Either `rs1` or `rs2` specifies the tuple arities.
  if (
    Object.keys(rs1.tupleArities).length > 0 &&
    Object.keys(rs2.tupleArities).length > 0
  ) {
    throw new Error(
      `At least one of the tuple arity requirements must be empty.`
    );
  }

  const tupleArities =
    Object.keys(rs1.tupleArities).length === 0
      ? rs2.tupleArities
      : rs1.tupleArities;

  return GPCRequirements(
    Math.max(rs1.nObjects, rs2.nObjects),
    Math.max(rs1.nEntries, rs2.nEntries),
    Math.max(rs1.merkleMaxDepth, rs2.merkleMaxDepth),
    Math.max(rs1.nLists, rs2.nLists),
    Math.max(rs1.maxListSize, rs2.maxListSize),
    tupleArities
  );
}

/**
 * Checks that the circuit size requirements for a proof can be satisfied
 * by a known circuit.  This is not an exact match, but instead each parameter
 * of the chosen circuit must be able to accommodate the specified GPC input
 * sizes.
 *
 * If the circuit name is not given, this will pick the smallest supported
 * circuit which can satisfy the requirements.
 *
 * @param circuitReq the circuit size requirements
 * @param circuitIdentifier a specific circuit to be used
 * @returns the full description of the circuit to be used for the proof
 * @throws Error if no known circuit can support the given parameters, or if
 *   the named circuit cannot do so.
 */
export function checkCircuitRequirements(
  requiredParameters: GPCRequirements,
  circuitIdentifier?: GPCIdentifier
): ProtoPODGPCCircuitDesc {
  if (circuitIdentifier !== undefined) {
    const { familyName, circuitName } =
      splitCircuitIdentifier(circuitIdentifier);
    const foundDesc = ProtoPODGPC.findCircuit(familyName, circuitName);
    if (foundDesc === undefined) {
      throw new Error(`Unknown circuit name: "${circuitIdentifier}"`);
    }
    if (!circuitDescMeetsRequirements(foundDesc, requiredParameters)) {
      throw new Error(
        `Specified circuit "${circuitIdentifier}" does not meet proof requirements.`
      );
    }
    return foundDesc;
  } else {
    const pickedDesc = pickCircuitForRequirements(requiredParameters);
    if (pickedDesc === undefined) {
      throw new Error(`No supported circuit meets proof requirements.`);
    }
    return pickedDesc;
  }
}

/**
 * Checks whether a POD entry identifier exists in the context of tuple checking.
 *
 * @param tupleNameForErrorMessages tuple name (provided for error messages)
 * @param entryIdentifier the identifier to check
 * @throws ReferenceError if the identifier does not exist or is invalid
 */
export function checkPODEntryIdentifierExists(
  tupleNameForErrorMessages: PODName,
  entryIdentifier: PODEntryIdentifier,
  pods: Record<PODName, GPCProofObjectConfig>
): void {
  // Check that the tuples reference entries included in the config.
  const [podName, entryName] = checkPODEntryIdentifier(
    tupleNameForErrorMessages,
    entryIdentifier
  );
  const pod = pods[podName];

  if (pod === undefined) {
    throw new ReferenceError(
      `Tuple ${tupleNameForErrorMessages} refers to entry ${entryName} in non-existent POD ${podName}.`
    );
  }

  const entry = pod.entries[entryName];

  if (entry === undefined) {
    throw new ReferenceError(
      `Tuple ${tupleNameForErrorMessages} refers to non-existent entry ${entryName} in POD ${podName}.`
    );
  }
}
