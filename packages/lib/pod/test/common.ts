import { BABY_JUB_NEGATIVE_ONE } from "@pcd/util";
import { Identity } from "@semaphore-protocol/identity";
import { Point } from "@zk-kit/baby-jubjub";
import { PODEntries } from "../src";

// Key borrowed from https://github.com/iden3/circomlibjs/blob/4f094c5be05c1f0210924a3ab204d8fd8da69f49/test/eddsa.js#L103
export const privateKey =
  "0001020304050607080900010203040506070809000102030405060708090001";

export const expectedPublicKeyPoint = [
  0x1d5ac1f31407018b7d413a4f52c8f74463b30e6ac2238220ad8b254de4eaa3a2n,
  0x1e1de8a908826c3f9ac2e0ceee929ecd0caf3b99b3ef24523aaab796a6f733c4n
] as Point<bigint>;

export const expectedPublicKey =
  "c433f7a696b7aa3a5224efb3993baf0ccd9e92eecee0c29a3f6c8208a9e81d9e";

export const ownerIdentity = new Identity(
  '["329061722381819402313027227353491409557029289040211387019699013780657641967", "99353161014976810914716773124042455250852206298527174581112949561812190422"]'
);

export const sampleEntries1 = {
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
  owner: { type: "cryptographic", value: ownerIdentity.commitment }
} satisfies PODEntries;

// If sample entries or private key change above, this value will need to
// change.  Test failures will indicate the new value.
export const expectedContentID1 =
  21748523748810072846647845097417136490972606253431724953054174411568740252986n;

// If sample entries or private key change above, this value will need to
// change.  Test failures will indicate the new value.
export const expectedSignature1 =
  "e0031246c8657545c154f407006f6856de2f69acd00f23b637ec23620792f10c7bf70befe45c79acf2a8cbea0eb4ffe1beef30ff23f2623fd5acf51beaa0d905";

export const sampleEntries2 = {
  attendee: { type: "cryptographic", value: ownerIdentity.commitment },
  eventID: { type: "cryptographic", value: 456n },
  ticketID: { type: "cryptographic", value: 999n }
} satisfies PODEntries;

// If sample entries or private key change above, this value will need to
// change.  Test failures will indicate the new value.
export const expectedContentID2 =
  8121973595251725959527136190050016648811901981184487048534858036206640503232n;

// If sample entries or private key change above, this value will need to
// change.  Test failures will indicate the new value.
export const expectedSignature2 =
  "4febca252ff7e55c29bbada47b8b4b32f667e1270eb77f3a9b0f8ee73bebe689eb89d8ff85c4abd22bf32da15ad7f7fbf2c7e7b1d40ade685cb39c990f9f8b00";

export const testStringsToHash = [
  "",
  "a",
  "A",
  "\0",
  "valid_identifier",
  "not a valid Identifier",
  "😜"
];

export const testIntsToHash = [
  0n,

  1n,
  -1n,

  0xdeadbeefn,
  -0xdeadbeefn,

  // 128-bit large value
  0xfeedface_deadbeef_feedface_deadbeefn,
  -0xfeedface_deadbeef_feedface_deadbeefn,

  // Max 256-bit 32-byte integer value (too large for a circuit, but hashable
  // after being reduced mod R).
  0xffffffff_ffffffff_ffffffff_ffffffff_ffffffff_ffffffff_ffffffff_ffffffffn
];

export const testPrivateKeys = [
  privateKey,
  "00112233445566778899AABBCCDDEEFF00112233445566778899aabbccddeeff",
  "FFEEDDCCBBAA99887766554433221100ffeeddccbbaa99887766554433221100"
];
