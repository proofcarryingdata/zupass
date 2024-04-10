import { StringArgument } from "@pcd/pcd-types";

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
