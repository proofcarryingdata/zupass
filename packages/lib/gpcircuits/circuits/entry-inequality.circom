pragma circom 2.1.8;

include "circomlib/circuits/comparators.circom";
include "constants.circom";

/**
 * Module constraining an entry value to be (not) less than another
 * entry value. This module should be combined with the numeric value
 * module with which its values are shared. Moreover, the numeric
 * value module will ensure the validity of these values as well as
 * the inequality check circuit.
 *
 * The module has no explicit enable flag. To disable it, the input
 * signals should be equal to each other, whence the output should be
 * 0.
 */
template EntryInequalityModule(
    // Number of bits required to represent the inputs. Must be less
    // than 252, cf. {@link LessThan}.
    NUM_BITS
) {
    // The values to use in the inequality value < otherValue.
    signal input value;
    signal input otherValue;

    // Boolean indicating whether value < otherValue. Values are
    // shifted to allow for signed POD int values, cf. {@link
    // NumericValueModule}.
    signal output out <== LessThan(NUM_BITS)(
        [
            value + ABS_POD_INT_MIN(),
            otherValue + ABS_POD_INT_MIN()
        ]
    );
}
