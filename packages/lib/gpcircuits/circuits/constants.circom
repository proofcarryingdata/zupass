pragma circom 2.1.8;

// Absolute value of minimum value of a 64-bit signed integer.  This
// will be added to all values fed into the bounds check and entry
// inequality modules to convert them to 64-bit unsigned integers
// while preserving order.
function ABS_POD_INT_MIN() {
    return 1 << (POD_INT_BITS() - 1);
}

// Maximum number of bits in a POD int value.
function POD_INT_BITS() {
    return 64;
}
