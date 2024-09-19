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

    // Number of pairs of distinct indices in [0, NUM_LIST_ELEMENTS[
    // (modulo order).
    var NUM_PAIRS = NUM_LIST_ELEMENTS*(NUM_LIST_ELEMENTS - 1)\2;

    // Matrix of differences of the form M[i,j] = values[i] -
    // values[j] for i < j arranged in column-major order.
    signal valueDifferences[NUM_PAIRS];
    for (var i = 0; i < NUM_LIST_ELEMENTS; i++) {
        for (var j = i + 1; j < NUM_LIST_ELEMENTS; j++) {
            var k = j + NUM_LIST_ELEMENTS*i - (i + 1)*(i + 2)\2;
            valueDifferences[k] <== values[i] - values[j];
        }
    }

    if (NUM_PAIRS == 0) {
        valuesAreUnique <== 1;
    } else {
        // All values are unique iff all elements of
        // `valueDifferences` are nonzero, which is the case iff the
        // product of all elements of `valueDifferences` is nonzero.
        valuesAreUnique <== NOT()(
            IsZero()(
                MultiAND(NUM_PAIRS)(
                    valueDifferences
                )
            )
        );
    }
}
