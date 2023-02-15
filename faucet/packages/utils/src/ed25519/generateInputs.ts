// @ts-nocheck
import * as ed from "@noble/ed25519";
import * as util from "./util";

/**
 * msg is the data for the signature
 * R8 is the first 256 bits of the signature (LSB to MSB)
 * S is the first 255 bits of the last 256 bits of the signature (LSB to MSB)
 * A is the public key in binary (LSB to MSB)
 * PointA is the point representing the public key on the elliptic curve (encoded in base 2^85 for brevity)
 * PointR is the point representing the R8 value on the elliptic curve (encoded in base 2^85)
 */
export async function getEd25519CircuitInputs() {
  const message = Uint8Array.from([0xff, 0xfa]);
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey: Uint8Array = await ed.getPublicKey(privateKey);
  const signature: Uint8Array = await ed.sign(message, privateKey);

  const msg = util.buffer2bits(Buffer.from(message));
  const A = util.buffer2bits(Buffer.from(publicKey));

  const r8Bytes = signature.subarray(0, 256 / 8);
  const R8 = util.buffer2bits(Buffer.from(r8Bytes));

  const publicKeyHex = ed.utils.bytesToHex(publicKey);
  const pointA = ed.ExtendedPoint.fromAffine(ed.Point.fromHex(publicKeyHex));
  const pointAbase85 = chunkifyPoint(pointA);

  const R8Hex = ed.utils.bytesToHex(r8Bytes);
  const pointR = ed.ExtendedPoint.fromAffine(ed.Point.fromHex(R8Hex));
  const pointRbase85 = chunkifyPoint(pointR);

  const sBytes = signature.subarray(signature.length - 32, signature.length);
  const SBuf = util.buffer2bits(Buffer.from(sBytes));
  SBuf.shift();
  const SLEB = SBuf;

  const inputs = {
    msg: msg,
    A: A,
    R8: R8,
    S: SLEB,
    PointA: pointAbase85,
    PointR: pointRbase85,
  };

  return inputs;
}

function chunkifyPoint(point: ed.ExtendedPoint) {
  const chunks = [];
  const pointArray = [point.x, point.y, point.z, point.t];
  console.log(point);
  console.log(pointArray);
  for (let i = 0; i < 4; i++) {
    chunks.push(util.chunkBigInt(pointArray[i], BigInt(2 ** 85)));
  }
  for (let i = 0; i < chunks.length; i++) {
    util.pad(chunks[i], 3);
  }
  return chunks;
}
