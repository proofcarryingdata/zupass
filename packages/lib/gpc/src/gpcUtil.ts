import {
  CircuitDesc,
  CircuitSignal,
  padArray,
  ProtoPODGPCCircuitDesc
} from "@pcd/gpcircuits";
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
import {
  GPCBoundConfig,
  GPCIdentifier,
  GPCProofConfig,
  GPCProofEntryConfig,
  GPCProofObjectConfig,
  PODEntryIdentifier,
  TupleIdentifier
} from "./gpcTypes";

/**
 * Converts a proof config into a canonical form which is bound to a specific
 * named circuit.  In addition to filling in the circuit name, canonicalization
 * removes unnecessary differences between identical configs.  Specifically:
 * - Remove unknown fields from config objects.
 * - Put `pods` and `entries` in sorted order for iteration.
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

  // Forcing circuit name to be present is the only type-level difference
  // between GPCProofConfig and GPCBoundConfig.
  return {
    circuitIdentifier: circuitIdentifier,
    pods: canonicalPODs
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
      : {})
  };
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

export function resolveTupleIdentifier(
  tupleIdentifier: TupleIdentifier,
  pods: Record<PODName, POD>,
  tuples: Record<TupleIdentifier, PODEntryIdentifier[]>
): PODValue[] | undefined {
  const tupleEntries = tuples[tupleIdentifier];
  const resolution = tupleEntries.map((entryId) =>
    resolvePODEntryIdentifier(entryId, pods)
  );
  return resolution.some((value) => value === undefined)
    ? undefined
    : (resolution as PODValue[]);
}

export function resolvePODEntryOrTupleIdentifier(
  identifier: PODEntryIdentifier | TupleIdentifier,
  pods: Record<PODName, POD>,
  tuples: Record<TupleIdentifier, PODEntryIdentifier[]> | undefined
): PODValue | PODValueTuple | undefined {
  return identifier.slice(0, 6) === "tuple."
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

export function typeOfEntryOrTuple(
  value: PODValue | PODValue[]
): string | string[] {
  return Array.isArray(value) ? value.map((x) => x.type) : value.type;
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
   * Number of entries in each membership list to be included in proof.
   */
  nListElements: Record<PODName, number>;

  /**
   * Arities (sizes) of tuples which can included in a proof.
   */
  tupleArities: Record<PODName, number>;
};

/**
 * GPCSizeRequirements constructor.
 */
export function GPCRequirements(
  nObjects: number,
  nEntries: number,
  merkleMaxDepth: number,
  nListElements: Record<PODName, number> = {},
  tupleArities: Record<PODName, number> = {}
): GPCRequirements {
  return {
    nObjects,
    nEntries,
    merkleMaxDepth,
    nListElements,
    tupleArities
  };
}

// TODO(POD-P2): Get rid of everything below this line.

// Stopgap until membership list compilation is ready.
export const DEFAULT_LIST_ELEMENTS = {};
export const DEFAULT_TUPLE_ARITIES = {};

// Returns default values for the input to the (multi)tuple module, viz.
// an array of tuples of 0, which corresponds to choosing the 0th entry
// value hash. Since these are not constrained anywhere (i.e. not in the
// list membership check, cf. below), there is no effect on the underlying
// logic.
export function dummyTuples(circuitDesc: ProtoPODGPCCircuitDesc): {
  tupleIndices: CircuitSignal[][];
} {
  return {
    tupleIndices: padArray(
      [],
      circuitDesc.maxTuples,
      padArray([], circuitDesc.tupleArity, 0n)
    )
  };
}

// Returns default values for the inputs to the list membership module, viz.
// a comparison value index of -1, which is a reference to the value 0, and
// a list of valid values consisting of zeroes. This results in the list
// membership check being trivially satisfied.
export function dummyListMembership(circuitDesc: ProtoPODGPCCircuitDesc): {
  listComparisonValueIndex: CircuitSignal[];
  listValidValues: CircuitSignal[][];
} {
  return {
    listComparisonValueIndex: padArray(
      [],
      circuitDesc.maxLists,
      BABY_JUB_NEGATIVE_ONE
    ),
    listValidValues: padArray(
      [],
      circuitDesc.maxLists,
      padArray([], circuitDesc.maxListElements, 0n)
    )
  };
}
