import { PODValue, PODValueTuple, podValueHash } from "@pcd/pod";
import { tupleHasher } from "./tuple";
import { CircuitSignal } from "./types";
import { padArray, toChunks } from "./util";

export type MultiTupleModuleInputs = {
  tupleElements: CircuitSignal[];
  tupleIndices: CircuitSignal[][];
};

export type MultiTupleModuleInputNamesType = ["tupleElements", "tupleIndices"];

export type MultiTupleModuleOutputs = { tupleHashes: CircuitSignal[] };

export type MultiTupleModuleOutputNamesType = ["tupleHashes"];

/**
 * Determines the number of `paramTupleArity`-sized tuples
 * necessary to represent a tuple of arity `tupleArity`.
 * Throws a `RangeError` if the tuple arity or tuple arity
 * parameter is not proper.
 */
export function requiredNumTuples(
  paramTupleArity: number,
  tupleArity: number
): number {
  if (paramTupleArity < 2) {
    throw new RangeError("The tuple arity parameter must be at least 2.");
  }
  if (tupleArity < 1) {
    throw new RangeError("Invalid tuple arity.");
  }

  // If there is only one element, we require no tuples, else if there are
  // `paramTupleArity` elements or less,we require one tuple.
  // Else, we require one tuple for the first `paramTupleArity` elements
  // plus one for every additional `paramTupleArity` - 1 elements, since
  // the first tuple element for every subsequent tuple will be reserved
  // for the index pointing to the preceding tuple.
  return Math.ceil((tupleArity - 1) / (paramTupleArity - 1));
}

/**
 * Determines the maximum tuple arity (of a single tuple) representable
 * by the given parameters.
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
      ? // If we have no tuples at our disposal, we cannot represent any tuples,
        // thus return arity 0.
        0
      : // Else we have `paramTupleArity` slots in the first tuple at our
        // disposal and `paramTupleArity` - 1 slots in every subsequent tuple,
        // since the first slot of these tuples will contain the index pointing
        // to the preceding tuple.
        paramTupleArity + (paramTupleArity - 1) * (paramMaxTuples - 1);
  }
}

/**

 * Decomposes a tuple into a chain of tuples of arity
 * `paramTupleArity`, indexing the tuples starting from
 * `firstAvailableTupleIndex`.
 *
 * Generates part of the signal inputs for MultiTupleModule.
 *
 * Examples:
 * computeTupleIndices(2, 5, [1, 3, 4]) === [[1, 3], [5, 4]]
 * computeTupleIndices(3, 5, [0, 1, 4, 2]) === [[0, 1, 4], [5, 2, 0]]
 * computeTupleIndices(4, 6, [3, 4, 2, 1, 5]) === [[3, 4, 2, 1], [6, 5, 3, 3]]
 *
 * This procedure takes an N-tuple of `indices` (referring
 * to elements of some array of values) and returns its
 * representation as an appropriately linked sequence of
 * tuples of arity `paramTupleArity`, where these tuples
 * are indexed starting at `firstAvailableTupleIndex` and the
 * first index is used as padding. 'Appropriately linked'
 * means that the first slot of every output tuple after
 * the first has an index referring to the preceding
 * tuple.
 *
 *
 * @param paramTupleArity the arity of the output tuple
 * @param firstAvailableTupleIndex the index of the first output tuple in the combined array of
 * entry and tuple value hashes
 * @param indices the entry value indices forming the input tuple
 * @returns list of index tuples of arity `paramTupleArity` representing the input tuple
 * @throws RangeError if the parameters are not in the proper ranges.
 */
export function computeTupleIndices(
  paramTupleArity: number,
  firstAvailableTupleIndex: number,
  indices: number[]
): number[][] {
  if (indices.some((i) => i >= firstAvailableTupleIndex)) {
    throw new RangeError(
      "The first available tuple index must be strictly greater than the given indices."
    );
  }

  // The tuple indices will begin with the first `paramTupleArity` indices
  // since it is first in the chain.
  const tupleIndices = [indices.slice(0, paramTupleArity)];

  // If we have more than that,
  if (indices.length > paramTupleArity) {
    // split the remainder into `paramTupleArity - 1` sized chunks.
    const unlinkedChunks = toChunks(
      indices.slice(paramTupleArity),
      paramTupleArity - 1
    );

    // Prepend the 'index' of the preceding tuple
    // to each chunks to link it to the preceding
    // one and push it onto `tupleIndices`.
    unlinkedChunks.forEach((chunk, i) =>
      tupleIndices.push([firstAvailableTupleIndex + i].concat(chunk))
    );
  }

  // Pad the last tuple of `tupleIndices` with `firstIndex` if it is not of length `paramTupleArity` and return.
  const firstIndex = indices[0];
  const lastTupleIdx = tupleIndices.length - 1;
  const lastTuple = tupleIndices[lastTupleIdx];
  const lastTupleLength = lastTuple.length;

  for (let i = 0; i < paramTupleArity - lastTupleLength; i++) {
    lastTuple.push(firstIndex);
  }

  return tupleIndices;
}

/**
 * This procedure takes an N-tuple `elements` and computes its 'tuple hash',
 * thus chaining together smaller tuples to form/represent a larger one.
 * It accomplishes this by hashing the values, then reducing the resulting
 * tuple down to one element, `paramTupleArity` elements at a time, via
 * the Poseidon hash function, padding the tuple with the hash of `elements[0]`
 * if necessary. The precise mechanism is described in `multiTupleHasher` below.
 *
 * @param paramTupleArity the arity of the output tuple
 * @param elements the values forming the input tuple
 * @returns appropriately-formed hash of the input tuple
 * @throws RangeError if `paramTupleArity` is outside the admissible range
 */
export function hashTuple(
  paramTupleArity: number,
  elements: PODValueTuple
): bigint {
  // Call the multituple hasher.
  const multihash = multiTupleHasher(paramTupleArity, elements);

  // Return the last hash.
  return multihash[multihash.length - 1];
}

/**
 * This procedure takes an N-tuple `elements` and computes its 'multituple hash',
 * which is the result of (Poseidon) hashing the first `paramTupleArity` elements
 * and subsequently hashing every successive chunk of `paramTupleArity` - 1 elements,
 * prepending the previously computed hash and padding the remainder of the list
 * with the first element to form a list of exactly `paramTupleArity` elements
 * to feed the `tupleHasher`. All of these hashes are returned. This process
 * mimics the behaviour of the `MultiTupleModule`, which chains together
 * smaller tuples to form/represent a larger one.
 *
 * @param paramTupleArity the arity of the output tuple
 * @param elements the values forming the input tuple
 * @returns the list of multituple hashes
 * @throws RangeError if `paramTupleArity` is outside the admissible range
 */
export function multiTupleHasher(
  paramTupleArity: number,
  elements: PODValue[]
): bigint[] {
  // First hash 'em all.
  const valueHashes = elements.map(podValueHash);

  // Take note of the first hash, which will be used for padding.
  const firstValueHash = valueHashes[0];

  // Hash the first `paramTupleArity` elements.
  const firstChunkHash = tupleHasher(
    padArray(
      valueHashes.slice(0, paramTupleArity),
      paramTupleArity,
      firstValueHash
    )
  );

  // If we have <= `paramTupleArity` elements, return the first
  // chunk hash.
  if (valueHashes.length <= paramTupleArity) {
    return [firstChunkHash];
  }

  // Else, store the first chunk's hash and iterate through each
  // of the following chunks of size `paramTupleArity` - 1, prepending
  // the preceding chunk's hash and padding with the first value hash
  // where necessary.
  const hashes = [firstChunkHash];
  for (
    let i = paramTupleArity;
    i < valueHashes.length;
    i += paramTupleArity - 1
  ) {
    hashes.push(
      tupleHasher(
        padArray(
          [hashes[hashes.length - 1]].concat(
            valueHashes.slice(i, i + paramTupleArity - 1)
          ),
          paramTupleArity,
          firstValueHash
        )
      )
    );
  }
  return hashes;
}
