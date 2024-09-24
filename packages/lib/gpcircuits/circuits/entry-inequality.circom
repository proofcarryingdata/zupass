pragma circom 2.1.8;

include "circomlib/circuits/comparators.circom";

/**
 * Module outputting a boolean indicating whether an entry value to be
 * (not) less than another entry value. The output is only valid if
 * the values are constrained to be signed `NUM_BITS`-bit integers,
 * which is accomplished by the numeric value module with which this
 * module's values are shared. 
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

    var ABS_POD_INT_MIN = 1 << (NUM_BITS - 1);
    
    // Boolean indicating whether value < otherValue. Values are
    // shifted to allow for signed POD int values, cf. {@link
    // NumericValueModule}.
    signal output isLessThan <== LessThan(NUM_BITS)(
        [
            value + ABS_POD_INT_MIN,
            otherValue + ABS_POD_INT_MIN
        ]
    );
}
