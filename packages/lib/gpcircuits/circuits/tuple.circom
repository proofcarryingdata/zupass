pragma circom 2.1.8;

include "circomlib/circuits/poseidon.circom"; // Poseidon hash
include "gpc-util.circom"; // input selector

/**
 * Module mapping MAX_VALUES signals to MAX_TUPLES tuples of
 * arity TUPLE_ARITY, each of which is encoded in the form of a
 * Poseidon hash on MAX_ARITY elements. Lower-order tuples
 * are assumed to have 0s in unoccupied slots, which may
 * be accomplished by setting the corresponding tuple index
 * to a sufficiently large number, e.g. -1 mod p.
 */

template TupleModule(
    // Arity of each generated tuple
    TUPLE_ARITY,
    // Maximum number of value hashes to choose from
    MAX_VALUES,
    // Maxium number of tuples to generate
    MAX_TUPLES
) {
    // Value hashes as input signals
    signal input valueHash[MAX_VALUES];
    
    // Array indicating which values form which tuples by index,
    // where an index `i` less than MAX_VALUES refers to
    // `valueHash[i]` and one less than `MAX_VALUES + MAX_TUPLES`
    // refers to `valueHash[i - MAX_VALUES]`.
    signal input tupleIndices[MAX_TUPLES][TUPLE_ARITY];
    // Note that tupleIndices[i][j] = -1 refers to 0 by convention.

    // Input selector component.
    component inputSelector[MAX_TUPLES][TUPLE_ARITY];

    for(var i = 0; i < MAX_TUPLES; i++)
	for(var j = 0; j < TUPLE_ARITY; j++)
	    inputSelector[i][j] = MaybeInputSelector(MAX_VALUES + i);

    // Array of tuple entries to be hashed.
    signal tupleArray[MAX_TUPLES][TUPLE_ARITY];

    // Output hashes
    signal output tupleHashes[MAX_TUPLES];

    for(var i = 0; i < MAX_TUPLES; i++) {
	for(var k = 0; k < TUPLE_ARITY; k++) {
	    // Feed in ith tuple's kth entry's index
	    inputSelector[i][k].selectedIndex <== tupleIndices[i][k];
	    // Form the array `valueHash.concat(tupleHashes.slice(0,i))`.
	    for(var j = 0; j < MAX_VALUES + i; j++) {
		inputSelector[i][k].inputs[j]
		    <== (j < MAX_VALUES) ? valueHash[j]
		    : tupleHashes[j - MAX_VALUES];
	    }
	    
	    // Extract the ith tuple's kth field.
	    tupleArray[i][k] <== inputSelector[i][k].out;
	}
	
	// Finally, Poseidon hash the ith tuple.
	tupleHashes[i] <== Poseidon(TUPLE_ARITY)(tupleArray[i]);	
    }
}
