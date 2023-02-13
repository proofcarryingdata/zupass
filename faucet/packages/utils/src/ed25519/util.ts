//@ts-nocheck
// copied from /Users/ivanchub/Projects/zk-faucet/packages/ed25519-circom/test/utils.js
const bigintModArith = require("bigint-mod-arith");
function buffer2bits(buff) {
  const res = [];
  for (let i = 0; i < buff.length; i++) {
    for (let j = 0; j < 8; j++) {
      if ((buff[i] >> j) & 1) {
        res.push(1n);
      } else {
        res.push(0n);
      }
    }
  }
  return res;
}

function convertToEvenLength(hexInput) {
  if (hexInput.length % 2 == 1) {
    return "0" + hexInput;
  }
  return hexInput;
}

function normalize(input) {
  if (IsPowerOfTwo(input.length)) {
    input.push(0n);
  }
  return input;
}

function IsPowerOfTwo(x) {
  return (x & (x - 1)) == 0;
}

function bigIntToLEBuffer(x) {
  return Buffer.from(convertToEvenLength(x.toString(16)), "hex").reverse();
}

function pad(x, n) {
  var total = n - x.length;
  for (var i = 0; i < total; i++) {
    x.push(0n);
  }
  return x;
}
// This function will give the right modulud as expected
function modulus(num, p) {
  return ((num % p) + p) % p;
}

function bitsToBigInt(arr) {
  res = BigInt(0);
  for (var i = 0; i < arr.length; i++) {
    res += BigInt(2) ** BigInt(i) * BigInt(arr[i]);
  }
  return res;
}

// This function will convert a bigInt into the chucks of Integers
function chunkBigInt(n, mod = BigInt(2 ** 51)) {
  if (!n) return [0];
  let arr = [];
  while (n) {
    arr.push(BigInt(modulus(n, mod)));
    n /= mod;
  }
  return arr;
}

let p = BigInt(2 ** 255) - BigInt(19);
let d =
  37095705934669439343138083508754565189542113879843219016388785533085940283555n;
// This function will perform point addition on elliptic curve 25519 to check point addition circom
function point_add(P, Q) {
  let A = modulus((P[1] - P[0]) * (Q[1] - Q[0]), p);
  let B = modulus((P[1] + P[0]) * (Q[1] + Q[0]), p);
  let C = modulus(BigInt(2) * P[3] * Q[3] * d, p);
  let D = modulus(BigInt(2) * P[2] * Q[2], p);

  let E = B - A;
  let F = D - C;
  let G = D + C;
  let H = B + A;

  return [E * F, G * H, F * G, E * H];
}
//This funciton will give the point multiplcation on EC 25519
function point_mul(s, P) {
  let Q = [0n, 1n, 1n, 0n];
  while (s > 0) {
    if (s & 1n) {
      Q = point_add(Q, P);
    }
    P = point_add(P, P);
    s >>= 1n;
  }
  return Q;
}

function dechunk(x, mod = BigInt(2 ** 51)) {
  sum = 0n;
  for (let i = 0; i < x.length; i++) {
    sum += mod ** BigInt(i) * x[i];
  }
  return sum;
}
function point_equal(P, Q) {
  //  x1 / z1 == x2 / z2  <==>  x1 * z2 == x2 * z1
  if (modulus(P[0] * Q[2] - Q[0] * P[2], p) != 0n) {
    return false;
  }
  if (modulus(P[1] * Q[2] - Q[1] * P[2], p) != 0n) {
    return false;
  }
  return true;
}
function point_compress(P) {
  const zinv = bigintModArith.modInv(P[2], p);
  let x = modulus(P[0] * zinv, p);
  let y = modulus(P[1] * zinv, p);
  const inter = y | ((x & 1n) << 255n);
  return buffer2bits(bigIntToLEBuffer(inter));
}
module.exports = {
  buffer2bits,
  convertToEvenLength,
  normalize,
  bigIntToLEBuffer,
  pad,
  chunkBigInt,
  bitsToBigInt,
  point_add,
  modulus,
  point_mul,
  dechunk,
  point_equal,
  point_compress,
};
