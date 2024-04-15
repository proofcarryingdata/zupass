pragma circom 2.1.8;

include "circomlib/circuits/comparators.circom";

/**
 * Module for checking whether a value is a member of a given list.
 * A value may be either a POD entry value hash or a combination
 * of such values (e.g. a tuple encoded as a hash).
 */
template MembershipModule(
    // Maximum number of valid values
    MAX_ELEMENTS
) {
    signal input valueHash; // Value hash to be checked.

    signal input valueHashList[MAX_ELEMENTS]; // List of admissible value hashes. Assumed to have repetitions if the actual valueHashList is smaller.

    signal output isMember;

    signal partialProduct[MAX_ELEMENTS];

    for(var i = 0; i < MAX_ELEMENTS; i++) {
	if(i == 0) {
	    partialProduct[i] <== valueHash - valueHashList[i];
	} else {
	    partialProduct[i] <== partialProduct[i-1] * (valueHash - valueHashList[i]);
	}
    }

    isMember <== IsZero()(partialProduct[MAX_ELEMENTS - 1]);
}
