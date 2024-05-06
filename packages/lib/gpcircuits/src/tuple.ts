import { PODValue, podValueHash } from "@pcd/pod";
import { CircuitSignal } from "./types";
import { poseidon2, poseidon3, poseidon4 } from "poseidon-lite";
import { padArray, toChunks } from "./util";

const poseidon = [poseidon2, poseidon3, poseidon4];

export type TupleModuleInputs = {
  value: CircuitSignal[];
  tupleIndices: CircuitSignal[];
};

export type TupleModuleInputNamesType = ["value", "tupleIndices"];

export type TupleModuleOutputs = { tupleHash: CircuitSignal };

export type TupleModuleOutputNamesType = ["tupleHash"];

/**
 * Determines the number of `paramTupleArity`-sized tuples
 * necessary to represent a tuple of arity `tupleArity`.
 * Throws a `RangeError` if the tuple arity parameter is not proper.
 */
export function requiredNumTuples(
  paramTupleArity: number,
  tupleArity: number
): number {
  if (paramTupleArity < 2) {
    throw new RangeError("The tuple arity parameter must be at least 2.");
  } else {
    return tupleArity <= paramTupleArity
      ? 1
      : Math.ceil((tupleArity - 1) / (paramTupleArity - 1));
  }
}

/**
 * Determines the maximum tuple arity representable by the
 * given parameters.
 * Throws a `RangeError` is the parameters are not proper.
 */
export function maxTupleArity(
  paramMaxTuples: number,
  paramTupleArity: number
): number {
  if (paramTupleArity < 2) {
    throw new RangeError("The tuple arity parameter must be at least 2.");
  } else if (paramMaxTuples < 0) {
    throw new RangeError(
      "The maximum tuple number parameter must be nonnegative."
    );
  } else {
    return paramMaxTuples === 0
      ? 0
      : paramTupleArity + (paramTupleArity - 1) * (paramMaxTuples - 1);
  }
}

/**
 * This procedure takes an N-tuple of `indices` (referring
 * to elements of some array of values) and returns its
 * representation as an appropriately linked sequence of
 * tuples of arity `paramMaxArity`, where these tuples
 * are indexed starting at `firstTupleIndex` and the
 * first index is used as padding. More concretely,
 * Given indices [i_1, ..., i_N], if N <= `paramTupleArity`
 * then
 * computeTupleIndices(paramTupleArity, firstTupleIndex, indices)
 *  === [[i_1, ..., i_N].concat(Array(paramTupleArity-N).fill(i_1))].
 * Else,
 * computeTupleIndices(paramTupleArity, firstTupleIndex, indices)
 * === [indices.slice(0, paramTupleArity)]
 *		.concat(tupleIndices(
 *				     paramTupleArity,
 *				    firstTupleIndex + 1,
 *				    [firstTupleIndex].concat(
				 indices.slice(paramTupleArity)))).
 * Examples:
 * computeTupleIndices(2, 5, [1, 3, 4]) === [[1, 3], [5, 4]]
 * computeTupleIndices(3, 5, [0, 1, 4, 2]) === [[0, 1, 4], [5, 2, 0]]
 * computeTupleIndices(4, 6, [3, 4, 2, 1, 5]) === [[3, 4, 2, 1], [6, 5, 3, 3]]
 *
 * @param paramTupleArity the arity of the output tuple
 * @param firstTupleIndex the index of the first output tuple
 * @param indices the entry value indices forming the input tuple
 * @returns list of index tuples of arity `paramTupleArity` representing the input tuple
 * @throws RangeError if the parameters are not in the proper ranges.
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

  // The tuple indices will begin with the first `paramTupleArity` indices.
  const tupleIndices = [indices.slice(0, paramTupleArity)];

  // If we have more than that,
  if (indices.length > paramTupleArity) {
    // split the remainder into `paramTupleArity - 1` sized chunks.
    const unlinkedChunks = toChunks(
      indices.slice(paramTupleArity),
      paramTupleArity - 1
    );

    // Prepend the 'index' of the preceding tuple
    // to each of these chunks and push them onto `tupleIndices`.
    unlinkedChunks.forEach((chunk, i) =>
      tupleIndices.push([firstTupleIndex + i].concat(chunk))
    );
  }

  // Take note of the last tuple for padding purposes.
  const lastTuplePtr = tupleIndices.length - 1;
  const lastTuple = tupleIndices[lastTuplePtr];
  const lastTupleLength = lastTuple.length;

  // Pad the last tuple of `tupleIndices` with `firstIndex` if it is not of length `paramTupleArity` and return.
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
 *
 * @param paramTupleArity the arity of the output tuple
 * @param values the values forming the input tuple
 * @returns appropriately-formed hash of the input tuple
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
