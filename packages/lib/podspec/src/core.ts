import { PodspecEntries } from "./entries";
import {
  CryptographicCheck,
  PodspecCryptographic
} from "./types/cryptographic";
import { EdDSAPubKeyCheck, PodspecEdDSAPubKey } from "./types/eddsa_pubkey";
import { IntCheck, PodspecInt } from "./types/int";
import { PodspecString, StringCheck } from "./types/string";
import { CreateArgs } from "./utils";

/**
 * TODOs:
 * - [ ] Wrap checkBigIntBounds to stop exceptions being thrown.
 * - [ ] (De)Serialization of PodspecType and subclasses
 * - [ ] Async validation
 * - [ ] Add a special check for signer public keys
 * - [ ] Better error reporting
 * - [ ] Optional entries
 */

export const entries = PodspecEntries.create;
export const string = PodspecString.create;
export const integer = PodspecInt.create;
export const cryptographic = PodspecCryptographic.create;
export const eddsaPubKey = PodspecEdDSAPubKey.create;

export const coerce = {
  string: (args?: CreateArgs<StringCheck>): PodspecString =>
    string({ ...args, coerce: true }),
  integer: (args?: CreateArgs<IntCheck>): PodspecInt =>
    integer({ ...args, coerce: true }),
  cryptographic: (
    args?: CreateArgs<CryptographicCheck>
  ): PodspecCryptographic => cryptographic({ ...args, coerce: true }),
  eddsaPubKey: (args?: CreateArgs<EdDSAPubKeyCheck>): PodspecEdDSAPubKey =>
    eddsaPubKey({ ...args, coerce: true })
};
