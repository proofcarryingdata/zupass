pragma circom 2.1.8;

include "circomlib/circuits/gates.circom";
include "list-membership.circom";

/**
 * Module for checking whether the values forming a list are all
 * unique.
 */
template UniquenessModule(
    // Number of list elements
    NUM_LIST_ELEMENTS
) {
    // List to be checked
    signal input values[NUM_LIST_ELEMENTS];

    // Boolean indicating whether the elements of `values` are all
    // unique.
    signal output valuesAreUnique;

    // Array of field elements indicating whether the corresponding
    // element of `values` is unique, i.e. isUnique[i] = 0 iff
    // values[i] is not unique.
    signal isUnique[NUM_LIST_ELEMENTS];

    // Loop through and check whether the ith element of `values` is
    // not an element of `values` with that element deleted.
    for(var i = 0; i < NUM_LIST_ELEMENTS; i++) {
        var j = i+1;
        isUnique[i] <==
            UnnormalisedListNonMembership(NUM_LIST_ELEMENTS - j, NUM_LIST_ELEMENTS)(
                values[i],
                Rotl(j, NUM_LIST_ELEMENTS)(values)
            );
    }

    // All values are unique iff all elements of `isUnique` are non-zero.
    valuesAreUnique <== NOT()(
        IsZero()(
            MultiAND(NUM_LIST_ELEMENTS)(
                isUnique
            )
        )
    );
}
