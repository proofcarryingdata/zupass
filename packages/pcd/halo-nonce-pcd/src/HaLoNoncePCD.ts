import { PCD, StringArgument } from "@pcd/pcd-types";

export const HaLoNoncePCDTypeName = "halo-nonce-pcd";

// Arguments taken from the URL produced by the HaLo tags, the definition is at
// https://github.com/arx-research/libhalo/blob/master/docs/halo-command-set.md#command-sign_random
export type HaLoNoncePCDArgs = {
  /**
   * The uncompressed hex string of the signing public key
   */
  pk2: StringArgument;

  /**
   * The digest of the nonce + random string
   */
  rnd: StringArgument;

  /**
   * The signature of the nonce + random string
   */
  rndsig: StringArgument;
};

export interface HaLoNoncePCDClaim {
  /**
   * Incrementing nonce that was signed.
   */
  nonce: number;

  /**
   * Uncompressed hex string of the public key, starting with `04`
   */
  pubkeyHex: string;
}

export interface HaLoNoncePCDProof {
  /**
   * The signed digest, consisting of the nonce concatenated with a random string
   */
  signedDigest: string;

  /**
   * The cleaned signature of the nonce + random string,
   */
  cleanedSignature: string;
}

export class HaLoNoncePCD implements PCD<HaLoNoncePCDClaim, HaLoNoncePCDProof> {
  type = HaLoNoncePCDTypeName;
  claim: HaLoNoncePCDClaim;
  proof: HaLoNoncePCDProof;
  id: string;

  public constructor(
    id: string,
    claim: HaLoNoncePCDClaim,
    proof: HaLoNoncePCDProof
  ) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}
