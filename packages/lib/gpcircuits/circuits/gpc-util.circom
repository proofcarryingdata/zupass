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

/**
 * Array appender. Useful for feeding a combination of arrays
 * into `InputSelector` or `MaybeInputSelector`.
 */
template Append (M, N) {
    signal input in1[M];
    signal input in2[N];
    signal output out[M + N];

    for (var i = 0; i < M; i++) {
        out[i] <== in1[i];
    }

    for (var i = 0; i < N; i++) {
        out[M + i] <== in2[i];
    }
}

/**
 * Input selector where `selectedIndex` is interpreted as an index iff it is
 * not -1. If `selectedIndex` is -1, then this template outputs 0.
 */
template MaybeInputSelector (N) {
    signal input inputs[N];
    signal input selectedIndex;

    // `delta` is the vector whose ith component is $delta_i^ind$ for i in [0,..., N-1].
    signal (delta[N], success) <== Decoder(N)(selectedIndex);
    
    signal output out <== EscalarProduct(N)(inputs, delta);

    // `selectedIndex` must have been in [0,...,N-1] or -1.
    (1 - success)*(selectedIndex + 1) === 0;
}

/**
 * Left-rotates elements of a given array by I positions.
 */
template ArrayRotl(I,N) {
    signal input in[N];
    signal output out[N];

    for(var i = 0; i < N; i++) {
        out[i] <== in[(i + I)%N];
    }
}

/**
 * Takes the first I elements of a given array and returns the array
 * containing those elements.
 */
template Take(I,N) {
    signal input in[N];
    signal output out[I];

    for (var i = 0; i < I; i++) {
        out[i] <== in[i];
    }
}

/**
 * Adds a field element to all elements of a given array.
 */
template ArrayAddScalar(N) {
    signal input element;
    signal input in[N];
    signal output out[N];

    for(var i = 0; i < N; i++) {
        out[i] <== in[i] + element;
    }
}
