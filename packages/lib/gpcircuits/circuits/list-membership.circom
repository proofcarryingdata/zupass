pragma circom 2.1.8;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/gates.circom";

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

    // List of admissible value hashes. Assumed to have repetitions if
    // the actual list length is smaller.
    signal input validValues[MAX_LIST_ELEMENTS]; 

    // Boolean indicating whether `comparisonValue` lies in
    // `validValues`.
    signal output isMember;

    // Shift the values by `comparisonValue`.
    signal shiftedValues[MAX_LIST_ELEMENTS];
    for (var i = 0; i < MAX_LIST_ELEMENTS; i++) {
        shiftedValues[i] <== validValues[i] - comparisonValue;
    }

    if (MAX_LIST_ELEMENTS == 0) {
        isMember <== 0;
    } else {
        // `comparisonValue` lies in `validValues` iff
        // `shiftedValues[i]` is 0 for some i, which is equivalent to
        // the product of all elements of `shiftedValues` being 0.
        isMember <== IsZero()(
            MultiAND(MAX_LIST_ELEMENTS)(
                shiftedValues
            )
        );
    }
}
