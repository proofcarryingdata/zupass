// @ts-nocheck
import * as ed from "@noble/ed25519";
import * as util from "./util";

/**
msg is the data for the signature

x R8 is the first 256 bits of the signature (LSB to MSB)

S is the first 255 bits of the last 256 bits of the signature (LSB to MSB)

A is the public key in binary (LSB to MSB)

x PointA is the point representing the public key on the elliptic curve (encoded in base 2^85 for brevity)

PointR is the point representing the R8 value on the elliptic curve (encoded in base 2^85)
 */

function chunkifyPoint(point: ed.ExtendedPoint) {
  const chunks = [];
  const pointArray = [point.x, point.y, point.z, point.t];
  for (let i = 0; i < 4; i++) {
    chunks.push(util.chunkBigInt(pointArray[i], BigInt(2 ** 85)));
  }
  for (let i = 0; i < chunks.length; i++) {
    util.pad(chunks[i], 3);
  }
  return chunks;
}

export async function getInputs() {
  const privateKey = ed.utils.randomPrivateKey();
  const message = Uint8Array.from([0xab]);
  const publicKey: Uint8Array = await ed.getPublicKey(privateKey);
  const signature: Uint8Array = await ed.sign(message, privateKey);
  const isValid = await ed.verify(signature, message, publicKey);
  const publicKeyLEB = util.buffer2bits(Buffer.from(publicKey)).reverse();

  const R8 = signature.subarray(0, 256 / 8);
  const S = signature.subarray(signature.length - 32, signature.length);

  const publicKeyHex = ed.utils.bytesToHex(publicKey);
  const pointA = ed.ExtendedPoint.fromAffine(ed.Point.fromHex(publicKeyHex));
  const pointAbase85 = chunkifyPoint(pointA);

  const R8Hex = ed.utils.bytesToHex(R8);
  const pointR = ed.ExtendedPoint.fromAffine(ed.Point.fromHex(R8Hex));
  const pointRbase85 = chunkifyPoint(pointR);

  const R8LEB = util.buffer2bits(Buffer.from(R8)).reverse();
  const SBuf = util.buffer2bits(Buffer.from(S));
  SBuf.pop();
  const SLEB = SBuf.reverse();
  const messageLEB = util.buffer2bits(Buffer.from(message)).reverse();

  console.log(messageLEB);
  console.log(R8LEB);
  console.log(SLEB);
  console.log(publicKey);
  console.log(pointAbase85);
  console.log(pointRbase85);

  return {
    msg: messageLEB,
    A: publicKeyLEB,
    R8: R8LEB,
    S: SLEB,
    PointA: pointAbase85,
    PointR: pointRbase85,
  };
}

getInputs();
