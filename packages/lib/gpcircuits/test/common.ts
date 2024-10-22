import {
  EDDSA_PUBKEY_TYPE_STRING,
  PODEdDSAPublicKeyValue,
  PODEntries,
  encodePublicKey
} from "@pcd/pod";
import { Identity as IdentityV3 } from "@pcd/semaphore-identity-v3-wrapper";
import { BABY_JUB_NEGATIVE_ONE } from "@pcd/util";
import { Circomkit } from "circomkit";
import { readFileSync } from "fs";
import path from "path";
import { Identity as IdentityV4 } from "semaphore-identity-v4";
import { loadCircomkitConfig } from "../src";

// eslint-disable-next-line import/prefer-default-export
export const circomkit = new Circomkit({
  ...loadCircomkitConfig(path.join(__dirname, "../"), readFileSync),
  verbose: false
});

// Key borrowed from https://github.com/iden3/circomlibjs/blob/4f094c5be05c1f0210924a3ab204d8fd8da69f49/test/eddsa.js#L103
export const privateKey = "AAECAwQFBgcICQABAgMEBQYHCAkAAQIDBAUGBwgJAAE"; // hex 0001020304050607080900010203040506070809000102030405060708090001

export const privateKey2 = "AAEBAQIDBQEGABABAgMEBQYHCAkAAQIDBAUGBAgJAAA"; // hex 0001010102030501060010010203040506070809000102030405060408090000

// Semaphore V3 identity
export const ownerIdentity = new IdentityV3(
  '["329061722381819402313027227353491409557029289040211387019699013780657641967", "99353161014976810914716773124042455250852206298527174581112949561812190422"]'
);

// Semaphore V4 identity
export const ownerIdentityV4 = new IdentityV4(
  "20544E72E131A029B85045C68181585D2833E84879B9709143E1F593F0000001"
);

// 11 entries, max depth 5
// Defined out of order, but will be sorted by POD construction.
export const sampleEntries = {
  E: { type: "cryptographic", value: 123n },
  F: { type: "cryptographic", value: BABY_JUB_NEGATIVE_ONE },
  C: { type: "string", value: "hello" },
  D: { type: "string", value: "foobar" },
  A: { type: "int", value: 123n },
  B: { type: "int", value: 321n },
  G: { type: "int", value: 7n },
  H: { type: "int", value: 8n },
  I: { type: "int", value: 9n },
  J: { type: "int", value: 10n },
  K: { type: "int", value: -5n },
  owner: { type: "cryptographic", value: ownerIdentity.commitment }
} satisfies PODEntries;

// 3 entries, max depth 3
export const sampleEntries2 = {
  attendee: { type: "cryptographic", value: ownerIdentity.commitment },
  eventID: { type: "cryptographic", value: 456n },
  ticketID: { type: "cryptographic", value: 999n },
  pubKey: {
    type: EDDSA_PUBKEY_TYPE_STRING,
    value: "c433f7a696b7aa3a5224efb3993baf0ccd9e92eecee0c29a3f6c8208a9e81d9e"
  }
} satisfies PODEntries;

// 3 entries, max depth 3
export const sampleEntries3 = {
  attendee: PODEdDSAPublicKeyValue(encodePublicKey(ownerIdentityV4.publicKey)),
  eventID: { type: "cryptographic", value: 400n },
  ticketID: { type: "cryptographic", value: 1n },
  pubKey: sampleEntries2.pubKey
} satisfies PODEntries;
