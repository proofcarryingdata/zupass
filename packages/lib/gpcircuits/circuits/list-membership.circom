pragma circom 2.1.8;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/gates.circom";
include "gpc-util.circom";

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

    isMember <== IsZero()(
        UnnormalisedListNonMembership(MAX_LIST_ELEMENTS, MAX_LIST_ELEMENTS)(
            comparisonValue,
            validValues
        )
    );
}

/**
 * Helper template returning a non-zero field element if the given
 * value is not an element of the given list restricted to the first
 * `NUM_LIST_ELEMENTS` elements and zero otherwise. This is done by
 * subtracting the value from all elements of the list and folding it
 * by means of field multiplication.
 */
template UnnormalisedListNonMembership(NUM_LIST_ELEMENTS, MAX_LIST_ELEMENTS) {
     // Value to be checked.
    signal input comparisonValue; 

    // List of admissible values.
    signal input validValues[MAX_LIST_ELEMENTS];

    // Indicator of whether the value is not an element of the list of
    // admissible values, viz. a non-zero field element iff the value
    // is a non-member.
    signal output isNotMember;

    if (NUM_LIST_ELEMENTS == 0) {
        isNotMember <== 1;
    } else {
        isNotMember <== MultiAND(NUM_LIST_ELEMENTS)(
            Add(NUM_LIST_ELEMENTS)(
                -comparisonValue,
                Take(NUM_LIST_ELEMENTS, MAX_LIST_ELEMENTS)(
                    validValues
                )
            )
        );
    }
}
