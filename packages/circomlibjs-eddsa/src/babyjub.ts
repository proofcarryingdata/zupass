// https://github.com/iden3/circomlibjs/blob/4f094c5be05c1f0210924a3ab204d8fd8da69f49/src/babyjub.js
import { BigNumberish, Point } from "./types";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getCurveFromName, Scalar } = require("ffjavascript");

export default async function buildBabyJub() {
  const bn128 = await getCurveFromName("bn128", true);
  return new BabyJub(bn128.Fr);
}

export class BabyJub {
  F: any; // https://github.com/iden3/ffjavascript/blob/master/src/wasm_field1.js
  p: bigint;
  pm1d2: bigint;
  Generator: Point;
  Base8: Point;
  order: bigint;
  subOrder: bigint;
  A: Uint8Array;
  D: Uint8Array;

  constructor(F: any) {
    this.F = F;
    this.p = Scalar.fromString(
      "21888242871839275222246405745257275088548364400416034343698204186575808495617"
    );
    this.pm1d2 = Scalar.div(Scalar.sub(this.p, Scalar.e(1)), Scalar.e(2));

    this.Generator = [
      F.e(
        "995203441582195749578291179787384436505546430278305826713579947235728471134"
      ),
      F.e(
        "5472060717959818805561601436314318772137091100104008585924551046643952123905"
      )
    ];
    this.Base8 = [
      F.e(
        "5299619240641551281634865583518297030282874472190772894086521144482721001553"
      ),
      F.e(
        "16950150798460657717958625567821834550301663161624707787222815936182638968203"
      )
    ];
    this.order = Scalar.fromString(
      "21888242871839275222246405745257275088614511777268538073601725287587578984328"
    );
    this.subOrder = Scalar.shiftRight(this.order, 3);
    this.A = F.e("168700");
    this.D = F.e("168696");
  }

  addPoint(a: Point, b: Point): Point {
    const F = this.F;

    /* does the equivalent of:
        res[0] = bigInt((a[0]*b[1] + b[0]*a[1]) *  bigInt(bigInt("1") + d*a[0]*b[0]*a[1]*b[1]).inverse(q)).affine(q);
        res[1] = bigInt((a[1]*b[1] - cta*a[0]*b[0]) * bigInt(bigInt("1") - d*a[0]*b[0]*a[1]*b[1]).inverse(q)).affine(q);
        */

    const beta = F.mul(a[0], b[1]);
    const gamma = F.mul(a[1], b[0]);
    const delta = F.mul(F.sub(a[1], F.mul(this.A, a[0])), F.add(b[0], b[1]));
    const tau = F.mul(beta, gamma);
    const dtau = F.mul(this.D, tau);

    return [
      F.div(F.add(beta, gamma), F.add(F.one, dtau)),
      F.div(F.add(delta, F.sub(F.mul(this.A, beta), gamma)), F.sub(F.one, dtau))
    ];
  }

  mulPointEscalar(base: Point, e: BigNumberish): Point {
    const F = this.F;
    let res: Point = [F.e("0"), F.e("1")];
    let rem = e;
    let exp = base;

    while (!Scalar.isZero(rem)) {
      if (Scalar.isOdd(rem)) {
        res = this.addPoint(res, exp);
      }
      exp = this.addPoint(exp, exp);
      rem = Scalar.shiftRight(rem, 1);
    }

    return res;
  }

  inSubgroup(P: Point) {
    const F = this.F;
    if (!this.inCurve(P)) return false;
    const res = this.mulPointEscalar(P, this.subOrder);
    return F.isZero(res[0]) && F.eq(res[1], F.one);
  }

  inCurve(P: Point) {
    const F = this.F;
    const x2 = F.square(P[0]);
    const y2 = F.square(P[1]);

    if (
      !F.eq(
        F.add(F.mul(this.A, x2), y2),
        F.add(F.one, F.mul(F.mul(x2, y2), this.D))
      )
    )
      return false;

    return true;
  }

  packPoint(P: Point) {
    const F = this.F;
    const buff = new Uint8Array(32);
    F.toRprLE(buff, 0, P[1]);
    const n = F.toObject(P[0]);
    if (Scalar.gt(n, this.pm1d2)) {
      buff[31] = buff[31] | 0x80;
    }
    return buff;
  }

  unpackPoint(buff: Uint8Array): Point | null {
    const F = this.F;
    let sign = false;
    const P = new Array(2);
    if (buff[31] & 0x80) {
      sign = true;
      buff[31] = buff[31] & 0x7f;
    }
    P[1] = F.fromRprLE(buff, 0);
    if (Scalar.gt(F.toObject(P[1]), this.p)) return null;

    const y2 = F.square(P[1]);

    const x2 = F.div(F.sub(F.one, y2), F.sub(this.A, F.mul(this.D, y2)));

    const x2h = F.exp(x2, F.half);
    if (!F.eq(F.one, x2h)) return null;

    let x = F.sqrt(x2);

    if (x == null) return null;

    if (sign) x = F.neg(x);

    P[0] = x;

    return P as Point;
  }
}
