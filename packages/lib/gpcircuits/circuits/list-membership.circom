pragma circom 2.1.8;

include "circomlib/circuits/comparators.circom";

/**
 * Module for checking whether a value is a member of a given list.
 * A value may be either a POD entry value hash or a combination
 * of such values (e.g. a tuple encoded as a hash).
 */
template ListMembershipModule(
    // Maximum number of valid values
    MAX_LIST_ENTRIES
) {
    signal input valueHash; // Value hash to be checked.

    signal input list[MAX_LIST_ENTRIES]; // List of admissible value hashes. Assumed to have repetitions if the actual list length is smaller.

    signal output isMember;

    signal partialProduct[MAX_LIST_ENTRIES];

    for(var i = 0; i < MAX_LIST_ENTRIES; i++) {
	if(i == 0) {
	    partialProduct[i] <== valueHash - list[i];
	} else {
	    partialProduct[i] <== partialProduct[i-1] * (valueHash - list[i]);
	}
    }

    isMember <== IsZero()(partialProduct[MAX_LIST_ENTRIES - 1]);
}
