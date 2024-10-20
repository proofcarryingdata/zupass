pragma circom 2.1.8;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";
include "gpc-util.circom";

/**
 * Module checking whether a single `NUM_BITS`-bit unsigned integer
 * lies in a closed interval with `NUM_BITS`-bit unsigned integer
 * bounds. Outputs a boolean.
 *
 * No overall enable flag, but can be disabled by checking whether 0
 * lies in the interval [0, 0].
 *
 * Signals are assumed to be in the interval [0, (1 << NUM_BITS) - 1],
 * but they are not constrained here.  For correct results, it
 * suffices to constrain the bounds either in another circuit or
 * externally if they are public signals. The template will then
 * return 1 if and only if the private input lies in the proper range.
 */
template BoundsCheckModule (
    // Number of bits required to represent the inputs. Must be less
    // than 252, cf. {@link LessEqThan}.
    NUM_BITS
) {
    // Number to check.
    signal input comparisonValue;

    // Inclusive lower and upper bounds for `in` (in that
    // order). Assumed to lie in the interval [0, (1 << NUM_BITS) - 1].
    // This should be checked elsewhere.
    signal input minValue;
    signal input maxValue;

    // Indicator of whether minValue <= comparisonValue.
    signal isGEqLowerBound <== LessEqThan(NUM_BITS)([minValue, comparisonValue]);
    // Indicator of whether comparisonValue <= maxValue.
    signal isLEqUpperBound <== LessEqThan(NUM_BITS)([comparisonValue, maxValue]);

    // Indicator of whether minValue <= comparisonValue <= maxValue.
    signal output out <== isGEqLowerBound * isLEqUpperBound;
}
