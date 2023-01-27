// @ts-ignore
import * as ed from "@noble/ed25519";
// @ts-ignore
import * as util from "../../ed25519-circom/test/utils";

util.a;

/**
msg is the data for the signature

x R8 is the first 256 bits of the signature (LSB to MSB)

S is the first 255 bits of the last 256 bits of the signature (LSB to MSB)

A is the public key in binary (LSB to MSB)

x PointA is the point representing the public key on the elliptic curve (encoded in base 2^85 for brevity)

PointR is the point representing the R8 value on the elliptic curve (encoded in base 2^85)
 */

async function test() {
  const privateKey = ed.utils.randomPrivateKey();
  const message = Uint8Array.from([0xab, 0xbc, 0xcd, 0xde]);
  const publicKey: Uint8Array = await ed.getPublicKey(privateKey);
  const signature: Uint8Array = await ed.sign(message, privateKey);
  const isValid = await ed.verify(signature, message, publicKey);

  const R8 = signature.subarray(0, 256 / 8);
  const S = signature.subarray(signature.length - 32, signature.length);

  console.log(S);

  const publicKeyHex = ed.utils.bytesToHex(publicKey);
  const pointA = ed.ExtendedPoint.fromAffine(ed.Point.fromHex(publicKeyHex));

  const R8Hex = ed.utils.bytesToHex(R8);
  const pointR = ed.ExtendedPoint.fromAffine(ed.Point.fromHex(R8Hex));

  console.log(message);
  console.log(R8);
  console.log(S);
  console.log(publicKey);
  console.log(pointA);
  console.log(pointR);
}

test();
