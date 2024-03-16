pragma circom 2.1.8;

/**
 * Module for global constraints of a GPC proof, independent of any specific
 * object or entry.
 * 
 * Currently this only includes a watermark, which can be included to avoid reuse.
 */
template GlobalModule () {
    // Watermark is an arbitrary value used to uniquely identify a proof.
    signal input watermark;

    // Non-linear constraint on watermark ensures it won't be removed by the compiler.
    signal watermarkSquared <== watermark * watermark;
}
