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

export const sampleEntries2 = {
  attendee: { type: "cryptographic", value: ownerIdentity.commitment },
  eventID: { type: "cryptographic", value: 456n },
  ticketID: { type: "cryptographic", value: 999n }
} satisfies PODEntries;
