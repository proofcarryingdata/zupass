import { PODEntries } from "@pcd/pod";
import { Identity as IdentityV3 } from "@pcd/semaphore-identity-v3-wrapper";
import { BABY_JUB_NEGATIVE_ONE } from "@pcd/util";

// Key borrowed from https://github.com/iden3/circomlibjs/blob/4f094c5be05c1f0210924a3ab204d8fd8da69f49/test/eddsa.js#L103
export const privateKey = "AAECAwQFBgcICQABAgMEBQYHCAkAAQIDBAUGBwgJAAE"; // hex 0001020304050607080900010203040506070809000102030405060708090001
export const privateKey2 = "AAECAwQFBgcICQABAgMEBQYHCAkAAQIDBAQFBggIAAA"; // hex 0001020304050607080900010203040506070809000102030404050608080000

export const ownerIdentity = new IdentityV3(
  '["329061722381819402313027227353491409557029289040211387019699013780657641967", "99353161014976810914716773124042455250852206298527174581112949561812190422"]'
);

// 11 entries, max depth 5
// Defined out of order, but will be sorted by POD construction.
export const sampleEntries0 = {
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

export const sampleEntries1 = {
  attendee: { type: "cryptographic", value: ownerIdentity.commitment },
  eventID: { type: "cryptographic", value: 456n },
  ticketID: { type: "cryptographic", value: 999n }
} satisfies PODEntries;
