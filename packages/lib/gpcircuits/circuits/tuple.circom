pragma circom 2.1.8;

include "circomlib/circuits/poseidon.circom"; // Poseidon hash
include "gpc-util.circom"; // input selector

/**
 * Module mapping TUPLE_ARITY signals chosen from a set of
 * MAX_VALUES input signals to a tuple hash representing
 * the corresponding tuple.
 */

template TupleModule(
    // Arity of each generated tuple
    TUPLE_ARITY,
    // Maximum number of values to choose from
    MAX_VALUES
) {
    // Values as input signals
    signal input value[MAX_VALUES];
    
    // Tuple of arity TUPLE_ARITY whose elements are indices
    // referring to elements of `value`.
    signal input tupleIndices[TUPLE_ARITY];
    
    signal tupleArray[TUPLE_ARITY];

    for(var i = 0; i < TUPLE_ARITY; i++) {
	tupleArray[i] <== MaybeInputSelector(MAX_VALUES)(value, tupleIndices[i]);
    }

    // Finally, Poseidon hash the tuple.
    signal output tupleHash <== Poseidon(TUPLE_ARITY)(tupleArray);
}
