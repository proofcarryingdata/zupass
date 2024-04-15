pragma circom 2.1.8;

include "circomlib/circuits/poseidon.circom";

/**
 * Module mapping N signals to an N-tuple, represented here
 * in the form of a series of successive Poseidon hashes on
 * two elements. An i-tuple (i < N) is an N-tuple with 0s in
 * place of those elements to be excluded.
 */

template TupleModule(
    // Maximum arity of the tuple.
    MAX_ARITY
) {

    // Value hashes as input signals
    signal input valueHash[MAX_ARITY];
    // Indicator of whether the value is included in the tuple. Externally constrained to 0 or 1.
    signal input isValueEnabled[MAX_ARITY];

    // Intermediate hashes
    signal hash[MAX_ARITY];

    // Reduce (valueHash[0]*isValueEnabled[0], ..., valueHash[MAX_ARITY-1]*isValueEnabled[MAX_ARITY-1])
    // to a field element via Poseidon(2).
    hash[0] <== valueHash[0]*isValueEnabled[0];
    
    for(var i = 1; i < MAX_ARITY; i++) {
	hash[i] <== Poseidon(2)([hash[i-1], valueHash[i]*isValueEnabled[i]]);
    }
    
    // Output
    signal output tupleHash <== hash[MAX_ARITY-1];
}
