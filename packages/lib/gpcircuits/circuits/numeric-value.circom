pragma circom 2.1.8;

include "circomlib/circuits/poseidon.circom";
include "bounds.circom";

/**
 * Module constraining a single entry value of POD object. It proves
 * that the numeric value corresponds to the value hash and that
 * numeric properties such as upper and lower bounds hold.
 *
 * This module has an explicit enable flag. If it is disabled, the bounds
 * check parameters should take on their default values, viz. 0 and 0.
 */
template NumericValueModule() {
    // Boolean flag for the value check. Booleanness will be deduced
    // from the entry index passed to the ProtoPODGPC circuit and thus
    // checked externally.
    signal input isEnabled;
    
    // Value to check.
    signal input numericValue;

    // Hash extracted from entry proof.
    signal input extractedValueHash;

    // The value's hash should coincide with the hash extracted from
    // the entry proof if this module is enabled.
    signal calculatedValueHash <== Poseidon(1)([numericValue]);
    (calculatedValueHash - extractedValueHash) * isEnabled === 0;

    // Bounds check parameters.
    signal input minValue;
    signal input maxValue;

    // Absolute value of minimum value of a 64-bit signed integer.
    // This will be added to all values fed into the bounds check
    // module to convert them to 64-bit unsigned integers while
    // preserving order.
    var ABS_POD_INT_MIN = 1 << 63;
    
    // Check that minValue <= numericValue <= maxValue.
    signal boundsCheck <== BoundsCheckModule(64)(
        numericValue + ABS_POD_INT_MIN,
        minValue + ABS_POD_INT_MIN,
        maxValue + ABS_POD_INT_MIN
                                                 );
    boundsCheck === 1;
}
