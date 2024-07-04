import {
  CircuitDesc,
  CircuitSignal,
  ProtoPODGPCCircuitParams,
  padArray
} from "@pcd/gpcircuits";
import {
  POD,
  PODEdDSAPublicKeyValue,
  PODName,
  PODValue,
  PODValueTuple,
  POD_NAME_REGEX,
  checkPODName,
  getPODValueForCircuit,
  podValueHash,
  requireType
} from "@pcd/pod";
import { BABY_JUB_NEGATIVE_ONE } from "@pcd/util";
import _ from "lodash";
import {
  GPCBoundConfig,
  GPCIdentifier,
  GPCProofConfig,
  GPCProofEntryConfig,
  GPCProofEntryConfigCommon,
  GPCProofObjectConfig,
  GPCProofTupleConfig,
  PODEntryIdentifier,
  PODVirtualEntryName,
  POD_VIRTUAL_ENTRY_IDENTIFIER_REGEX,
  POD_VIRTUAL_NAME_REGEX,
  TUPLE_PREFIX,
  TupleIdentifier
} from "./gpcTypes";

/**
 * Converts a proof config into a canonical form which is bound to a specific
 * named circuit.  In addition to filling in the circuit name, canonicalization
 * removes unnecessary differences between identical configs.  Specifically:
 * - Remove unknown fields from config objects.
 * - Put `pods`, `entries`, `tuples` and `membershipLists` in sorted order for iteration.
 * - Omit optional fields which are set to their default value.
 *
 * @param proofConfig proof configuration to canonicalize
 * @param circuitIdentifier name of the circuit to use
 * @returns a canonical bound config
 * @throws Error if the circuit name in the config conflicts with the
 *   selected circuit
 */
export function canonicalizeConfig(
  proofConfig: GPCProofConfig,
  circuitIdentifier: GPCIdentifier
): GPCBoundConfig {
  // Ensure no contradictory settings.
  if (
    proofConfig.circuitIdentifier !== undefined &&
    proofConfig.circuitIdentifier !== circuitIdentifier
  ) {
    throw new Error(
      `Circuit name "${proofConfig.circuitIdentifier}" in config` +
        ` does not match bound circuit name "${circuitIdentifier}".`
    );
  }

  // Force object configs to be canonical and in sorted order.
  const orderedObjectNames = Object.keys(proofConfig.pods).sort();
  const canonicalPODs: Record<PODName, GPCProofObjectConfig> = {};
  for (const objName of orderedObjectNames) {
    const objectConfig = proofConfig.pods[objName];
    canonicalPODs[objName] = canonicalizeObjectConfig(objectConfig);
  }

  // Force tuples and their membership lists to be sorted by name
  const tupleRecord = canonicalizeTupleConfig(proofConfig.tuples ?? {});

  // Forcing circuit name to be present is the only type-level difference
  // between GPCProofConfig and GPCBoundConfig.
  return {
    circuitIdentifier: circuitIdentifier,
    pods: canonicalPODs,
    ...(proofConfig.tuples !== undefined ? { tuples: tupleRecord } : {})
  };
}

function canonicalizeObjectConfig(
  proofObjectConfig: GPCProofObjectConfig
): GPCProofObjectConfig {
  const canonicalEntries: Record<PODName, GPCProofEntryConfig> = {};

  // Force entry configs to be canonical and in sorted order.
  const orderedEntryNames = Object.keys(proofObjectConfig.entries).sort();
  for (const entryName of orderedEntryNames) {
    const entryConfig = proofObjectConfig.entries[entryName];
    canonicalEntries[entryName] = canonicalizeEntryConfig(entryConfig);
  }

  // Check if signer's public key configuration is set to its defaults, in which
  // case it will be omitted in the canonicalised config.
  const signerPublicKeyConfig = proofObjectConfig.signerPublicKey;
  const canonicalizedSignerPublicKeyConfig =
    signerPublicKeyConfig !== undefined
      ? canonicalizeSignerPublicKeyConfig(signerPublicKeyConfig)
      : undefined;

  return {
    entries: canonicalEntries,
    ...(canonicalizedSignerPublicKeyConfig !== undefined
      ? { signerPublicKey: canonicalizedSignerPublicKeyConfig }
      : {})
  };
}

export function canonicalizeSignerPublicKeyConfig(
  signerPublicKeyConfig: GPCProofEntryConfigCommon
): GPCProofEntryConfigCommon | undefined {
  if (
    Object.keys(signerPublicKeyConfig).length === 1 &&
    signerPublicKeyConfig.isRevealed
  ) {
    return undefined;
  } else {
    // Set optional fields only when they have non-default values.
    return {
      isRevealed: signerPublicKeyConfig.isRevealed,
      ...(signerPublicKeyConfig.equalsEntry !== undefined
        ? { equalsEntry: signerPublicKeyConfig.equalsEntry }
        : {}),
      ...(signerPublicKeyConfig.isMemberOf !== undefined
        ? {
            isMemberOf: signerPublicKeyConfig.isMemberOf
          }
        : {}),
      ...(signerPublicKeyConfig.isNotMemberOf !== undefined
        ? {
            isNotMemberOf: signerPublicKeyConfig.isNotMemberOf
          }
        : {})
    };
  }
}

export function canonicalizeEntryConfig(
  proofEntryConfig: GPCProofEntryConfig
): GPCProofEntryConfig {
  // Set optional fields only when they have non-default values.
  return {
    isRevealed: proofEntryConfig.isRevealed,
    ...(proofEntryConfig.isOwnerID ? { isOwnerID: true } : {}),
    ...(proofEntryConfig.equalsEntry !== undefined
      ? { equalsEntry: proofEntryConfig.equalsEntry }
      : {}),
    ...(proofEntryConfig.inRange !== undefined
      ? {
          inRange: {
            min: proofEntryConfig.inRange.min,
            max: proofEntryConfig.inRange.max
          }
        }
      : {}),
    ...(proofEntryConfig.isMemberOf !== undefined
      ? {
          isMemberOf: proofEntryConfig.isMemberOf
        }
      : {}),
    ...(proofEntryConfig.isNotMemberOf !== undefined
      ? {
          isNotMemberOf: proofEntryConfig.isNotMemberOf
        }
      : {})
  };
}

function canonicalizeTupleConfig(
  tupleRecord: Record<PODName, GPCProofTupleConfig>
): Record<PODName, GPCProofTupleConfig> {
  return Object.fromEntries(
    Object.keys(tupleRecord)
      .sort()
      .map((tupleName) => {
        const tupleConfig = tupleRecord[tupleName as TupleIdentifier];

        return [
          tupleName,
          {
            ...tupleConfig,
            ...(tupleConfig.isMemberOf === undefined
              ? {}
              : { isMemberOf: tupleConfig.isMemberOf }),
            ...(tupleConfig.isNotMemberOf === undefined
              ? {}
              : { isNotMemberOf: tupleConfig.isNotMemberOf })
          }
        ];
      })
  );
}

/**
 * Checks that the input matches the proper format for an entry name, virtual or
 * ortherwise, as given by {@link POD_NAME_REGEX} and {@link
 * POD_VIRTUAL_NAME_REGEX}.
 *
 * @param name the string to check
 * @param strict indicator or whether this string should name an actual POD
 * entry
 * @returns the unmodified input, for easy chaining
 * @throws TypeError if the format doesn't match
 */
export function checkPODEntryName(name?: string, strict?: boolean): string {
  if (!name) {
    throw new TypeError("POD entry names cannot be undefined.");
  } else if (!strict && name.match(POD_VIRTUAL_NAME_REGEX) !== null) {
    return name;
  } else {
    return checkPODName(name);
  }
}

/**
 * Checks the format of a PODEntryIdentifier, and return its subcomponents.
 *
 * @param nameForErrorMessages the name for this value, used only for error
 *   messages.
 * @param entryIdentifier the value to check
 * @returns the two sub-parts of the identifiers
 * @throws TypeError if the identifier does not match the expected format
 */
export function checkPODEntryIdentifier(
  nameForErrorMessages: string,
  entryIdentifier: PODEntryIdentifier
): [PODName, PODName | PODVirtualEntryName] {
  requireType(nameForErrorMessages, entryIdentifier, "string");
  const parts = entryIdentifier.split(".");
  if (parts.length !== 2) {
    throw new TypeError(
      `Invalid entry identifier in ${nameForErrorMessages}.  Must have the form "objName.entryName".`
    );
  }
  return [checkPODName(parts[0]), checkPODEntryName(parts[1])];
}

/**
 * Creates a PODEntryIdentifier for a named entry in a named object.
 */
export function makePODEntryIdentifier(
  objName: PODName,
  entryName: PODName
): PODEntryIdentifier {
  return `${objName}.${entryName}`;
}

/**
 * Splits a PODEntryIdentifier into its component parts with friendly names
 * for easy access.
 *
 * @param entryIdentifier the identifier to split
 * @returns an object with `objName` and `entryName` fields representing the
 *   two parts of the input identifier
 * @throws TypeError if the identifier doesn't match the required format
 */
export function splitPODEntryIdentifier(entryIdentifier: PODEntryIdentifier): {
  objName: PODName;
  entryName: PODName | PODVirtualEntryName;
} {
  const names = checkPODEntryIdentifier(entryIdentifier, entryIdentifier);
  return { objName: names[0], entryName: names[1] };
}

/**
 * Resolves a POD entry name to its value (if possible) in a given POD.
 *
 * @param entryName the identifier to resolve
 * @param pod a POD
 * @returns a POD value if the entry is found and `undefined` otherwise
 */
export function resolvePODEntry(
  entryName: PODName | PODVirtualEntryName,
  pod: POD
): PODValue | undefined {
  if (entryName.match(POD_NAME_REGEX) !== null) {
    return pod?.content?.getValue(entryName);
  }

  // TODO(POD-P3): Modify for other virtual entry types when they are available by including switch statement.
  return pod?.signerPublicKey !== undefined
    ? PODEdDSAPublicKeyValue(pod?.signerPublicKey)
    : undefined;
}

/**
 * Resolves a PODEntryIdentifier to its value (if possible) given a record
 * mapping POD names to PODs.
 *
 * @param entryIdentifier the identifier to resolve
 * @param pods a record mapping POD names to PODs
 * @returns a POD value if the entry is found and `undefined` otherwise
 * @throws TypeError if the identifier doesn't match the required format
 */
export function resolvePODEntryIdentifier(
  entryIdentifier: PODEntryIdentifier,
  pods: Record<PODName, POD>
): PODValue | undefined {
  const { objName: podName, entryName: entryName } =
    splitPODEntryIdentifier(entryIdentifier);
  const pod = pods[podName];

  return pod !== undefined ? resolvePODEntry(entryName, pod) : undefined;
}

/**
 * POD virtual entry name predicate
 *
 * @param entryName the entry name to check
 * @returns an indicator of whether the given entry name is a virtual entry name
 */
export function isVirtualEntryName(
  entryName: PODName | PODVirtualEntryName
): entryName is PODVirtualEntryName {
  return entryName.match(POD_VIRTUAL_NAME_REGEX) !== null;
}

/**
 * POD virtual entry identifier predicate
 *
 * @param entryIdentifier the entry identifier to check
 * @returns an indicator of whether the given entry identifier is a virtual
 * entry identifier
 */
export function isVirtualEntryIdentifier(entryIdentifier: string): boolean {
  return entryIdentifier.match(POD_VIRTUAL_ENTRY_IDENTIFIER_REGEX) !== null;
}

/**
 * TupleIdentifier predicate
 *
 * @param identifier the identifier to check
 * @returns an indicator of whether the given identifier is a tuple identifier
 */
export function isTupleIdentifier(
  identifier: PODEntryIdentifier | TupleIdentifier
): identifier is TupleIdentifier {
  return identifier.startsWith(`${TUPLE_PREFIX}.`);
}

/**
 * Resolves a tuple name to its value (if possible) given records
 * mapping POD names to PODs and tuple names to tuple configurations.
 *
 * @param tupleName the identifier to resolve
 * @param pods a record mapping POD names to PODs
 * @param tuples a record mapping tuple names to tuple configurations
 * @returns a tuple of POD values if the entry is found and `undefined` otherwise
 */
export function resolveTupleIdentifier(
  tupleIdentifier: TupleIdentifier,
  pods: Record<PODName, POD>,
  tuples: Record<PODName, GPCProofTupleConfig>
): PODValueTuple | undefined {
  const tupleName = tupleIdentifier.slice(`${TUPLE_PREFIX}.`.length);
  const tupleEntries = tuples[tupleName].entries;
  const resolution = tupleEntries.map((entryId) =>
    resolvePODEntryIdentifier(entryId, pods)
  );
  resolution.forEach((value, i) => {
    if (value === undefined) {
      throw new ReferenceError(
        `POD entry value identifier ${tupleEntries[i]} in tuple ${tupleName} does not have a value.`
      );
    }
  });

  return resolution as PODValue[];
}

/**
 * Resolves a POD entry or tuple identifier to its value (if possible) given
 * records mapping POD names to PODs and tuple names to tuple configurations.
 *
 * @param identifier the identifier to resolve
 * @param pods a record mapping POD names to PODs
 * @param tuples a record mapping tuple names to tuple configurations
 * @returns a POD value or tuple of POD values if the entry is found and
 * `undefined` otherwise
 * @throws TypeError if the identifier doesn't match the required format
 * @throws ReferenceError if there is a reference to a non-existent tuple
 */
export function resolvePODEntryOrTupleIdentifier(
  identifier: PODEntryIdentifier | TupleIdentifier,
  pods: Record<PODName, POD>,
  tuples: Record<TupleIdentifier, GPCProofTupleConfig> | undefined
): PODValue | PODValueTuple | undefined {
  return isTupleIdentifier(identifier)
    ? ((): PODValue | PODValueTuple | undefined => {
        if (tuples === undefined) {
          throw new ReferenceError(
            `Identifier ${identifier} refers to tuple but proof configuration does not specify any.`
          );
        } else {
          return resolveTupleIdentifier(
            identifier as TupleIdentifier,
            pods,
            tuples
          );
        }
      })()
    : resolvePODEntryIdentifier(identifier, pods);
}

/**
 * Determines the arity/width of an entry or tuple value, where entry values
 * have width 1 by convention.
 *
 * Examples:
 *
 * widthOfEntryOrTuple({type: "cryptographic", value: 55n})
 *  === 1
 *
 * widthOfEntryOrTuple([{type: "cryptographic", value: 55n},
 *                     {type: "int", value: 99n})
 *  === 2
 *
 * @param value a POD value or tuple of POD values
 * @returns the width of the value type
 */
export function widthOfEntryOrTuple(value: PODValue | PODValue[]): number {
  return Array.isArray(value) ? value.length : 1;
}

/**
 * Checks the format of a GPCIdentifier, and return its subcomponents.
 *
 * @param nameForErrorMessages the name for this value, used only for error
 *   messages.
 * @param entryIdentifier the value to check
 * @returns the two sub-parts of the identifiers
 * @throws TypeError if the identifier does not match the expected format
 */
export function checkCircuitIdentifier(
  circuitIdentifier: GPCIdentifier
): [string, string] {
  requireType("circuitIdentifier", circuitIdentifier, "string");
  const parts = circuitIdentifier.split("_");
  if (parts.length !== 2) {
    throw new TypeError(
      `Invalid circuit identifier.  Must have the form "familyName_circuitName".`
    );
  }
  return [parts[0], parts[1]];
}

/**
 * Splits a GPCIdentifier into its component parts with friendly names
 * for easy access.
 *
 * @param circuitIdentifier the identifier to split
 * @returns an object with `objName` and `entryName` fields representing the
 *   two parts of the input identifier
 * @throws TypeError if the identifier doesn't match the required format
 */
export function splitCircuitIdentifier(circuitIdentifier: GPCIdentifier): {
  familyName: PODName;
  circuitName: PODName;
} {
  const names = checkCircuitIdentifier(circuitIdentifier);
  return { familyName: names[0], circuitName: names[1] };
}

/**
 * Creates a GPIdentifier for the given circuit.
 */
export function makeCircuitIdentifier(circuitDesc: CircuitDesc): GPCIdentifier {
  return `${circuitDesc.family}_${circuitDesc.name}`;
}

/**
 * Creates the numeric signal for a watermark-like value (external nullifier or
 * global watermark).  The result is expected to always be revealed, so there's
 * no assumption of obfuscation.
 *
 * For convenience, we allow any PODValue to be used to fill this role.  If it's
 * numeric, we use the value directly to avoid unnecessary hashing (which is
 * convenient for use cases not based on this package).  If it's not numeric,
 * its hash becomes the watermark.
 *
 * If the input is undefined, the result is BABY_JUB_NEGATIVE_ONE.
 *
 * @param podValue a value to be reduced to a single number.
 * @returns a signal signal to represent this watermark in a circuit.
 */
export function makeWatermarkSignal(podValue: PODValue | undefined): bigint {
  if (podValue === undefined) {
    return BABY_JUB_NEGATIVE_ONE;
  }
  return getPODValueForCircuit(podValue) ?? podValueHash(podValue);
}

/**
 * General-purpose circuit requirements for a given proof.
 * These values will be appropriately checked against the circuits at our
 * disposal in order to accommodate all of the proof requirements. For the
 * objects, entries, Merkle tree depth and membership list sizes, this amounts
 * to picking the circuit description whose corresponding parameters exceed
 * these numbers, while the choice of tuple parameters is more involved.
 */
export type GPCRequirements = {
  /**
   * Number of POD objects which can be included in a proof.
   */
  nObjects: number;

  /**
   * Number of POD entries which can be included in a proof.
   */
  nEntries: number;

  /**
   * Depth of POD merkle tree in the largest POD which can be included in a
   * proof.  Max entries in any object is 2^(depth-1).
   */
  merkleMaxDepth: number;

  /**
   * Number of bounds checks required for the proof.
   */
  nBoundsChecks: number;

  /**
   * Number of lists to be included in proof.
   */
  nLists: number;

  /**
   * Maximum list size of each list to be included in the proof.
   */
  maxListSize: number;

  /**
   * Arities (sizes) of tuples which can included in a proof.
   */
  tupleArities: Record<PODName, number>;
};

/**
 * GPCRequirements constructor.
 */
export function GPCRequirements(
  nObjects: number,
  nEntries: number,
  merkleMaxDepth: number,
  nBoundsChecks: number = 0,
  nLists: number = 0,
  maxListSize: number = 0,
  tupleArities: Record<PODName, number> = {}
): GPCRequirements {
  return {
    nObjects,
    nEntries,
    merkleMaxDepth,
    nBoundsChecks,
    nLists,
    maxListSize,
    tupleArities
  };
}

/**
 * Enumerated type for list membership check type.
 */
export type ListMembershipEnum =
  | typeof LIST_MEMBERSHIP
  | typeof LIST_NONMEMBERSHIP;
export const LIST_MEMBERSHIP = "membership";
export const LIST_NONMEMBERSHIP = "non-membership";

/**
 * Configuration for bounds checks arranged by entry identifier requiring a
 * bounds check.
 *
 * This is deduced from the proof configuration in
 * {@link boundsCheckConfigFromProofConfig}.
 */
export type GPCProofBoundsCheckConfig = Record<
  PODEntryIdentifier,
  BoundsConfig
>;

/**
 * Configuration for named lists arranged by identifier requiring a list
 * (non-)membership check.
 *
 * This is deduced from the proof configuration in
 * {@link listConfigFromProofConfig}.
 */
export type GPCProofMembershipListConfig = Record<
  PODEntryIdentifier | TupleIdentifier,
  ListConfig
>;

/**
 * Bounds check configuration for an individual entry. This specifies the bounds
 * check required for relevant entries at the circuit level.
 */
export type BoundsConfig = { minValue: bigint; maxValue: bigint };

/**
 * List configuration for an individual entry or tuple. This specifies the type
 * of list membership required for relevant entries (or tuple entries) at the
 * circuit level as well as the named list it should be a (non-)member of.
 */
export type ListConfig = {
  type: ListMembershipEnum;
  listIdentifier: PODName;
};

/**
 * Determines the bounds check configuration from the proof configuration.
 *
 * Bounds checks are indicated in each entry field via the optional property
 * `minValue` and/or `maxValue`, each of which specifies a (public) constant
 * bound. This procedure singles out and arranges these bounds check
 * configurations by entry identifier.
 *
 * @param proofConfig the proof configuration
 * @returns a record mapping entry identifiers to their bounds check
 * configurations
 */
export function boundsCheckConfigFromProofConfig(
  proofConfig: GPCProofConfig
): GPCProofBoundsCheckConfig {
  return Object.fromEntries(
    Object.entries(proofConfig.pods).flatMap(([podName, podConfig]) =>
      Object.entries(podConfig.entries).flatMap(([entryName, entryConfig]) =>
        entryConfig.inRange === undefined
          ? []
          : [
              [
                `${podName}.${entryName}`,
                {
                  minValue: entryConfig.inRange.min,
                  maxValue: entryConfig.inRange.max
                }
              ]
            ]
      )
    )
  );
}

/**
 * Determines the list configuration from the proof configuration.
 *
 * List membership or non-membership is indicated in each entry or tuple field
 * via the optional property `isMemberOf` or `isNotMemberOf`, each of which
 * specifies the name of a list it ought to or ought not lie in, the list itself
 * being specified in the proof inputs. This procedure singles out and arranges
 * these list membership configurations by identifier.
 *
 * @param proofConfig the proof configuration
 * @returns a record mapping entry or tuple identifiers to their list
 * configurations
 * @throws TypeError if both membership and non-membership are specified for a
 * given entry
 */
export function listConfigFromProofConfig(
  proofConfig: GPCProofConfig
): GPCProofMembershipListConfig {
  const gpcListConfig: GPCProofMembershipListConfig = {};

  // Check entries and signer's public keys for membership declarations.
  for (const podName of Object.keys(proofConfig.pods)) {
    const pod = proofConfig.pods[podName];

    addIdentifierToListConfig(
      gpcListConfig,
      pod.signerPublicKey,
      `${podName}.$signerPublicKey`
    );

    for (const entryName of Object.keys(pod.entries)) {
      const entryConfig = pod.entries[entryName];

      addIdentifierToListConfig(
        gpcListConfig,
        entryConfig,
        `${podName}.${entryName}`
      );
    }
  }

  // Do the same for tuples
  for (const tupleName of Object.keys(proofConfig.tuples ?? {})) {
    const tupleConfig = (proofConfig.tuples ?? {})[tupleName];

    addIdentifierToListConfig(
      gpcListConfig,
      tupleConfig,
      `${TUPLE_PREFIX}.${tupleName}`
    );
  }

  return gpcListConfig;
}

/**
 * Adds (entry or tuple) identifier and its list config to the list membership
 * configuration of a GPC. This is used as part of the list configuration
 * compilation process for its side-effects.
 *
 * @param gpcListConfig list membership configuration of a GPC
 * @param entryConfig GPC proof entry or tuple configuration
 * @param identifier the identifier of the entry (or tuple)
 * @throws TypeError if both membership and non-membership are specified
 */
function addIdentifierToListConfig(
  gpcListConfig: GPCProofMembershipListConfig,
  entryConfig: GPCProofEntryConfigCommon | GPCProofTupleConfig | undefined,
  identifier: PODEntryIdentifier | TupleIdentifier
): void {
  // Nothing to do if both membership and non-membership lists are undefined.
  if (
    entryConfig?.isMemberOf === undefined &&
    entryConfig?.isNotMemberOf === undefined
  ) {
    return;
  }

  // Throw an error of both membership and non-membership and specified, since
  // specifying both is really just a membership requirement, where the list is
  // the set difference of the membership and non-membership lists.
  if (
    entryConfig.isMemberOf !== undefined &&
    entryConfig.isNotMemberOf !== undefined
  ) {
    throw new Error(
      `Both membership and non-membership lists are specified in the configuration of ${identifier}.`
    );
  }

  const membershipType: ListMembershipEnum =
    entryConfig.isMemberOf !== undefined ? LIST_MEMBERSHIP : LIST_NONMEMBERSHIP;

  const listIdentifier: PODName = (
    membershipType === LIST_MEMBERSHIP
      ? entryConfig.isMemberOf
      : entryConfig.isNotMemberOf
  ) as PODName;

  gpcListConfig[identifier] = {
    type: membershipType,
    listIdentifier
  };
}

// TODO(POD-P2): Get rid of everything below this line.

// Dummy bounds check inputs. Checks that entry with index -1 (i.e. the value 0)
// lies in [0, 0].
export function dummyBoundsCheckInputs(params: ProtoPODGPCCircuitParams): {
  boundsCheckEntryIndices: CircuitSignal[];
  boundsCheckMinValues: CircuitSignal[];
  boundsCheckMaxValues: CircuitSignal[];
} {
  return {
    boundsCheckEntryIndices: padArray(
      [],
      params.maxBoundsChecks,
      BABY_JUB_NEGATIVE_ONE
    ),
    boundsCheckMinValues: padArray([], params.maxBoundsChecks, 0n),
    boundsCheckMaxValues: padArray([], params.maxBoundsChecks, 0n)
  };
}
