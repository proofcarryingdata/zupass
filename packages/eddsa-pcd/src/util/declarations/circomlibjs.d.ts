declare module "circomlibjs" {
  // Import the types used by eddsa and babyJub modules
  import { Point, Scalar } from "circomlib/ff";

  type PoseidonFn = (inputs: bigint[]) => Uint8Array;
  type Signature = { R8: Point; S: Scalar };

  export function buildEddsa(): Promise<Eddsa>;
  export function buildPoseidon(): Promise<PoseidonFn>;

  // Declare the Eddsa class.
  export class Eddsa {
    // Sign a message and return the signature
    signPoseidon(prvKey: Uint8Array, msg: Uint8Array): Signature;

    // Verify a message
    verifyPoseidon(
      msg: Uint8Array,
      signature: Signature,
      pubKey: Point
    ): boolean;

    // Convert a private key to a public key
    prv2pub(privKey: Uint8Array): [Uint8Array, Uint8Array];

    // Pack a signature into a Uint8Array
    packSignature(signature: Signature): Uint8Array;

    // Pack a signature into a Uint8Array
    unpackSignature(packedSignature: Uint8Array): { R8: Point; S: Scalar };
  }
}
