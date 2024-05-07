import { ProtoPODGPCCircuitParams } from "./proto-pod-gpc";
import { CircuitSignal } from "./types";
import { PODValue, podValueHash } from "@pcd/pod";
import { BABY_JUB_NEGATIVE_ONE } from "@pcd/util";
import { computeTupleIndices, hashTuple } from "./tuple";
import { extendedSignalArray, padArray } from "./util";

export type ListMembershipModuleInputs = {
  value: CircuitSignal;
  list: CircuitSignal[];
};

export type ListMembershipModuleInputNamesType = ["value", "list"];

export type ListMembershipModuleOutputs = { isMember: CircuitSignal };

export type ListMembershipModuleOutputNamesType = ["isMember"];

/**
 * Processes several membership lists of tuples together with
 * the corresponding entry value indices by means of successive
 * applications of {@link processSingleList}.
 *
 * @param params parameters of the ProtoPODGPC the list is processed for
 * @param memberIndices the indices of the entry values (or tuples) each of which is a member of the corresponding list
 * @param lists the membership lists of tuples
 * @returns list of tuple indices of arity `params.tupleArity` representing the input tuples,
 * numbers representing the indices of the entry values/entry value tuples which are members
 *  of the lists, and the membership lists in hashed form.
 * @throws RangeError if any of the indices are out of bounds.
 * @throws TypeError if the list and index arrays are malformed.
 */
export function processLists(
  params: ProtoPODGPCCircuitParams,
  memberIndices: number[][],
  lists: PODValue[][][]
): {
  tupleIndices: CircuitSignal[][];
  memberIndex: CircuitSignal[];
  membershipList: CircuitSignal[][];
} {
  let firstTupleIndex = params.maxEntries;
  const unpaddedOutputObject: {
    tupleIndices: CircuitSignal[][];
    memberIndices: CircuitSignal[];
    membershipLists: CircuitSignal[][];
  } = {
    tupleIndices: [],
    memberIndices: [],
    membershipLists: []
  };

  for (let i = 0; i < memberIndices.length; i++) {
    const processedList = processSingleList(
      params,
      firstTupleIndex,
      memberIndices[i],
      lists[i]
    );
    processedList.tupleIndices.forEach((indexTuple: number[]) =>
      unpaddedOutputObject.tupleIndices.push(indexTuple.map(BigInt))
    );
    unpaddedOutputObject.memberIndices.push(BigInt(processedList.memberIndex));
    unpaddedOutputObject.membershipLists.push(processedList.membershipList);
    firstTupleIndex += processedList.tupleIndices.length;
  }

  // Pad and return
  return {
    tupleIndices: padArray(
      unpaddedOutputObject.tupleIndices,
      params.maxTuples,
      extendedSignalArray([], params.tupleArity)
    ),
    memberIndex: extendedSignalArray(
      unpaddedOutputObject.memberIndices,
      params.maxLists,
      BABY_JUB_NEGATIVE_ONE
    ),
    membershipList: padArray(
      unpaddedOutputObject.membershipLists,
      params.maxLists,
      extendedSignalArray([], params.maxListEntries)
    )
  };
}

/**
 * Processes a single membership list together with the (multi-)index
 * of the entry value (or entry value tuple) that ought to
 * be a member of this list. This is done by means of appropriate
 * applications of {@link hashTuple} and {@link computeTupleIndices}.
 * If no tuples are involved, then `memberIndex` is a singleton and
 * `list` a list of singletons.
 *
 * @param params parameters of the ProtoPODGPC the list is processed for
 * @param firstTupleIndex the index of the first output tuple in the combined array of
 * entry and tuple value hashes.
 * @param memberIndex the index of the entry value (or tuple) which is a member of the list
 * @param list the membership list of tuples
 * @returns list of tuple indices of arity `params.tupleArity` representing the input tuple,
 * number representing the index of the entry value (tuple) which is a member of
 * the list, and the (unpadded) membership list in hashed form.
 * @throws RangeError if any of the indices are out of bounds with respect
 * to the given parameters.
 * @throws TypeError if the list and index arrays are malformed.
 */
export function processSingleList(
  params: ProtoPODGPCCircuitParams,
  firstTupleIndex: number,
  memberIndex: number[],
  list: PODValue[][]
): { tupleIndices: number[][]; memberIndex: number; membershipList: bigint[] } {
  // Check types
  if (list.length === 0 || memberIndex.length === 0) {
    throw new TypeError("The list and member index must be nonempty.");
  }
  if (list.some((x) => x.length !== memberIndex.length)) {
    throw new TypeError(
      "The arity of the member index and list elements must coincide."
    );
  }

  // Check bounds
  if (memberIndex.some((i) => i >= params.maxEntries)) {
    throw new RangeError(`Member index ${memberIndex} out of bounds.`);
  }

  // `memberIndex` will either have one element and thus represent an
  // entry value or it will have multiple elements and thus represent
  // a tuple of entry values.
  const memberIndexIsTuple = memberIndex.length > 1;

  if (memberIndexIsTuple) {
    // Compute the tuple indices corresponding to the member index.
    const tupleIndices = computeTupleIndices(
      params.tupleArity,
      firstTupleIndex,
      memberIndex
    );
    // Pass each tuple in the membership list to the tuple hasher.
    const unpaddedMembershipList = list.map((l) =>
      hashTuple(params.tupleArity, l)
    );
    // Return the object with padded hashed membership list.
    return {
      tupleIndices: tupleIndices,
      memberIndex: firstTupleIndex + tupleIndices.length - 1,
      membershipList: padArray(
        unpaddedMembershipList,
        params.maxListEntries,
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
      memberIndex: memberIndex[0],
      membershipList: padArray(
        unpaddedMembershipList,
        params.maxListEntries,
        unpaddedMembershipList[0]
      )
    };
  }
}
