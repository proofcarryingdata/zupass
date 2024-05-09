pragma circom 2.1.8;

include "circomlib/circuits/poseidon.circom"; // Poseidon hash
include "gpc-util.circom"; // input selector
include "tuple.circom"; // tuple hasher

/**
 * Module mapping MAX_TUPLES tuples of arity TUPLE_ARITY
 * chosen from a set of MAX_ELEMENTS input signals to
 * MAX_TUPLES hashes representing these tuples.
 */

template MultiTupleModule(
    // Number of tuples to generate
    MAX_TUPLES,
    // Arity of each generated tuple
    TUPLE_ARITY,
    // Maximum number of elements to choose from
    MAX_ELEMENTS
) {
    // Elements used to form tuples
    signal input tupleElements[MAX_ELEMENTS];
    
    // For each i, `tupleIndices[i]` contains the indices of the elements forming the ith tuple,
    // where an index j < MAX_ENTRIES refers to `tupleElements[j]` and MAX_ENTRIES <= j < MAX_ENTRIES + i refers
    // to `tupleHashes[j - MAX_ENTRIES]`.
    signal input tupleIndices[MAX_TUPLES][TUPLE_ARITY];

    // Tuple hashes to output
    signal output tupleHashes[MAX_TUPLES];

    // Components for computing forming the ith tuple
    // from the indices in `tupleIndices[i]` that
    // refer to elements of
    // `tupleElements.concat(tupleHashes.slice(0,i))`.
    component tupleHashers[MAX_TUPLES];

    for (var i = 0; i < MAX_TUPLES; i++) {
	      // Let the hasher be the tuple module expecting
	      // `MAX_ENTRIES + i` values to choose from.
	      tupleHashers[i] = TupleHasher(TUPLE_ARITY, MAX_ELEMENTS + i);

	      // Select the ith set of indices from `tupleIndices`.
	      tupleHashers[i].tupleIndices <== tupleIndices[i];

	      // Feed in the value hashes
	      for (var j = 0; j < MAX_ELEMENTS; j++) {
	          tupleHashers[i].tupleElements[j] <== tupleElements[j];
	      }

	      // ...and the first `i` tuple hashes.
	      for (var j = 0; j < i; j++) {
	          tupleHashers[i].tupleElements[MAX_ELEMENTS + j] <== tupleHashes[j];
	      }

	      // Return the output.
	      tupleHashes[i] <== tupleHashers[i].tupleHash;
    }

}
