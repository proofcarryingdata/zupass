// https://github.com/iden3/circomlibjs/blob/4f094c5be05c1f0210924a3ab204d8fd8da69f49/src/eddsa.js

import buildBabyJub, { BabyJub } from "./babyjub";
import { buildPoseidon } from "./poseidon_wasm";
import { Point, Poseidon, Signature } from "./types";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const createBlakeHash = require("blake-hash");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Scalar } = require("ffjavascript");

export async function buildEddsa() {
  const babyJub = await buildBabyJub();
  const poseidon = await buildPoseidon();
  return new Eddsa(babyJub, poseidon);
}

export class Eddsa {
  F: any; // https://github.com/iden3/ffjavascript/blob/master/src/wasm_field1.js
  babyJub: BabyJub;
  poseidon: Poseidon;

  constructor(babyJub: any, poseidon: any) {
    this.babyJub = babyJub;
    this.poseidon = poseidon;
    this.F = babyJub.F;
  }

  pruneBuffer(buff: Uint8Array) {
    buff[0] = buff[0] & 0xf8;
    buff[31] = buff[31] & 0x7f;
    buff[31] = buff[31] | 0x40;
    return buff;
  }

  prv2pub(prv: any) {
    const sBuff = this.pruneBuffer(
      createBlakeHash("blake512").update(Buffer.from(prv)).digest()
    );
    const s = Scalar.fromRprLE(sBuff, 0, 32);
    const A = this.babyJub.mulPointEscalar(
      this.babyJub.Base8,
      Scalar.shr(s, 3)
    );
    return A;
  }

  signPoseidon(prv: any, msg: Uint8Array) {
    const F = this.babyJub.F;
    const sBuff = this.pruneBuffer(
      createBlakeHash("blake512").update(Buffer.from(prv)).digest()
    );
    const s = Scalar.fromRprLE(sBuff, 0, 32);
    const A = this.babyJub.mulPointEscalar(
      this.babyJub.Base8,
      Scalar.shr(s, 3)
    );

    const composeBuff = new Uint8Array(32 + msg.length);
    composeBuff.set(sBuff.slice(32), 0);
    F.toRprLE(composeBuff, 32, msg);
    const rBuff = createBlakeHash("blake512")
      .update(Buffer.from(composeBuff))
      .digest();
    const r = Scalar.mod(Scalar.fromRprLE(rBuff, 0, 64), this.babyJub.subOrder);
    const R8 = this.babyJub.mulPointEscalar(this.babyJub.Base8, r);

    const hm = this.poseidon([R8[0], R8[1], A[0], A[1], msg]);
    const hms = Scalar.e(this.babyJub.F.toObject(hm));
    const S = Scalar.mod(
      Scalar.add(r, Scalar.mul(hms, s)),
      this.babyJub.subOrder
    );
    return {
      R8: R8,
      S: S
    };
  }

  verifyPoseidon(msg: Uint8Array, sig: Signature, A: Point) {
    // Check parameters
    if (typeof sig != "object") return false;
    if (!Array.isArray(sig.R8)) return false;
    if (sig.R8.length != 2) return false;
    if (!this.babyJub.inCurve(sig.R8)) return false;
    if (!Array.isArray(A)) return false;
    if (A.length != 2) return false;
    if (!this.babyJub.inCurve(A)) return false;
    if (sig.S >= this.babyJub.subOrder) return false;

    const hm = this.poseidon([sig.R8[0], sig.R8[1], A[0], A[1], msg]);
    const hms = Scalar.e(this.babyJub.F.toObject(hm));

    const Pleft = this.babyJub.mulPointEscalar(this.babyJub.Base8, sig.S);
    let Pright = this.babyJub.mulPointEscalar(A, Scalar.mul(hms, 8));
    Pright = this.babyJub.addPoint(sig.R8, Pright);

    if (!this.babyJub.F.eq(Pleft[0], Pright[0])) return false;
    if (!this.babyJub.F.eq(Pleft[1], Pright[1])) return false;
    return true;
  }

  packSignature(sig: Signature) {
    const buff = new Uint8Array(64);
    const R8p = this.babyJub.packPoint(sig.R8);
    buff.set(R8p, 0);
    Scalar.toRprLE(buff, 32, sig.S, 32);
    return buff;
  }

  unpackSignature(sigBuff: Uint8Array): Signature | null {
    const R8 = this.babyJub.unpackPoint(sigBuff.slice(0, 32));

    return R8
      ? {
          R8,
          S: Scalar.fromRprLE(sigBuff, 32, 32)
        }
      : null;
  }
}
