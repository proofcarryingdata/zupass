import { CircuitDesc } from "@pcd/gpcircuits";
import {
  checkPODName,
  getPODValueForCircuit,
  POD,
  PODName,
  PODValue,
  podValueHash,
  PODValueTuple,
  requireType
} from "@pcd/pod";
import { BABY_JUB_NEGATIVE_ONE } from "@pcd/util";
import _ from "lodash";
import {
  GPCBoundConfig,
  GPCIdentifier,
  GPCProofConfig,
  GPCProofEntryConfig,
  GPCProofObjectConfig,
  GPCProofTupleConfig,
  PODEntryIdentifier,
  PODMembershipLists,
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

  return {
    entries: canonicalEntries
  };
}

function canonicalizeEntryConfig(
  proofEntryConfig: GPCProofEntryConfig
): GPCProofEntryConfig {
  // Set optional fields only when they have non-default values.
  return {
    isRevealed: proofEntryConfig.isRevealed,
    ...(proofEntryConfig.isOwnerID ? { isOwnerID: true } : {}),
    ...(proofEntryConfig.equalsEntry !== undefined
      ? { equalsEntry: proofEntryConfig.equalsEntry }
      : {}),
    ...(proofEntryConfig.isMemberOf !== undefined
      ? {
          isMemberOf: Array.isArray(proofEntryConfig.isMemberOf)
            ? proofEntryConfig.isMemberOf.sort()
            : proofEntryConfig.isMemberOf
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
              : Array.isArray(tupleConfig.isMemberOf)
              ? { isMemberOf: tupleConfig.isMemberOf.sort() }
              : { isMemberOf: tupleConfig.isMemberOf })
          }
        ];
      })
  );
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
): [PODName, PODName] {
  requireType(nameForErrorMessages, entryIdentifier, "string");
  const parts = entryIdentifier.split(".");
  if (parts.length !== 2) {
    throw new TypeError(
      `Invalid entry identifier in ${nameForErrorMessages}.  Must have the form "objName.entryName".`
    );
  }
  return [checkPODName(parts[0]), checkPODName(parts[1])];
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
  entryName: PODName;
} {
  const names = checkPODEntryIdentifier(entryIdentifier, entryIdentifier);
  return { objName: names[0], entryName: names[1] };
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
  const entryValue = pod?.content?.getValue(entryName);

  return entryValue;
}

/**
 * TupleIdentifier predicate
 *
 * @param identifier the identifier to check
 * @returns an indicator of whether the given identifier is a tuple identifier
 * @throws TypeError if the format doesn't match
 */
export function isTupleIdentifier(
  identifier: PODEntryIdentifier | TupleIdentifier
): boolean {
  return identifier.startsWith(`${TUPLE_PREFIX}.`);
}

/**
 * Checks the format of a tuple identifier, and return a pair consisting of the
 * tuple prefix and the name of the tuple.
 *
 * @param nameForErrorMessages the name for this value, used only for error
 *   messages.
 * @param tupleIdentifier the value to check
 * @returns the two sub-parts of the identifiers
 * @throws TypeError if the identifier does not match the expected format
 */
export function checkTupleIdentifier(
  nameForErrorMessages: string,
  tupleIdentifier: TupleIdentifier
): PODName {
  requireType(nameForErrorMessages, tupleIdentifier, "string");
  const parts = tupleIdentifier.split(".");
  if (parts.length !== 2) {
    throw new TypeError(
      `Invalid entry identifier in ${nameForErrorMessages}.  Must have the form "objName.entryName".`
    );
  }
  if (!isTupleIdentifier(tupleIdentifier)) {
    throw new TypeError(
      `Invalid tuple identifier in ${nameForErrorMessages}: ${tupleIdentifier}`
    );
  }
  return checkPODName(parts[1]);
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
  nLists: number = 0,
  maxListSize: number = 0,
  tupleArities: Record<PODName, number> = {}
): GPCRequirements {
  return {
    nObjects,
    nEntries,
    merkleMaxDepth,
    nLists,
    maxListSize,
    tupleArities
  };
}

/**
 * Configuration for named lists, specifying which entries (or tuple entries)
 * lie in the list. This is deduced from the proof configuration in
 * {@link listConfigFromProofConfig}.
 */
export type GPCProofMembershipListConfig = Record<
  PODName,
  (PODEntryIdentifier | TupleIdentifier)[]
>;

/**
 * Determines the list configuration from the proof configuration.
 *
 * List membership is indicated in each entry or tuple field via the optional
 * property `isMemberOf`, which specifies the names of lists it ought to lie in,
 * the list itself being specified in the proof inputs. This procedure makes
 * this implicit list configuration explicit by forming a record mapping list
 * names to arrays of identifiers, each of which specifies those POD entries or
 * tuples that must lie in the list.
 *
 * @param proofConfig the proof configuration
 * @returns a record mapping a list name to an array of identifiers representing entries
 * and tuples that lie in that list
 * @throws TypeError if `isMemberOf` is empty
 */
export function listConfigFromProofConfig(
  proofConfig: GPCProofConfig
): GPCProofMembershipListConfig {
  // Find all [listName, entryID] pairs in proofConfig.pods
  const entryLists: [PODName, PODEntryIdentifier][] = [];

  for (const podName of Object.keys(proofConfig.pods)) {
    const pod = proofConfig.pods[podName];

    for (const entryName of Object.keys(pod.entries)) {
      const lists = pod.entries[entryName].isMemberOf;

      if (lists !== undefined) {
        if (Array.isArray(lists)) {
          if (lists.length === 0) {
            throw new TypeError(
              `The list of lists of valid values for ${podName}.${entryName} is empty.`
            );
          }
          for (const listName of lists ?? []) {
            entryLists.push([listName, `${podName}.${entryName}`]);
          }
        } else {
          entryLists.push([lists, `${podName}.${entryName}`]);
        }
      }
    }
  }

  // Find all [listName, tupleID] pairs in proofConfig.tuples
  const tupleLists: [PODName, PODEntryIdentifier][] = [];

  for (const tupleName of Object.keys(proofConfig.tuples ?? {})) {
    const lists = (proofConfig.tuples ?? {})[tupleName].isMemberOf;

    if (lists !== undefined) {
      if (Array.isArray(lists)) {
        if (lists.length === 0) {
          throw new TypeError(
            `The list of lists of valid values for ${TUPLE_PREFIX}.${tupleName} is empty.`
          );
        }
        for (const listName of lists ?? []) {
          entryLists.push([listName, `${TUPLE_PREFIX}.${tupleName}`]);
        }
      } else {
        entryLists.push([lists, `${TUPLE_PREFIX}.${tupleName}`]);
      }
    }
  }

  // Combine the two and compile config.
  const listConfig: GPCProofMembershipListConfig = {};

  for (const [listName, id] of entryLists.concat(tupleLists)) {
    if (listConfig[listName] === undefined) {
      listConfig[listName] = [id];
    } else {
      listConfig[listName].push(id);
    }
  }

  return listConfig;
}

/**
 * Converts a record of membership lists to one of membership sets.
 *
 * @param membershipLists the lists to convert
 * @returns a record of membership sets
 */
export function membershipListsAsSets(
  membershipLists: PODMembershipLists
): Record<PODName, Set<PODValue> | Set<PODValueTuple>> {
  return Object.fromEntries(
    Object.entries(membershipLists).map((pair) => [
      pair[0],
      new Set(pair[1] as (PODValue | PODValueTuple)[]) as
        | Set<PODValue>
        | Set<PODValueTuple>
    ])
  );
}
