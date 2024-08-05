import { PODValueTuple, podValueHash } from "@pcd/pod";
import { BABY_JUB_NEGATIVE_ONE } from "@pcd/util";
import { computeTupleIndices, hashTuple } from "./multituple.js";
import {
  ProtoPODGPCCircuitParams,
  paramMaxVirtualEntries
} from "./proto-pod-gpc.js";
import { CircuitSignal } from "./types.js";
import { extendedSignalArray, padArray } from "./util.js";

export type ListMembershipModuleInputs = {
  comparisonValue: CircuitSignal;
  validValues: CircuitSignal[];
};

export type ListMembershipModuleInputNamesType = [
  "comparisonValue",
  "validValues"
];

export type ListMembershipModuleOutputs = { isMember: CircuitSignal };

export type ListMembershipModuleOutputNamesType = ["isMember"];

/**
 * Generates the ProtoPODGPC circuit inputs for multiple list
 * membership checks including the required input to the tuple
 * module whenever necessary.
 *
 * @param params parameters of the ProtoPODGPC the list is processed for
 * @param listComparisonValueIndices an array of arrays of indices of entry values, each of which
 * refers to a tuple of entry values that should be a member of the corresponding list.
 * @param lists arrays of tuples of constant values to compare against
 * @returns the circuit inputs necessary for the list membership portion of the ProtoPODGPC
 * circuit, viz. a list of tuple indices of arity `params.tupleArity` representing the input
 * tuples, numbers representing the indices of the entry values/entry value tuples which are
 * members of the lists, and the membership lists in hashed form.
 * @throws RangeError if any of the inputs are out of bounds with respect to the
 * circuit parameters.
 * @throws TypeError if the list and index arrays are malformed.
 */
export function processLists(
  params: ProtoPODGPCCircuitParams,
  listComparisonValueIndices: number[][],
  lists: PODValueTuple[][]
): {
  tupleIndices: CircuitSignal[][];
  listComparisonValueIndex: CircuitSignal[];
  listValidValues: CircuitSignal[][];
} {
  // Ensure that the circuit can accommodate these lists
  if (lists.length > params.maxLists) {
    throw new RangeError(
      `The number of lists (${lists.length}) exceeds the maximum number of lists permissible by the circuit parameters (${params.maxLists}).`
    );
  }

  const maxVirtualEntries = paramMaxVirtualEntries(params);
  let firstAvailableTupleIndex = params.maxEntries + maxVirtualEntries;
  const unpaddedOutputObject: {
    tupleIndices: CircuitSignal[][];
    listComparisonValueIndices: CircuitSignal[];
    listValidValuess: CircuitSignal[][];
  } = {
    tupleIndices: [],
    listComparisonValueIndices: [],
    listValidValuess: []
  };

  for (let i = 0; i < listComparisonValueIndices.length; i++) {
    // Process each of the lists
    const processedList = processSingleList(
      params,
      firstAvailableTupleIndex,
      listComparisonValueIndices[i],
      lists[i]
    );

    // Push tuple indices as bigints.
    processedList.tupleIndices.forEach((indexTuple: number[]) =>
      unpaddedOutputObject.tupleIndices.push(indexTuple.map(BigInt))
    );
    // Push member indices as bigints.
    unpaddedOutputObject.listComparisonValueIndices.push(
      BigInt(processedList.listComparisonValueIndex)
    );

    // Push the hashed membership list.
    unpaddedOutputObject.listValidValuess.push(processedList.listValidValues);

    // Advance the first tuple index.
    firstAvailableTupleIndex += processedList.tupleIndices.length;

    // Ensure that we haven't computed too many tuples for the given circuit parameters.
    if (
      firstAvailableTupleIndex >
      params.maxTuples + maxVirtualEntries + params.maxEntries
    ) {
      throw new RangeError(
        `The maximum tuple size parameter (${params.maxTuples}) cannot accommodate the required tuples.`
      );
    }
  }

  // Pad and return
  return {
    tupleIndices: padArray(
      unpaddedOutputObject.tupleIndices,
      params.maxTuples,
      // Pad with tuples of index 0.
      extendedSignalArray([], params.tupleArity)
    ),
    listComparisonValueIndex: extendedSignalArray(
      unpaddedOutputObject.listComparisonValueIndices,
      params.maxLists,
      // Pad with -1 (mod p), which makes the comparison value
      // the fixed constant 0 in the corresponding circuit.
      BABY_JUB_NEGATIVE_ONE
    ),
    listValidValues: padArray(
      unpaddedOutputObject.listValidValuess,
      params.maxLists,
      // Pad with lists of zeroes.
      extendedSignalArray([], params.maxListElements)
    )
  };
}

/**
 * Generates part of the ProtoPODGPC circuit inputs for a single
 * list membership check. This is used to generate the full inputs
 * for multiple list membership checks in (@link processLists).
 *
 * Processes a single membership list together with the (multi-)index
 * of the entry value (or entry value tuple) that ought to
 * be a member of this list. This is done by means of appropriate
 * applications of {@link hashTuple} and {@link computeTupleIndices}.
 * If no tuples are involved, then `listComparisonValueIndex` is a
 * singleton (a list containing a single element) and `list` a list
 * of singletons; the underlying values are hashed as-is rather than
 * being being hashed as 1-ary tuples. The list is padded with its
 * first entry to fill the underlying array up to its capacity
 * (`params.maxListElements`) while ensuring that there are no false
 * positives in list membership checks.
 *
 * @param params parameters of the ProtoPODGPC the list is processed for
 * @param firstAvailableTupleIndex the index of the first output tuple in the combined array of
 * entry and tuple value hashes.
 * @param listComparisonValueIndex tuple of indices of inputs to be compared to the list elements
 * @param list the tuples of constant values making up the list
 * @returns list of tuple indices of arity `params.tupleArity` representing the
 * input tuple, number representing the index of the entry value (tuple) which
 * is a member of the list, and the (unpadded) membership list in hashed form.
 * @throws RangeError if any of the inputs are out of bounds with respect to the
 * given circuit parameters.
 * @throws TypeError if the list and index arrays are malformed.
 */
export function processSingleList(
  params: ProtoPODGPCCircuitParams,
  firstAvailableTupleIndex: number,
  listComparisonValueIndex: number[],
  list: PODValueTuple[]
): {
  tupleIndices: number[][];
  listComparisonValueIndex: number;
  listValidValues: bigint[];
} {
  // Check types
  if (list.length === 0 || listComparisonValueIndex.length === 0) {
    throw new TypeError("The list and member index must be nonempty.");
  }
  if (list.some((x) => x.length !== listComparisonValueIndex.length)) {
    throw new TypeError(
      "The arity of the member index and list elements must coincide."
    );
  }

  // Check bounds
  if (listComparisonValueIndex.some((i) => i >= params.maxEntries)) {
    throw new RangeError(
      `List comparison value index ${listComparisonValueIndex} out of bounds.`
    );
  }

  // Check parameters
  if (params.maxListElements < list.length) {
    throw new RangeError(
      `The number of list elements (${list.length}) exceeds the maximum number of list elements permissible by the circuit parameters (${params.maxListElements}).`
    );
  }

  // `listComparisonValueIndex` will either have one element and thus represent an
  // entry value hash or it will have multiple elements and thus represent
  // a tuple of such hashes.
  const listComparisonValueIndexIsTuple = listComparisonValueIndex.length > 1;

  if (listComparisonValueIndexIsTuple) {
    // Compute the tuple indices corresponding to the comparison value indices.
    const tupleIndices = computeTupleIndices(
      params.tupleArity,
      firstAvailableTupleIndex,
      listComparisonValueIndex
    );
    // Pass each tuple in the membership list to the tuple hasher.
    const unpaddedMembershipList = list.map((l) =>
      hashTuple(params.tupleArity, l)
    );
    // Return the object with padded hashed membership list.
    return {
      tupleIndices: tupleIndices,
      listComparisonValueIndex:
        firstAvailableTupleIndex + tupleIndices.length - 1,
      listValidValues: padArray(
        unpaddedMembershipList,
        params.maxListElements,
        // Pad with first entry in the list to fill the array up to its capacity
        // without there being a false positive.
        unpaddedMembershipList[0]
      )
    };
  } else {
    // Unwrap the singletons and hash.
    const unpaddedMembershipList = list
      .map((singleton) => singleton[0])
      .map(podValueHash);
    // Return the object with padded hashed membership list.
    return {
      tupleIndices: [],
      listComparisonValueIndex: listComparisonValueIndex[0],
      listValidValues: padArray(
        unpaddedMembershipList,
        params.maxListElements,
        // Pad with first entry in the list to fill the array up to its capacity
        // without there being a false positive.
        unpaddedMembershipList[0]
      )
    };
  }
}
