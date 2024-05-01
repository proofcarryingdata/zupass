import { CircuitSignal } from "./types";
import { PODValue, podValueHash } from "@pcd/pod";
import { computeTupleIndices, hashTuple } from "./tuple";
import { padArray } from "./util";

export type ListMembershipModuleInputs = {
  value: CircuitSignal;
  list: CircuitSignal[];
};

export type ListMembershipModuleInputNamesType = ["value", "list"];

export type ListMembershipModuleOutputs = { isMember: CircuitSignal };

export type ListMembershipModuleOutputNamesType = ["isMember"];

export function hashList(
  paramMaxEntries: number,
  paramTupleArity: number,
  paramMaxListEntries: number,
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
  if (memberIndex.some((i) => i >= paramMaxEntries)) {
    throw new RangeError(`Member index ${memberIndex} out of bounds.`);
  }

  // `memberIndex` will either have one element and thus represent an
  // entry value or it will have multiple elements and thus represent
  // a tuple of entry values.
  const memberIndexIsTuple = memberIndex.length > 1;

  if (memberIndexIsTuple) {
    const tupleIndices = computeTupleIndices(
      paramTupleArity,
      firstTupleIndex,
      memberIndex
    );
    const unpaddedMembershipList = list.map((l) =>
      hashTuple(paramTupleArity, l)
    );
    return {
      tupleIndices: tupleIndices,
      memberIndex: firstTupleIndex + tupleIndices.length - 1,
      membershipList: padArray(
        unpaddedMembershipList,
        paramMaxListEntries,
        unpaddedMembershipList[0]
      )
    };
  } else {
    const unpaddedMembershipList = list[0].map(podValueHash);
    return {
      tupleIndices: [],
      memberIndex: memberIndex[0],
      membershipList: padArray(
        unpaddedMembershipList,
        paramMaxListEntries,
        unpaddedMembershipList[0]
      )
    };
  }
}
