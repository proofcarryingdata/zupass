import {
  CryptographicCheck,
  PodspecCryptographic
} from "./types/cryptographic";
import { EdDSAPubKeyCheck, PodspecEdDSAPubKey } from "./types/eddsa_pubkey";
import { PodspecEntries } from "./types/entries";
import { IntCheck, PodspecInt } from "./types/int";
import { PodspecPOD } from "./types/pod";
import { PodspecString, StringCheck } from "./types/string";
import { CreateArgs } from "./utils";

export const deserialize = PodspecEntries.deserialize;

/**
 * Creation functions for Podspec types.
 */
export const entries = PodspecEntries.create;
export const string = PodspecString.create;
export const int = PodspecInt.create;
export const cryptographic = PodspecCryptographic.create;
export const eddsaPubKey = PodspecEdDSAPubKey.create;
export const POD = PodspecPOD.create;

/**
 * Creation functions for Podspec values with coercion enabled.
 */
export const coerce = {
  string: (args?: CreateArgs<StringCheck>): PodspecString =>
    string({ ...args, coerce: true }),
  int: (args?: CreateArgs<IntCheck>): PodspecInt =>
    int({ ...args, coerce: true }),
  cryptographic: (
    args?: CreateArgs<CryptographicCheck>
  ): PodspecCryptographic => cryptographic({ ...args, coerce: true }),
  eddsaPubKey: (args?: CreateArgs<EdDSAPubKeyCheck>): PodspecEdDSAPubKey =>
    eddsaPubKey({ ...args, coerce: true })
};
