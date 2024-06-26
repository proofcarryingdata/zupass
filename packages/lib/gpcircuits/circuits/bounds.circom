pragma circom 2.1.8;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";
include "gpc-util.circom";

/**
 * Module carrying out bounds checks on 64-bit unsigned integer values.
 * 
 * No overall enable flag, but can be disabled by checking whether 0
 * lies in the interval [0, 1 << 64 - 1].
 * 
 * The values and bounds are assumed to be 64-bit unsigned integers
 * but are not constrained here, cf. the comments regarding {@link
 * InInterval}.
 */
template BoundsCheckModule(
    // Number of values to be checked.
    MAX_BOUNDS_CHECKS
) {
    // Values to be checked.
    signal input comparisonValues[MAX_BOUNDS_CHECKS];

    // Bounds that each corresponding value should lie within.
    signal input bounds[MAX_BOUNDS_CHECKS][2];

    // Indicator of whether the bounds check was successful.
    signal boundsCheck[MAX_BOUNDS_CHECKS];

    // Loop through and check each value against its expected bounds.
    for(var i = 0; i < MAX_BOUNDS_CHECKS; i++) {
        boundsCheck[i] <== InInterval(64)(comparisonValues[i], bounds[i]);
        boundsCheck[i] === 1;
    }
}

/**
 * Module checking whether a single `NUM_BITS`-bit unsigned integer
 * lies in a closed interval with `NUM_BITS`-bit unsigned integer
 * bounds. Outputs a boolean.
 *
 * Signals are assumed to be in the interval [0, 1 << NUM_BITS[, but
 * they are not constrained here.  It suffices to constrain the
 * bounds, which will be public signals.
 */
template InInterval (
    // Number of bits required to represent the inputs. Must be less
    // than 253.
    NUM_BITS
) {
    // Number to check.
    signal input in;

    // Inclusive lower and upper bounds for `in` (in that
    // order). Assumed to lie in the interval [0, 1 << NUM_BITS[. This
    // should be checked elsewhere.
    signal input bounds[2];

    // Indicator of whether bounds[0] <= in.
    signal isGEqLowerBound <== LessEqThan(NUM_BITS)([bounds[0], in]);
    // Indicator of whether in <= bounds[1].
    signal isLEqUpperBound <== LessEqThan(NUM_BITS)([in, bounds[1]]);

    // Indicator of whether bounds[0] <= in <= bounds[1].
    signal output out <== isGEqLowerBound * isLEqUpperBound;
}

