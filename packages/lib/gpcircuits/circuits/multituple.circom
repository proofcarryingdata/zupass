pragma circom 2.1.8;

include "circomlib/circuits/poseidon.circom"; // Poseidon hash
include "gpc-util.circom"; // input selector
include "tuple.circom"; // tuple hasher

/**
 * Module for representing arbitrary tuples as hashes to facilitate
 * the usage of tuples in other modules. More concretely, it takes
 * MAX_TUPLES arrays of TUPLE_ARITY indices as well as MAX_ELEMENTS
 * elements and maps these to MAX_TUPLES hash values. The ith index
 * refer to the input elements if it is < MAX_ELEMENTS, else it
 * refers to a previously computed tuple hash if it is
 * < MAX_ELEMENTS + i. According to this scheme, with the appropriate
 * choice of template paraemters, we may represent arbitrary
 * tuples of entry values as a single hash.
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
    // from the indices in `tupleIndices[i]`. Each tuple
    // can take input from `tupleElements` or previously
    // computed tuple hashes. The loop below appropriately
    // handles this chaining of tuples.
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
