pragma circom 2.1.8;

include "circomlib/circuits/comparators.circom";

/**
 * Module for checking whether a value is a member of a given list.
 * A value may be either a POD entry value hash or a combination
 * of such values (e.g. a tuple encoded as a hash).
 */
template ListMembershipModule(
    // Maximum number of valid values
    MAX_LIST_ELEMENTS
) {
    // Value to be checked.
    signal input comparisonValue; 

    // List of admissible value hashes. Assumed to have repetitions if the actual list length is smaller.
    signal input listValidValues[MAX_LIST_ELEMENTS]; 

    // Boolean indicating whether `comparisonValue` lies in `listValidValues`.
    signal output isMember;

    signal partialProduct[MAX_LIST_ELEMENTS];

    for (var i = 0; i < MAX_LIST_ELEMENTS; i++) {
	      if (i == 0) {
	          partialProduct[i] <== comparisonValue - listValidValues[i];
	      } else {
	          partialProduct[i] <== partialProduct[i-1] * (comparisonValue - listValidValues[i]);
	      }
    }

    if (MAX_LIST_ELEMENTS == 0) {
	      isMember <== 0;
    } else {
	      isMember <== IsZero()(partialProduct[MAX_LIST_ELEMENTS - 1]);
    }
}
