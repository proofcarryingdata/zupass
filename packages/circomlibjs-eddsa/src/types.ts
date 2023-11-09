export type BigNumberish = string | bigint | number | Uint8Array;

export type Point = [Uint8Array, Uint8Array];

export interface Poseidon {
  (arr: BigNumberish[], state?: BigNumberish, nOut?: number): Uint8Array;
  F: any;
}

export interface Signature {
  R8: Point;
  S: bigint;
}
