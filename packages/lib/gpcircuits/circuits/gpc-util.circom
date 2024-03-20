pragma circom 2.1.8;

include "circomlib/circuits/multiplexer.circom";

/**
 * Helper template for revealed fields. out will be set to value or to -1 if
 * not revealed.
 * 
 * @param value the value to potentially reveal
 * @param shouldRevealValue boolean indicating whether to reveal.
 *   It is assumed (but not constrained) to be 0 or 1.
 *   It should be constrained externally.
 */
template ValueOrNegativeOne() {
    signal input value;
    signal input shouldRevealValue; // assumed to be 0 or 1

    signal output out;

    out <== value * shouldRevealValue + (-1) * (1 - shouldRevealValue);
}

/**
 * Wrapper around circomlib's Multiplexer to make it friendlier for anonymous
 * use with width 1 inputs in an array.  Example:
 * 
 *     signal input inputs[10];
 *     signal input index;
 *     signal out <== InputSelector(10)(inputs, index)
 * 
 * As a side-effect, selectedIndex is constrained to be in the range
 * [0, N_INPUTS), so this circuit is safe from index-out-of-bounds risks.
 * 
 * @param inputs N_INPUTS individual input signals
 * @param selectedIndex index (0-based) of the input signal to assign to output.
 *   Constrained to be in the range [0, N_INPUTS] by this circuit.
 * @param out output signal
 */
template InputSelector (N_INPUTS) {
    signal input inputs[N_INPUTS];
    signal input selectedIndex;

    signal muxIn[N_INPUTS][1];
    for (var i = 0; i < N_INPUTS; i++) {
        muxIn[i][0] <== inputs[i];
    }
    signal muxOut[1] <== Multiplexer(1, N_INPUTS)(muxIn, selectedIndex);
    signal output out <== muxOut[0];
}
