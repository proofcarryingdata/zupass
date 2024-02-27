import { PODEntries } from "@pcd/pod";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import { Circomkit } from "circomkit";
import { readFileSync } from "fs";
import path from "path";

const configFilePath = path.join(__dirname, "../circomkit.json");
const config = JSON.parse(readFileSync(configFilePath, "utf-8"));

// eslint-disable-next-line import/prefer-default-export
export const circomkit = new Circomkit({
  ...config,
  verbose: false
});

// Key borrowed from https://github.com/iden3/circomlibjs/blob/4f094c5be05c1f0210924a3ab204d8fd8da69f49/test/eddsa.js#L103
export const privateKey =
  "0001020304050607080900010203040506070809000102030405060708090001";

export const ownerIdentity = new Identity(
  '["329061722381819402313027227353491409557029289040211387019699013780657641967", "99353161014976810914716773124042455250852206298527174581112949561812190422"]'
);

// 11 entries, max depth 5
// Defined out of order, but will be sorted by POD construction.
export const sampleEntries = {
  E: { type: "cryptographic", value: 123n },
  F: { type: "cryptographic", value: 0xffffffffn },
  C: { type: "string", value: "hello" },
  D: { type: "string", value: "foobar" },
  A: { type: "int", value: 123n },
  B: { type: "int", value: 321n },
  G: { type: "int", value: 7n },
  H: { type: "int", value: 8n },
  I: { type: "int", value: 9n },
  J: { type: "int", value: 10n },
  owner: { type: "cryptographic", value: ownerIdentity.commitment }
} as PODEntries;

// 3 entries, max depth 3
export const sampleEntries2 = {
  attendee: { type: "cryptographic", value: ownerIdentity.commitment },
  eventID: { type: "cryptographic", value: 456n },
  ticketID: { type: "cryptographic", value: 999n }
} as PODEntries;

// Convert an array of bit signals into a single packed bigint.
// Error handling is via chai.expect, so only useful in unit tests.
export function testArray2Bits(boolArray: bigint[]): bigint {
  let bits = 0n;
  for (let i = 0; i < boolArray.length; i++) {
    expect(boolArray[i]).to.be.oneOf([0n, 1n]);
    if (boolArray[i] === 1n) {
      bits |= 1n << BigInt(i);
    }
  }
  return bits;
}
