"use strict";
exports.__esModule = true;
exports.packBytesIntoNBytes = exports.packedNBytesToString = exports.fromHex = exports.toHex = exports.toCircomBigIntBytes = exports.bytesToBigInt = exports.bufferToString = exports.bufferToUint8Array = exports.stringToBytes = exports.bytesToString = void 0;
var constants_1 = require("./constants");
function bytesToString(bytes) {
    return new TextDecoder().decode(bytes);
}
exports.bytesToString = bytesToString;
function stringToBytes(str) {
    var encodedText = new TextEncoder().encode(str);
    var toReturn = Uint8Array.from(str, function (x) { return x.charCodeAt(0); });
    var buf = Buffer.from(str, "utf8");
    return toReturn;
    // TODO: Check encoding mismatch if the proof doesnt work
    // Note that our custom encoding function maps (239, 191, 189) -> (253)
    // Note that our custom encoding function maps (207, 181) -> (245)
    // throw Error(
    //   "TextEncoder does not match string2bytes function" +
    //     "\n" +
    //     str +
    //     "\n" +
    //     buf +
    //     "\n" +
    //     Uint8Array.from(buf) +
    //     "\n" +
    //     JSON.stringify(encodedText) +
    //     "\n" +
    //     JSON.stringify(toReturn)
    // );
}
exports.stringToBytes = stringToBytes;
function bufferToUint8Array(buf) {
    var ab = new ArrayBuffer(buf.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buf.length; ++i) {
        view[i] = buf[i];
    }
    return Uint8Array.from(view);
}
exports.bufferToUint8Array = bufferToUint8Array;
function bufferToString(buf) {
    var intermediate = bufferToUint8Array(buf);
    return bytesToString(intermediate);
}
exports.bufferToString = bufferToString;
function bytesToBigInt(bytes) {
    var res = 0n;
    for (var i = 0; i < bytes.length; ++i) {
        res = (res << 8n) + BigInt(bytes[i]);
    }
    return res;
}
exports.bytesToBigInt = bytesToBigInt;
function toCircomBigIntBytes(num) {
    var res = [];
    var bigintNum = typeof num == "bigint" ? num : num.valueOf();
    var msk = (1n << BigInt(constants_1.CIRCOM_BIGINT_N)) - 1n;
    for (var i = 0; i < constants_1.CIRCOM_BIGINT_K; ++i) {
        res.push(((bigintNum >> BigInt(i * constants_1.CIRCOM_BIGINT_N)) & msk).toString());
    }
    return res;
}
exports.toCircomBigIntBytes = toCircomBigIntBytes;
// https://stackoverflow.com/a/69585881
var HEX_STRINGS = "0123456789abcdef";
var MAP_HEX = {
    0: 0,
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    8: 8,
    9: 9,
    a: 10,
    b: 11,
    c: 12,
    d: 13,
    e: 14,
    f: 15,
    A: 10,
    B: 11,
    C: 12,
    D: 13,
    E: 14,
    F: 15
};
// Fast Uint8Array to hex
function toHex(bytes) {
    return Array.from(bytes || [])
        .map(function (b) { return HEX_STRINGS[b >> 4] + HEX_STRINGS[b & 15]; })
        .join("");
}
exports.toHex = toHex;
// Mimics Buffer.from(x, 'hex') logic
// Stops on first non-hex string and returns
// https://github.com/nodejs/node/blob/v14.18.1/src/string_bytes.cc#L246-L261
function fromHex(hexString) {
    var hexStringTrimmed = hexString;
    if (hexString[0] === "0" && hexString[1] === "x") {
        hexStringTrimmed = hexString.slice(2);
    }
    var bytes = new Uint8Array(Math.floor((hexStringTrimmed || "").length / 2));
    var i;
    for (i = 0; i < bytes.length; i++) {
        var a = MAP_HEX[hexStringTrimmed[i * 2]];
        var b = MAP_HEX[hexStringTrimmed[i * 2 + 1]];
        if (a === undefined || b === undefined) {
            break;
        }
        bytes[i] = (a << 4) | b;
    }
    return i === bytes.length ? bytes : bytes.slice(0, i);
}
exports.fromHex = fromHex;
function packedNBytesToString(packedBytes, n) {
    if (n === void 0) { n = 7; }
    var chars = [];
    for (var i = 0; i < packedBytes.length; i++) {
        for (var k = 0n; k < n; k++) {
            chars.push(Number((packedBytes[i] >> (k * 8n)) % 256n));
        }
    }
    return bytesToString(Uint8Array.from(chars));
}
exports.packedNBytesToString = packedNBytesToString;
function packBytesIntoNBytes(messagePaddedRaw, n) {
    if (n === void 0) { n = 7; }
    var messagePadded = typeof messagePaddedRaw === "string" ? stringToBytes(messagePaddedRaw) : messagePaddedRaw;
    var output = [];
    for (var i = 0; i < messagePadded.length; i++) {
        if (i % n === 0) {
            output.push(0n);
        }
        var j = (i / n) | 0;
        console.assert(j === output.length - 1, "Not editing the index of the last element -- packing loop invariants bug!");
        output[j] += BigInt(messagePadded[i]) << BigInt((i % n) * 8);
    }
    return output;
}
exports.packBytesIntoNBytes = packBytesIntoNBytes;
// Usage: let in_padded_n_bytes = packBytesIntoNBytes(messagePadded, 7).map((x) => x.toString()); // Packed into 7 byte signals
// console.log(packedNBytesToString([30680772461461504n, 129074054722665n, 30794022159122432n, 30803244232763745n]));
