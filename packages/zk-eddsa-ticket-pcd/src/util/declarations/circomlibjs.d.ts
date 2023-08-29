declare module "circomlibjs" {
  // Import the types used by babyJub modules

  type Signature = { R8: any; S: any };

  export function buildBabyjub(): Promise<BabyJub>;
  export function buildEddsa(): Promise<Eddsa>;

  export class WasmField1 {
    toObject(a: Uint8Array): BigInt
  }

  export class BabyJub {
    F: WasmField1
  }

  export class Eddsa {
    // Pack a signature into a Uint8Array
    unpackSignature(packedSignature: Uint8Array): Signature;
  }
}
