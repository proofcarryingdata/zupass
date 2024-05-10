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
  "FFEEDDCCBBAA99887766554433221100ffeeddccbbaa99887766554433221100",

  // The remaining keys here are randomly generated.
  "4f70a5bd0e2d2c4fe33f81e1541cd93890e74aea0e45dce15e8279ad00a23fe5",
  "33d640f957657741fc0277b3a8ab7ef22a2f5a6b038d5f40dc298f1a810dcfeb",
  "b0738043cb2f3d98cb5910faf66861a12cd7786e2134faf15ac42f39f2099d4f",
  "428059a12444ba732084c92fbca1eaf69066376e545fa4ba6780c41429d27370",
  "e22fb1ebe7f5332c659988103256fdbfe91452ac337eb0b603fb60e54752e4a2",
  "896492daf440199cef50aa4bb3647a1f12cb6ce5e538de22bc6354f7e785b402",
  "2a4d5f95eac9e4c1e36adfdac93c3e7db6d9476c0887c5f84f7a7a93e7bebfac",
  "e8d76fa0881a74fcb7d7222aa1ac546137314ac559d3ff5c1260d1e151ee66f1",
  "1957b35254eaba52eec08023e68c9c6149a86010b6e5637366841ff0f9e1071f",
  "57942716300edc442eee29f20d671dc7bc12a3587cf0b879a8f5061e38316ebb"
];
