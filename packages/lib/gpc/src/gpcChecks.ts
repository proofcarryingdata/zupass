import {
  ProtoPODGPC,
  ProtoPODGPCCircuitDesc,
  requiredNumTuples
} from "@pcd/gpcircuits";
import {
  EDDSA_PUBKEY_TYPE_STRING,
  POD,
  PODIntValue,
  PODName,
  PODValue,
  PODValueTuple,
  POD_INT_MAX,
  POD_INT_MIN,
  applyOrMap,
  calcMinMerkleDepthForEntries,
  checkPODName,
  checkPODValue,
  checkPublicKeyFormat,
  encodePublicKey,
  podValueHash,
  printPODValueOrTuple,
  requireType
} from "@pcd/pod";
import { Identity } from "@semaphore-protocol/identity";
import isEqual from "lodash/isEqual";
import uniq from "lodash/uniq";
import { Identity as IdentityV4 } from "semaphore-identity-v4";
import {
  ClosedInterval,
  GPCBoundConfig,
  GPCIdentifier,
  GPCProofConfig,
  GPCProofEntryBoundsCheckConfig,
  GPCProofEntryConfig,
  GPCProofEntryInequalityConfig,
  GPCProofInputs,
  GPCProofObjectConfig,
  GPCRevealedClaims,
  GPCRevealedObjectClaims,
  PODEntryIdentifier,
  SEMAPHORE_V3,
  SEMAPHORE_V4,
  TupleIdentifier
} from "./gpcTypes";
import {
  GPCProofMembershipListConfig,
  GPCRequirements,
  LIST_MEMBERSHIP,
  LIST_NONMEMBERSHIP,
  canonicalizeBoundsCheckConfig,
  checkPODEntryIdentifierParts,
  checkPODEntryName,
  isVirtualEntryIdentifier,
  isVirtualEntryName,
  listConfigFromProofConfig,
  resolvePODEntry,
  resolvePODEntryIdentifier,
  resolvePODEntryOrTupleIdentifier,
  splitCircuitIdentifier,
  splitPODEntryIdentifier,
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
  const boundsChecks: Record<PODEntryIdentifier, number> = {};
  const entryInequalityChecks: Record<
    PODEntryIdentifier,
    Record<string, PODEntryIdentifier>
  > = {};
  let includeOwnerV3 = false;
  let includeOwnerV4 = false;
  for (const [objName, objConfig] of Object.entries(proofConfig.pods)) {
    checkPODName(objName);
    const {
      nEntries,
      nBoundsChecks,
      inequalityChecks,
      hasOwnerV3,
      hasOwnerV4
    } = checkProofObjConfig(objName, objConfig);
    totalObjects++;
    totalEntries += nEntries;
    requiredMerkleDepth = Math.max(
      requiredMerkleDepth,
      calcMinMerkleDepthForEntries(nEntries)
    );
    (Object.keys(nBoundsChecks) as PODEntryIdentifier[]).forEach(
      (entryIdentifier: PODEntryIdentifier) => {
        boundsChecks[entryIdentifier] = nBoundsChecks[entryIdentifier];
      }
    );
    (Object.keys(inequalityChecks) as PODEntryIdentifier[]).forEach(
      (entryIdentifier: PODEntryIdentifier) => {
        entryInequalityChecks[entryIdentifier] =
          inequalityChecks[entryIdentifier];
      }
    );
    includeOwnerV3 ||= hasOwnerV3;
    includeOwnerV4 ||= hasOwnerV4;
  }

  // A range check should also be carried out on all entries involved in entry
  // inequalities to ensure the validity of the entry inequality circuit.
  checkProofBoundsCheckConfigForEntryInequalityConfig(
    boundsChecks,
    entryInequalityChecks
  );

  if (proofConfig.uniquePODs !== undefined) {
    requireType("uniquePODs", proofConfig.uniquePODs, "boolean");
  }

  if (proofConfig.tuples !== undefined) {
    checkProofTupleConfig(proofConfig);
  }

  const nBoundsChecks: number = Object.values(boundsChecks).reduce(
    (x, y) => x + y,
    0
  );

  const nEntryInequalities = Object.values(entryInequalityChecks)
    .map((inequalityChecks) => Object.keys(inequalityChecks).length)
    .reduce((x, y) => x + y, 0);

  const listConfig: GPCProofMembershipListConfig =
    listConfigFromProofConfig(proofConfig);

  const numLists = Object.keys(listConfig).length;

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
    nBoundsChecks,
    nEntryInequalities,
    numLists,
    maxListSize,
    tupleArities,
    includeOwnerV3,
    includeOwnerV4
  );
}

function checkProofObjConfig(
  objName: string,
  objConfig: GPCProofObjectConfig
): {
  nEntries: number;
  nBoundsChecks: Record<PODEntryIdentifier, number>;
  inequalityChecks: Record<
    PODEntryIdentifier,
    Record<string, PODEntryIdentifier>
  >;
  hasOwnerV3: boolean;
  hasOwnerV4: boolean;
} {
  if (Object.keys(objConfig.entries).length === 0) {
    throw new TypeError(
      `Must prove at least one entry in object "${objName}".`
    );
  }

  let nEntries = 0;
  const nBoundsChecks: Record<PODEntryIdentifier, number> = {};
  const inequalityChecks: Record<
    PODEntryIdentifier,
    Record<string, PODEntryIdentifier>
  > = {};
  let hasOwnerV3 = false;
  let hasOwnerV4 = false;
  for (const [entryName, entryConfig] of Object.entries(objConfig.entries)) {
    checkPODEntryName(entryName, true);
    const podEntryIdentifier: PODEntryIdentifier = `${objName}.${entryName}`;
    const {
      nBoundsChecks: nEntryBoundsChecks,
      hasOwnerV3Check,
      hasOwnerV4Check,
      inequalityChecks: inequalityChecksForEntry
    } = checkProofEntryConfig(podEntryIdentifier, entryConfig);
    nEntries++;
    if (nEntryBoundsChecks > 0) {
      nBoundsChecks[podEntryIdentifier] = nEntryBoundsChecks;
    }
    if (Object.keys(inequalityChecksForEntry).length > 0) {
      inequalityChecks[podEntryIdentifier] = inequalityChecksForEntry;
    }
    hasOwnerV3 ||= hasOwnerV3Check;
    hasOwnerV4 ||= hasOwnerV4Check;
  }
  if (objConfig.contentID !== undefined) {
    checkProofEntryConfig(`${objName}.$contentID`, objConfig.contentID);
  }
  if (objConfig.signerPublicKey !== undefined) {
    checkProofEntryConfig(
      `${objName}.$signerPublicKey`,
      objConfig.signerPublicKey
    );
  }
  return { nEntries, nBoundsChecks, inequalityChecks, hasOwnerV3, hasOwnerV4 };
}

export function checkProofEntryConfig(
  nameForErrorMessages: PODEntryIdentifier,
  entryConfig: GPCProofEntryConfig
): {
  hasOwnerV3Check: boolean;
  hasOwnerV4Check: boolean;
  nBoundsChecks: number;
  inequalityChecks: Record<string, PODEntryIdentifier>;
} {
  requireType(
    `${nameForErrorMessages}.isValueRevealed`,
    entryConfig.isRevealed,
    "boolean"
  );

  if (entryConfig.isOwnerID !== undefined) {
    if (isVirtualEntryIdentifier(nameForErrorMessages)) {
      throw new Error("Can't use isOwnerID on a virtual entry.");
    }

    if (![SEMAPHORE_V3, SEMAPHORE_V4].includes(entryConfig.isOwnerID)) {
      throw new TypeError(`Invalid owner ID type ${entryConfig.isOwnerID}.`);
    }

    if (entryConfig.equalsEntry !== undefined) {
      throw new Error("Can't use isOwnerID and equalsEntry on the same entry.");
    }
    if (entryConfig.notEqualsEntry !== undefined) {
      throw new Error(
        "Can't use isOwnerID and notEqualsEntry on the same entry."
      );
    }
  }

  if (
    entryConfig.equalsEntry !== undefined &&
    entryConfig.notEqualsEntry !== undefined
  ) {
    throw new Error(
      "Can't use equalsEntry and notEqualsEntry on the same entry."
    );
  }

  if (entryConfig.equalsEntry !== undefined) {
    checkPODEntryIdentifierParts(
      `${nameForErrorMessages}.equalsEntry`,
      entryConfig.equalsEntry
    );
  }

  if (entryConfig.notEqualsEntry !== undefined) {
    checkPODEntryIdentifierParts(
      `${nameForErrorMessages}.notEqualsEntry`,
      entryConfig.notEqualsEntry
    );
  }

  const nBoundsChecks = checkProofEntryBoundsCheckConfig(
    nameForErrorMessages,
    entryConfig
  );

  const inequalityChecks = checkProofEntryInequalityConfig(
    nameForErrorMessages,
    entryConfig
  );

  const hasOwnerV3Check = entryConfig.isOwnerID === SEMAPHORE_V3;
  const hasOwnerV4Check = entryConfig.isOwnerID === SEMAPHORE_V4;

  return {
    hasOwnerV3Check,
    hasOwnerV4Check,
    nBoundsChecks,
    inequalityChecks
  };
}

export function checkProofEntryBoundsCheckConfig(
  nameForErrorMessages: PODEntryIdentifier,
  entryConfig: GPCProofEntryBoundsCheckConfig
): number {
  // Canonicalize to simplify in cases where this is necessary.
  const boundsCheckConfig = canonicalizeBoundsCheckConfig(
    entryConfig.inRange,
    entryConfig.notInRange
  );
  let nBoundsChecks = 0;

  for (const [checkType, inRange] of [
    ["bounds check", boundsCheckConfig.inRange],
    ["out of bounds check", boundsCheckConfig.notInRange]
  ] as [string, ClosedInterval][]) {
    if (inRange !== undefined) {
      if (inRange.min < POD_INT_MIN) {
        throw new RangeError(
          `Minimum value of ${checkType} for entry ${nameForErrorMessages} is less than smallest admissible value ${POD_INT_MIN}.`
        );
      }
      if (inRange.max > POD_INT_MAX) {
        throw new RangeError(
          `Maximum value of ${checkType} for entry ${nameForErrorMessages} is greater than largest admissible ${POD_INT_MAX}.`
        );
      }
      if (inRange.max < inRange.min) {
        throw new Error(
          "Minimum value of ${checkType} for entry ${nameForErrorMesages} must be less than or equal to its maximum value."
        );
      }
      nBoundsChecks += 1;
    }
  }

  // If `entryConfig.inRange` is contained in `entryConfig.notInRange`, there is an empty intersection.
  if (
    boundsCheckConfig.inRange &&
    boundsCheckConfig.notInRange &&
    boundsCheckConfig.inRange.min >= boundsCheckConfig.notInRange.min &&
    boundsCheckConfig.inRange.max <= boundsCheckConfig.notInRange.max
  ) {
    throw new Error(
      `Range constraints for ${nameForErrorMessages} are incompatible with each other.`
    );
  }

  return nBoundsChecks;
}

export function checkProofEntryInequalityConfig(
  entryIdentifier: PODEntryIdentifier,
  entryConfig: GPCProofEntryInequalityConfig
): Record<string, PODEntryIdentifier> {
  return Object.fromEntries(
    ["lessThan", "lessThanEq", "greaterThan", "greaterThanEq"].flatMap(
      (ineqCheck: string): [string, PODEntryIdentifier][] => {
        const otherEntryIdentifier =
          entryConfig[ineqCheck as keyof typeof entryConfig];
        if (otherEntryIdentifier !== undefined) {
          // The other entry identifier should be valid.
          checkPODEntryIdentifierParts(
            `${entryIdentifier}.${ineqCheck}`,
            otherEntryIdentifier
          );
          return [[ineqCheck, otherEntryIdentifier]];
        } else {
          return [];
        }
      }
    )
  );
}

export function checkProofBoundsCheckConfigForEntryInequalityConfig(
  boundsChecks: Record<PODEntryIdentifier, number>,
  entryInequalityChecks: Record<
    PODEntryIdentifier,
    GPCProofEntryInequalityConfig
  >
): void {
  const inequalityCheckedEntries = uniq(
    Object.keys(entryInequalityChecks).concat(
      Object.values(entryInequalityChecks).flatMap((inequalityChecks) =>
        Object.values(inequalityChecks)
      )
    )
  ) as PODEntryIdentifier[];
  for (const entryIdentifier of inequalityCheckedEntries) {
    if (boundsChecks[entryIdentifier] === undefined) {
      throw new Error(
        `Entry ${entryIdentifier} requires a bounds check to be used in an entry inequality.`
      );
    }
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
    if (proofInputs.owner.semaphoreV3 !== undefined) {
      requireType(`owner.SemaphoreV3`, proofInputs.owner.semaphoreV3, "object");
      if (!(proofInputs.owner.semaphoreV3 instanceof Identity)) {
        throw new TypeError(
          `owner.semaphoreV3 must be a SemaphoreV3 Identity object.`
        );
      }
    }

    if (proofInputs.owner.semaphoreV4 !== undefined) {
      requireType(`owner.SemaphoreV4`, proofInputs.owner.semaphoreV4, "object");
      if (!(proofInputs.owner.semaphoreV4 instanceof IdentityV4)) {
        throw new TypeError(
          `owner.semaphoreV4 must be a SemaphoreV4 Identity object.`
        );
      }
    }

    if (proofInputs.owner.externalNullifier !== undefined) {
      if (
        proofInputs.owner.semaphoreV3 === undefined &&
        proofInputs.owner.semaphoreV4 === undefined
      ) {
        throw new Error(
          `An external nullifier cannot be specified without an accompanying identity object.`
        );
      } else {
        checkPODValue(
          "owner.externalNullifier",
          proofInputs.owner.externalNullifier
        );
      }
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
    // Numeric values (bounds checks) are handled solely in the proof config,
    // hence we return 0 here.
    0,
    // Entry inequalities are handled solely in the proof config, hence we
    // return 0 here.
    0,
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
      const podValue = resolvePODEntry(entryName, pod);

      if (podValue === undefined) {
        throw new ReferenceError(
          `Configured entry ${objName}.${entryName} doesn't exist in input.`
        );
      }

      // If this entry identifies the owner, we should have a matching Identity.
      if (entryConfig.isOwnerID !== undefined) {
        hasOwnerEntry = true;
        if (
          proofInputs.owner?.semaphoreV3 === undefined &&
          proofInputs.owner?.semaphoreV4 === undefined
        ) {
          throw new Error(
            "Proof configuration expects owner, but no owner identity given."
          );
        }

        for (const [ownerIDType, ownerID] of [
          [SEMAPHORE_V3, proofInputs.owner.semaphoreV3?.commitment],
          [
            SEMAPHORE_V4,
            proofInputs.owner.semaphoreV4?.publicKey
              ? encodePublicKey(proofInputs.owner.semaphoreV4?.publicKey)
              : undefined
          ]
        ]) {
          if (entryConfig.isOwnerID === ownerIDType) {
            if (ownerID === undefined) {
              throw new ReferenceError(
                `Configured owner commitment in POD references missing identity.`
              );
            } else if (
              (ownerIDType === SEMAPHORE_V3 &&
                podValue.type !== "cryptographic") ||
              (ownerIDType === SEMAPHORE_V4 &&
                podValue.type !== EDDSA_PUBKEY_TYPE_STRING)
            ) {
              throw new Error(
                "Semaphore V3 owner identity commitment must be of cryptographic type and Semaphore V4 owner identity must be of EdDSA public key type."
              );
            } else if (podValue.value !== ownerID) {
              throw new Error(
                `Configured owner commitment in POD doesn't match given identity.`
              );
            } else {
              break;
            }
          }
        }
      }

      // Identified (not) equal entry must also exist.
      const entryEqConfig =
        entryConfig.equalsEntry || entryConfig.notEqualsEntry;
      if (entryEqConfig !== undefined) {
        const errorStringQualifier = entryConfig.notEqualsEntry ? " not " : " ";
        const otherValue = resolvePODEntryIdentifier(
          entryEqConfig,
          proofInputs.pods
        );
        if (otherValue === undefined) {
          throw new ReferenceError(
            `Input entry ${objName}.${entryName} should be proved` +
              errorStringQualifier +
              `to equal` +
              ` ${entryConfig.equalsEntry} which doesn't exist in input.`
          );
        }
        const entryEqCheck =
          podValueHash(otherValue) === podValueHash(podValue);
        if (
          (entryConfig.equalsEntry && !entryEqCheck) ||
          (entryConfig.notEqualsEntry && entryEqCheck)
        ) {
          throw new Error(
            `Input entry ${objName}.${entryName} does` +
              errorStringQualifier +
              `equal ${entryConfig.equalsEntry}.`
          );
        }
      }

      // Check bounds for entry
      checkProofBoundsCheckInputsForConfig(
        `${objName}.${entryName}`,
        entryConfig,
        podValue
      );

      // Check entry inequalities for entry
      checkProofEntryInequalityInputsForConfig(
        `${objName}.${entryName}`,
        entryConfig,
        podValue,
        proofInputs.pods
      );
    }
  }
  // Check that nullifier isn't requested if it's not linked to anything.
  // An owner ID not checked against a commitment can be any arbitray numbers.
  if (proofInputs.owner?.externalNullifier !== undefined && !hasOwnerEntry) {
    throw new Error("Nullifier requires an entry containing owner ID.");
  }

  checkProofPODUniquenessInputsForConfig(proofConfig, proofInputs);

  checkProofListMembershipInputsForConfig(proofConfig, proofInputs);
}

export function checkProofPODUniquenessInputsForConfig(
  proofConfig: { uniquePODs?: boolean },
  proofInputs: { pods: Record<PODName, POD> }
): void {
  if (proofConfig.uniquePODs) {
    const contentIDs = Object.values(proofInputs.pods).map(
      (pod) => pod.contentID
    );
    const uniqueContentIDs = uniq(contentIDs);
    const podsAreUnique = isEqual(contentIDs, uniqueContentIDs);

    if (!podsAreUnique) {
      throw new Error(
        "Proof configuration specifies that the PODs should have unique content IDs, but they don't."
      );
    }
  }
}

export function checkProofBoundsCheckInputsForConfig(
  entryName: PODEntryIdentifier,
  entryConfig: GPCProofEntryConfig,
  entryValue: PODValue
): void {
  if (entryConfig.inRange !== undefined) {
    if (entryValue.type !== "int") {
      throw new TypeError(
        `Proof configuration for entry ${entryName} has bounds check but entry value is not of type "int".`
      );
    }
    if (entryValue.value < entryConfig.inRange.min) {
      throw new RangeError(
        `Entry ${entryName} is less than its prescribed minimum value ${entryConfig.inRange.min}.`
      );
    }
    if (entryValue.value > entryConfig.inRange.max) {
      throw new RangeError(
        `Entry ${entryName} is greater than its prescribed maximum value ${entryConfig.inRange.max}.`
      );
    }
  }
  if (entryConfig.notInRange !== undefined) {
    if (entryValue.type !== "int") {
      throw new TypeError(
        `Proof configuration for entry ${entryName} has out of bounds check but entry value is not of type "int".`
      );
    }
    if (
      entryConfig.notInRange.min <= entryValue.value &&
      entryValue.value <= entryConfig.notInRange.max
    ) {
      throw new RangeError(
        `Entry ${entryName} does not lie outside of the interval [${entryConfig.notInRange.min},${entryConfig.notInRange.max}].`
      );
    }
  }
}

export function checkProofEntryInequalityInputsForConfig(
  entryName: PODEntryIdentifier,
  entryConfig: GPCProofEntryInequalityConfig,
  entryValue: PODValue,
  pods: Record<PODName, POD>
): void {
  type B = boolean;
  type N = bigint;
  const inequalityCheckTriples: [
    string,
    PODEntryIdentifier | undefined,
    (x: N, y: N) => B
  ][] = [
    ["less than", entryConfig.lessThan, (x: N, y: N): B => x < y],
    [
      "less than or equal to",
      entryConfig.lessThanEq,
      (x: N, y: N): B => x <= y
    ],
    ["greater than", entryConfig.greaterThan, (x: N, y: N): B => x > y],
    [
      "greater than or equal to",
      entryConfig.greaterThanEq,
      (x: N, y: N): B => x >= y
    ]
  ];

  for (const [checkType, otherEntry, cmp] of inequalityCheckTriples) {
    if (otherEntry !== undefined) {
      const { objName: otherObjName, entryName: otherEntryName } =
        splitPODEntryIdentifier(otherEntry);

      // Since {@link checkProofBoundsCheckInputsForConfig} has passed, both
      // `entryName` and `otherEntryName` are amongst the bounds-checked entries
      // and therefore exist in the input as PODIntValues.
      const otherPOD = pods[otherObjName] as POD;
      const otherEntryValue = resolvePODEntry(
        otherEntryName,
        otherPOD
      ) as PODIntValue;
      if (!cmp(entryValue.value as bigint, otherEntryValue.value)) {
        throw new Error(
          `Input entry ${entryName} should be ${checkType} entry ${otherEntry}, but it is not.`
        );
      }
    }
  }
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
    for (const [
      comparisonId,
      { type: membershipIndicator, listIdentifier }
    ] of Object.entries(listConfig)) {
      const inputList = proofInputs.membershipLists[listIdentifier];

      // The configuration and input list element types should
      // agree.
      const comparisonValue = resolvePODEntryOrTupleIdentifier(
        comparisonId as PODEntryIdentifier | TupleIdentifier,
        proofInputs.pods,
        proofConfig.tuples
      );

      if (comparisonValue === undefined) {
        throw new ReferenceError(
          `Comparison value with identifier ${comparisonId} should be compared against the list ${listIdentifier} but it doesn't exist in the proof input.`
        );
      }

      // The comparison value and list value widths should match up.
      const comparisonWidth = widthOfEntryOrTuple(comparisonValue);

      for (const element of inputList) {
        const elementWidth = widthOfEntryOrTuple(element);

        if (!isEqual(elementWidth, comparisonWidth)) {
          throw new TypeError(
            `Membership list ${listIdentifier} in input contains element of width ${elementWidth} while comparison value with identifier ${JSON.stringify(
              comparisonId
            )} has width ${comparisonWidth}.`
          );
        }
      }

      // The comparison value should be a (non-)member of the list. We compare
      // hashes as this reflects how the values will be treated in the
      // circuit.
      const isComparisonValueInList = inputList.find((element) =>
        isEqual(
          applyOrMap(podValueHash, element),
          applyOrMap(podValueHash, comparisonValue)
        )
      );

      if (
        membershipIndicator === LIST_MEMBERSHIP &&
        isComparisonValueInList === undefined
      ) {
        throw new Error(
          `Comparison value ${printPODValueOrTuple(
            comparisonValue
          )} corresponding to identifier ${JSON.stringify(
            comparisonId
          )} is not a member of list ${JSON.stringify(listIdentifier)}.`
        );
      }

      if (
        membershipIndicator === LIST_NONMEMBERSHIP &&
        isComparisonValueInList !== undefined
      ) {
        throw new Error(
          `Comparison value ${printPODValueOrTuple(
            comparisonValue
          )} corresponding to identifier ${JSON.stringify(
            comparisonId
          )} is a member of list ${JSON.stringify(listIdentifier)}.`
        );
      }
    }
  }
}

export function checkInputListNamesForConfig(
  listConfig: GPCProofMembershipListConfig,
  listNames: PODName[]
): void {
  // Config and input list membership checks should have the same list names.
  const configListNames = new Set(
    Object.values(listConfig).map((config) => config.listIdentifier)
  );
  const inputListNames = new Set(listNames);

  if (!isEqual(configListNames, inputListNames)) {
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
    if ("nullifierHashV3" in revealedClaims.owner) {
      requireType(
        "owner.nullifierHashV3",
        revealedClaims.owner.nullifierHashV3,
        "bigint"
      );
    } else {
      requireType(
        "owner.nullifierHashV4",
        revealedClaims.owner.nullifierHashV4,
        "bigint"
      );
    }
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
    0,
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

  if (objClaims.contentID !== undefined) {
    requireType("contentID", objClaims.contentID, "bigint");
  }

  if (objClaims.signerPublicKey !== undefined) {
    requireType("signerPublicKey", objClaims.signerPublicKey, "string");
    checkPublicKeyFormat(objClaims.signerPublicKey);
  }

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

        // This named entry should satisfy the bounds set out in the proof
        // configuration (if any).
        checkProofBoundsCheckInputsForConfig(
          `${objName}.${entryName}`,
          entryConfig,
          revealedValue
        );
      }
    }

    // Examine config for POD content ID.
    if (objConfig.contentID?.isRevealed ?? false) {
      // This named object in config should be provided in claims.
      const objClaims = revealedClaims.pods[objName];
      if (objClaims === undefined) {
        throw new ReferenceError(
          `Configuration reveals content ID of object "${objName}" but
          the POD is not revealed in claims.`
        );
      }
      const revealedContentID = objClaims.contentID;
      if (revealedContentID === undefined) {
        throw new ReferenceError(
          `Configuration reveals content ID of object "${objName}" which` +
            ` doesn't exist in claims.`
        );
      }
    }

    // Examine config for signer's public key.
    if (objConfig.signerPublicKey?.isRevealed ?? true) {
      // This named object in config should be provided in claims.
      const objClaims = revealedClaims.pods[objName];
      if (objClaims === undefined) {
        throw new ReferenceError(
          `Configuration reveals signer's public key of object "${objName}" but
          the POD is not revealed in claims.`
        );
      }
      const revealedSignerKey = objClaims.signerPublicKey;
      if (revealedSignerKey === undefined) {
        throw new ReferenceError(
          `Configuration reveals signer's key of object "${objName}" which` +
            ` doesn't exist in claims.`
        );
      }
    }
  }

  // The revealed claims should not include any PODs not in the config.
  const revealedObjs = Object.keys(revealedClaims.pods);
  if (revealedObjs.some((objName) => boundConfig.pods[objName] === undefined)) {
    throw new ReferenceError(
      `Revealed claims contain POD(s) not present in the proof configuration. Revealed claims contain PODs ${revealedObjs} while the configuration contains PODs ${Object.keys(
        boundConfig.pods
      )}.`
    );
  }

  // Reverse check that each revealed entry and object exists and is revealed in
  // config. Object signers' public keys need not be specified in the config if
  // revealed, though they should be if not, and content IDs need not be
  // specified, in which case they should not be revealed.
  for (const [objName, objClaims] of Object.entries(revealedClaims.pods)) {
    const objConfig = boundConfig.pods[objName];
    if (objConfig === undefined) {
      throw new ReferenceError(
        `Claims include object "${objName}" which doesn't exist in config.`
      );
    }
    if (objClaims.contentID !== undefined) {
      const contentIDConfig = objConfig.contentID;
      if (contentIDConfig === undefined) {
        throw new ReferenceError(
          `Claims reveal content ID of object "${objName}" which
             doesn't exist in config.`
        );
      }
    }
    if (objClaims.signerPublicKey === undefined) {
      const signerPublicKeyConfig = objConfig.signerPublicKey;
      if (signerPublicKeyConfig === undefined) {
        throw new ReferenceError(
          `Claims do not reveal signer's public key of object "${objName}" which
             doesn't exist in config.`
        );
      }
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
 * @param [circuitFamily=ProtoPODGPC.CIRCUIT_FAMILY] the circuit family to pick
 *   the circuit from. This must be sorted in order of increasing circuit size
 *   (constraint count).
 * @returns the circuit description, or undefined if no circuit can handle
 *   the required parameters.
 * @throws Error if there are no circuits satisfying the given requirements.
 */
export function pickCircuitForRequirements(
  circuitReq: GPCRequirements,
  circuitFamily: ProtoPODGPCCircuitDesc[] = ProtoPODGPC.CIRCUIT_FAMILY
): ProtoPODGPCCircuitDesc {
  for (const circuitDesc of circuitFamily) {
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
    circuitDesc.maxNumericValues >= circuitReq.nNumericValues &&
    circuitDesc.maxEntryInequalities >= circuitReq.nEntryInequalities &&
    circuitDesc.maxLists >= circuitReq.nLists &&
    // The circuit description should be able to contain the largest of the lists.
    circuitDesc.maxListElements >= circuitReq.maxListSize &&
    // If we require an owner module, the circuit had better include it, else
    // it does not matter.
    (circuitDesc.includeOwnerV3 || !circuitReq.includeOwnerV3) &&
    (circuitDesc.includeOwnerV4 || !circuitReq.includeOwnerV4)
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
    Math.max(rs1.nNumericValues, rs2.nNumericValues),
    Math.max(rs1.nEntryInequalities, rs2.nEntryInequalities),
    Math.max(rs1.nLists, rs2.nLists),
    Math.max(rs1.maxListSize, rs2.maxListSize),
    tupleArities,
    rs1.includeOwnerV3 || rs2.includeOwnerV3,
    rs1.includeOwnerV4 || rs2.includeOwnerV4
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
 * @param circuitFamily the circuit family to pick the circuit from. This must
 * be sorted in order of increasing circuit size (constraint count).
 * @param circuitIdentifier a specific circuit to be used
 * @returns the full description of the circuit to be used for the proof
 * @throws Error if no known circuit can support the given parameters, or if
 *   the named circuit cannot do so.
 */
export function checkCircuitRequirements(
  requiredParameters: GPCRequirements,
  circuitFamily: ProtoPODGPCCircuitDesc[],
  circuitIdentifier?: GPCIdentifier
): ProtoPODGPCCircuitDesc {
  if (circuitIdentifier !== undefined) {
    const { familyName, circuitName } =
      splitCircuitIdentifier(circuitIdentifier);
    const foundDesc = ProtoPODGPC.findCircuit(
      familyName,
      circuitName,
      circuitFamily
    );
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
    const pickedDesc = pickCircuitForRequirements(
      requiredParameters,
      circuitFamily
    );
    if (pickedDesc === undefined) {
      throw new Error(`No supported circuit meets proof requirements.`);
    }
    return pickedDesc;
  }
}

/**
 * Checks whether a POD entry identifier exists in the proof configuration for
 * the purpose of tuple checking.
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
  const [podName, entryName] = checkPODEntryIdentifierParts(
    tupleNameForErrorMessages,
    entryIdentifier
  );
  const pod = pods[podName];

  if (pod === undefined) {
    throw new ReferenceError(
      `Tuple ${tupleNameForErrorMessages} refers to entry ${entryName} in non-existent POD ${podName}.`
    );
  }

  // If the entry name is virtual, it need not be in the proof configuration.
  if (!isVirtualEntryName(entryName)) {
    const entry = pod.entries[entryName];

    if (entry === undefined) {
      throw new ReferenceError(
        `Tuple ${tupleNameForErrorMessages} refers to non-existent entry ${entryName} in POD ${podName}.`
      );
    }
  }
}
