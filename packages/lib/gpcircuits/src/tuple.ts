import { PODValue, podValueHash } from "@pcd/pod";
import { CircuitSignal } from "./types";
import { poseidon2, poseidon3, poseidon4 } from "poseidon-lite";
import { padArray } from "./util";

const poseidon = [poseidon2, poseidon3, poseidon4];

export type TupleModuleInputs = {
  value: CircuitSignal[];
  tupleIndices: CircuitSignal[];
};

export type TupleModuleInputNamesType = ["value", "tupleIndices"];

export type TupleModuleOutputs = { tupleHash: CircuitSignal };

export type TupleModuleOutputNamesType = ["tupleHash"];

/**
 * N <=  pTA => 1 = numTuples
 * pTA < N < 2pTA => 2 = numTuples
 * 2pTA <= N < 3pTA => 3 = numTuples
 * => numTuples =
 */
/**
 * This procedure takes an N-tuple of `indices` (referring
 * to elements of some array of values) and returns its
 * representation as an appropriately linked sequence of
 * tuples of arity `paramMaxArity`, where these tuples
 * are indexed starting at `firstTupleIndex` and the
 * first index is used as padding. More concretely,
 * Given indices [i_1, ..., i_N], if N <= `paramTupleArity`
 * then
 * tupleIndices(paramTupleArity, firstTupleIndex, indices)
 *  === [[i_1, ..., i_N].concat(Array(paramTupleArity-N).fill(i_1))].
 * Else,
 * tupleIndices(paramTupleArity, firstTupleIndex, indices)
 * === [indices.slice(0, paramTupleArity)]
 *		.concat(tupleIndices(
 *				     paramTupleArity,
 *				    firstTupleIndex + 1,
 *				    [firstTupleIndex].concat(
				 indices.slice(paramTupleArity)))).
 * Examples:
 * tupleIndices(2, 5, [1, 3, 4]) === [[1, 3], [5, 4]]
 * tupleIndices(3, 5, [0, 1, 4, 2]) === [[0, 1, 4], [5, 2, 0]]
 * tupleIndices(4, 6, [3, 4, 2, 1, 5]) === [[3, 4, 2, 1], [6, 5, 3, 3]]
 */
export function computeTupleIndices(
  paramTupleArity: number,
  firstTupleIndex: number,
  indices: number[]
): number[][] {
  // Verify that the parameters make sense
  if (paramTupleArity < 2 || paramTupleArity > 4) {
    throw new RangeError("The tuple arity must lie between 2 and 4.");
  }
  if (indices.some((i) => i >= firstTupleIndex)) {
    throw new RangeError(
      "The first tuple index must be strictly greater than the given indices."
    );
  }

  // Note the first index.
  const firstIndex = indices[0];

  // Split `indices into appropriate chunks.
  const [lastTuplePtr, tupleIndices] = indices.reduce(
    (acc: [number, number[][]], i) => {
      const [tupleCount, tupleIndices] = acc;
      const lastTuplePtr = tupleIndices.length - 1;
      const lastTuple = tupleIndices[lastTuplePtr];
      return lastTuple.length < paramTupleArity
        ? [
            tupleCount,
            tupleIndices.slice(0, lastTuplePtr).concat([lastTuple.concat([i])])
          ]
        : [
            tupleCount + 1,
            tupleIndices.concat([[firstTupleIndex + tupleCount, i]])
          ];
    },
    [0, [[]]]
  );

  // Pad the last tuple of `tupleIndices` with `firstIndex` if it is not of length `paramTupleArity` and return.
  const lastTuple = tupleIndices[lastTuplePtr];
  const lastTupleLength = lastTuple.length;

  const paddedTupleIndices =
    lastTupleLength < paramTupleArity
      ? tupleIndices
          .slice(0, lastTuplePtr)
          .concat([padArray(lastTuple, paramTupleArity, firstIndex)])
      : tupleIndices;

  return paddedTupleIndices;
}

/**
 * This procedure takes an N-tuple `values` and computes its 'tuple hash'.
 * It accomplishes this by hashing the values, then reducing the resulting
 * tuple down to one element, `paramTupleArity` elements at a time, via
 * the Poseidon hash function, padding the tuple with the hash of `values[0]`
 * if necessary.
 */
export function hashTuple(paramTupleArity: number, values: PODValue[]): bigint {
  // First hash 'em all.
  const valueHashes = values.map(podValueHash);

  // Take note of the first hash, which will be used for padding.
  const firstValueHash = valueHashes[0];

  // Reduce `valueHashes` via repeated applications of Poseidon.
  const hash = poseidon[paramTupleArity - 2];
  const partialReduction = valueHashes.reduce(
    (acc: bigint[], x: bigint) =>
      acc.length < paramTupleArity ? acc.concat([x]) : [hash(acc), x],
    []
  );
  const reduction =
    partialReduction.length === 1
      ? partialReduction[0]
      : hash(padArray(partialReduction, paramTupleArity, firstValueHash));

  return reduction;
}
