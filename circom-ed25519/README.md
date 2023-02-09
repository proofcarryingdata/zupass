# Circom Ed25519

[![Twitter URL](https://img.shields.io/twitter/url/https/twitter.com/labs_electron.svg?style=social&label=Follow%20%40labs_electron)](https://twitter.com/labs_electron)
![Build Status](https://github.com/Electron-Labs/ed25519-circom/actions/workflows/actions.yml/badge.svg)
[![License](https://img.shields.io/badge/license-UNLICENSED-red)](LICENSE)
<!--- 
[![CI status](https://github.com/Electron-Labs/circom-ed25519/actions/workflows/actions.yml/badge.svg?branch=master")](CI) 
-->

Curve operations and signature verification for Ed25519 digital signature scheme in circom 

**WARNING:** This is a research project. It has not been audited and may contain bugs and security flaws. This implementation is NOT ready for production use.

https://docs.electronlabs.org/circom-ed25519/overview

The circuits follow the reference implementation from [IETF RFC8032](https://datatracker.ietf.org/doc/html/rfc8032#section-6)


## Installing dependencies
- `npm install -g snarkjs`
- `npm install`
- Clone and install circom - [circom docs](https://docs.circom.io/getting-started/installation/)
- If you want to build the `verify` circuit, you'll need to download a Powers of Tau file with `2^22` constraints and copy it into the `circuits` subdirectory of the project, with the name `pot22_final.ptau`. You can download Powers of Tau files from the Hermez trusted setup from [this repository](https://github.com/iden3/snarkjs#7-prepare-phase-2)

## Testing the build
- You can run the entire testing suite (sans scalar multiplication and signature verification) using `npm run test`
- You can test specific long running tests using `npm run test-scalarmul` or `npm run test-verify`

## Benchmarks

All benchmarks were run on a 16-core 3.0GHz, 32G RAM machine (AWS c5a.4xlarge instance).

||verify.circom|
|---|---|
|Constraints                          |2564061 |
|Circuit compilation                  |72s     |
|Witness generation                   |6s      |
|Trusted setup phase 2 key generation |841s    |
|Trusted setup phase 2 contribution   |1040s   |
|Proving key size                     |1.6G    |
|Proving time (rapidsnark)            |6s      |
|Proof verification time              |1s      |

## Inputs
`msg` is the data for the signature

`R8` is the first 256 bits of the signature (LSB to MSB)

`S` is the first 255 bits of the last 256 bits of the signature (LSB to MSB)

`A` is the public key in binary (LSB to MSB)

`PointA` is the point representing the public key on the elliptic curve (encoded in base 2^85 for brevity)

`PointR` is the point representing the R8 value on the elliptic curve (encoded in base 2^85) 

The [algorithm](https://datatracker.ietf.org/doc/html/rfc8032#section-6) we follow only takes in `A` and `R8` in binary form, and is decompressed to get `PointA` and `PointR` respectively. However, decompression is an expensive algorithm to perform in a circuit. On the other hand, compression is cheap and easy to implement. So, we use a nifty little trick to push the onus of providing both on the `prover` and perform equality checks after compressing the points within the circuit. [Ref](https://github.com/Electron-Labs/ed25519-circom/blob/532f638b4d6ae4684a1f0907df6c92676f0ae8df/circuits/verify.circom#L57)

You can find all helper functions to change encodings from well-known formats to circuit friendly formats [here](https://github.com/Electron-Labs/ed25519-circom/blob/master/test/utils.js)

## Important Circuits

### Modulus upto 2*(2^255-19) -> Mod2p
```python
  # for input in
  def mod2p(in):
    diff = (2**255-19) - in
    return in if diff < 0 else diff
```
##### Available versions
```js
  // ModulusAgainst2P
  // Elements are represented in binary
  (in: [256]) => (out: [255])

  // ModulusAgainst2Q
  // Elements are represented in binary
  (in: [254]) => (out: [253])

  // ModulusAgainst2PChunked51
  // Elements are represented in base 2^85
  (in: [4]) => (out: [3])
```

### Modulus with 2^255-19 -> Modulus25519
```python
  # for input `in` of unknown size, we explot that prime p
  # is close to a power of 2
  # input in broken down into an expression in = b + (p + 19)*c
  # where b is the least significant 255 bits of input and,
  # c is the rest of the bits. Then,
  # in mod p = (b + (p + 19)*c) mod p
  #          = (b mod p + 19*c mod p) mod p
  def mod25519(in):
    p = 2**255-19
    if in < p:
      return in
    b = in & ((1 << 255) - 1)
    c = in >> 255
    bmodp = mod2p(b)
    c19modp = mod25519(19*c)
    return mod2p(bmodp + c19modp)
```
##### Available versions
```js
  // ModulusWith25519
  // Elements are represented in binary
  (a: [n]) => (out: [255])

  // ModulusWith252c
  // Elements are represented in binary
  (a: [n]) => (out: [253])

  // ModulusWith25519Chunked51
  // Elements are represented in base 2^85
  (a: [n]) => (out: [3])
```

### Point Addition -> PointAdd
```python
  # Add two points on Curve25519
  def point_add(P, Q):
    p = 2**255-19
    A, B = (P[1]-P[0]) * (Q[1]-Q[0]) % p, (P[1]+P[0]) * (Q[1]+Q[0]) % p
    C, D = 2 * P[3] * Q[3] * d % p, 2 * P[2] * Q[2] % p
    E, F, G, H = B-A, D-C, D+C, B+A
    return (E*F, G*H, F*G, E*H)
```
##### Available versions
```js
  // PointAdd
  // Elements are represented in base 2^85
  (P: [4][3], Q: [4][3]) => (R: [4][3]) 
```

### Scalar Multiplication -> ScalarMul
```python
  # Multiply a point by scalar on Curve25519
  def point_mul(s, P):
    p = 2**255-19
    Q = (0, 1, 1, 0)  # Neutral element
    while s > 0:
      if s & 1:
        Q = point_add(Q, P)
      P = point_add(P, P)
      s >>= 1
    return Q
```
##### Available versions
```js
  // ScalarMul
  // scalar value is represented in binary
  // Point elements are represented in base 2^85
  (s: [255], P: [4][3]) => (sP: [4][3]) 
```

### Ed25519 Signature verification -> Verify
```python
  def verify(msg, public, Rs, s, A, R):
    # Check that the compressed representation of a point 
    # equates to the paramaters extracted from signature
    assert(Rs == point_compress(R))
    assert(public == point_compress(A))
    h = sha512_modq(Rs + public + msg)
    sB = point_mul(s, G)
    hA = point_mul(h, A)
    return point_equal(sB, point_add(R, hA))
```
##### Available versions
```js
  // out signal value is 0 or 1 depending on whether the signature validation failed or passed
  (msg: [n], A: [256], R8: [256], S: [255], PointA: [4][3], PointR: [4][3]) => (out);
```
