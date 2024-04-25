import { CircuitSignal } from "./types";
import { BABY_JUB_NEGATIVE_ONE } from "@pcd/util";
import { PODValue, podValueHash } from "@pcd/pod";
import { poseidon1, poseidon2, poseidon3, poseidon4 } from "poseidon-lite";

const poseidon = [poseidon2, poseidon3, poseidon4];

export type ListMembershipModuleInputs = {
  value: CircuitSignal;
  list: CircuitSignal[];
};

export type ListMembershipModuleInputNamesType = ["value", "list"];

export type ListMembershipModuleOutputs = { isMember: CircuitSignal };

export type ListMembershipModuleOutputNamesType = ["isMember"];

export class ListMembership {
  // TODO: Rework this to allow for other modules that might make use of
  // tuples.
  /**
   * Given indices of `N <= paramMaxValues` POD entry values and N lists
   * of bigints, this procedure computes the signals necessary to carry out
   * list membership checks (via `ListMembershipModule`) of each of the `N`
   * value hashes in the corresponding list by forming appropriate lower
   * order tuples and one combined membership list.
   *
   * @param `listIndices` denotes the indices of the POD entry values to be checked
   * @param `membershipLists` is a list each of whose elements is a membership
   *  list for the value associated with the corresponding index in `listIndices`.
   * @param `paramMaxValues` denotes the maximum number of POD entry values in the
   * circuit.
   * @param `paramTupleArity` denotes the fixed tuple arity for the circuit.
   * @param `paramMaxListEntries` denotes the maximum number of list entries in the circuit.
   * @param `paramMaxTuples` denotes the maximum number of tuples in the circuit.
   * @returns `number` containing the index of the hash whose membership
   *  is to be checked, where an index less than `paramMaxValues` corresponds to
   *  an entry value hash and a greater index corresponds to a tuple index.
   * @returns `number[][]` containing `paramMaxTuples` lists of `paramTupleArity` tuples
   *  of indices, where an index `i` refers to an entry value hash if it is less than
   *  `paramMaxValues`, otherwise it refers to the tuple represented by the
   *  `paramMaxValues - i`th entry of this list.
   * @returns `bigint[]` containing the combined membership list.
   * @throws TypeError if the lengths of `listIndices` and `membershipLists` don't agree.
   * @throws TypeError if the list of all combinations of elements of `membershipLists`
   *  exceeds `paramMaxListentries`.
   * @throws TypeError if the tuple arity does not lie in the acceptable range.
   * @throws TypeError if any element of `listIndices` exceeds `paramMaxValues - 1`.
   * @throws TypeError if the number of tuples of arity `paramTupleArity` required to
   *  represent `listIndices` exceeds `paramMaxTuples`.
   */
  public static generateSignals(
    listIndices: number[],
    membershipLists: PODValue[][],
    paramMaxValues: number,
    paramTupleArity: number,
    paramMaxListEntries: number,
    paramMaxTuples: number
  ): [number, bigint[][], bigint[]] {
    // Check input
    if (listIndices.length != membershipLists.length)
      throw new TypeError(
        "The lengths of the index and value list arrays must be the same."
      );
    if (
      membershipLists.reduce((prod, lis) => prod * lis.length, 0) >
      paramMaxListEntries
    )
      throw new TypeError(
        `The total number of entries in the list membership check exceeds MAX_LIST_ENTRIES (${paramMaxListEntries}).`
      );
    if (paramTupleArity < 2 || paramTupleArity > 4)
      throw new TypeError("The arity must lie between 2 and 4.");
    listIndices.forEach((i) => {
      if (i >= paramMaxValues)
        throw new Error("The indices cannot exceed MAX_VALUES.");
    });

    // Helpers
    const pad = (arr: any, len: number, padding: any) =>
      arr.concat(Array(len - arr.length).fill(padding));

    // Sort input (TODO: including membership lists) for permutation invariance and hash the individual membership lists.
    const sortedZippedList: [number, bigint[]][] = listIndices
      .map(function (i, j): [number, PODValue[]] {
        return [i, membershipLists[j]];
      })
      .sort((a, b) => a[0] - b[0]) // Sort indices
      .map((pair) => [pair[0], pair[1].map((x) => podValueHash(x))]); // Hash the elements

    // Early return if tuples are not required.
    if (listIndices.length == 1)
      return [
        listIndices[0],
        [[]],
        pad(
          sortedZippedList[0][1],
          paramMaxListEntries,
          sortedZippedList[0][1][0]
        )
      ];

    // Form tupleIndices
    const unpaddedTupleIndices: bigint[][] = ((sortedIndices) => {
      const unpaddedTupleIndices = sortedIndices // Take the sorted indices
        .reduce(
          (tupleIndices: number[][], currentIndex: number) => {
            // and inspect the current index as well as the indices grouped so far.
            const l = tupleIndices.length;
            return tupleIndices[l - 1].length < paramTupleArity // If the last index group is not at arity,
              ? tupleIndices
                  .slice(0, l - 1)
                  .concat([tupleIndices[l - 1].concat([currentIndex])]) // append the current index to it.
              : tupleIndices.concat([[l + paramMaxValues - 1, currentIndex]]); // Else start a new index group with the index of the last index group as well as the current index.
          },
          [[]]
        )
        .map((tup) => tup.map((x) => BigInt(x)));

      // Take care of padding of last set of indices.
      const lastIndices = unpaddedTupleIndices.slice(-1)[0];
      return lastIndices.length == 0 // If we are dealing with the empty list,
        ? [] // Return the empty list.
        : lastIndices.length < paramTupleArity // Else if we're not at arity,
          ? unpaddedTupleIndices
              .slice(0, unpaddedTupleIndices.length - 1)
              .concat([
                pad(lastIndices, paramTupleArity, BABY_JUB_NEGATIVE_ONE)
              ]) // fill up.
          : unpaddedTupleIndices;
    })(sortedZippedList.map((x: [number, bigint[]]) => x[0]));

    if (unpaddedTupleIndices.length > paramTupleArity)
      throw new TypeError(
        `The number of tuple indices (${unpaddedTupleIndices.length}) exceeds MAX_TUPLES (${paramMaxTuples}).`
      );

    const memberIndex = paramMaxValues + unpaddedTupleIndices.length - 1;

    const tupleIndices = pad(
      unpaddedTupleIndices,
      paramMaxTuples,
      pad([], paramTupleArity, BABY_JUB_NEGATIVE_ONE)
    );

    // Choose appropriate Poseidon hash and form hash reducer.
    const hash = poseidon[paramTupleArity - 2];
    const hashReduce = (
      lis: bigint[] // Take the list
    ) =>
      ((reduction: bigint[]) =>
        reduction.length == 1
          ? reduction[0]
          : hash(pad(reduction, paramTupleArity, 0)))(
        // After performing the reduction, make sure the reduction led to a single value by padding with 0s,
        ((l: bigint[]) =>
          l.reduce(
            (acc: bigint[], x: bigint) =>
              acc.length < paramTupleArity ? acc.concat([x]) : [hash(acc), x],
            []
          ))(lis)
      ); // where the reduction consists of grouping elements of the list in lists of size `paramTupleArity`.

    // Mapping for forming list of admissible tuple hashes from the corresponding lists of admissible values
    type Fn = (lisList: bigint[][], acc?: bigint[]) => bigint[];
    const membershipListsToTupleList: Fn = (listList: bigint[][], acc = []) =>
      listList.length == 0
        ? [hashReduce(acc)]
        : listList[0].flatMap((x: bigint) =>
            membershipListsToTupleList(listList.slice(1), acc.concat([x]))
          );

    // Pad membership list if necessary.
    const tupleMembershipList: bigint[] = ((unpaddedArray) =>
      pad(unpaddedArray, paramMaxListEntries, unpaddedArray[0]))(
      membershipListsToTupleList(sortedZippedList.map((x) => x[1]))
    );

    return [memberIndex, tupleIndices, tupleMembershipList];
  }
}
