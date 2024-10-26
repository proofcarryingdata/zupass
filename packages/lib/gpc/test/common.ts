import { loadCircomkitConfig } from "@pcd/gpcircuits";
import {
  EDDSA_PUBKEY_TYPE_STRING,
  PODEdDSAPublicKeyValue,
  PODEntries,
  encodePublicKey
} from "@pcd/pod";
import { BABY_JUB_NEGATIVE_ONE } from "@pcd/util";
import { Identity } from "@semaphore-protocol/identity";
import { AssertionError, assert, expect } from "chai";
import { Circomkit } from "circomkit";
import { readFileSync } from "fs";
import path from "path";
import { Identity as IdentityV4 } from "semaphore-identity-v4";

export const GPCIRCUITS_PACKAGE_PATH = path.join(
  __dirname,
  "../../../lib/gpcircuits"
);

// eslint-disable-next-line import/prefer-default-export
export const circomkit = new Circomkit({
  ...loadCircomkitConfig(GPCIRCUITS_PACKAGE_PATH, readFileSync),
  verbose: false
});

export const GPC_TEST_ARTIFACTS_PATH = path.join(
  GPCIRCUITS_PACKAGE_PATH,
  "artifacts/test"
);

// Key borrowed from https://github.com/iden3/circomlibjs/blob/4f094c5be05c1f0210924a3ab204d8fd8da69f49/test/eddsa.js#L103
export const privateKey = "AAECAwQFBgcICQABAgMEBQYHCAkAAQIDBAUGBwgJAAE"; // hex 0001020304050607080900010203040506070809000102030405060708090001
export const privateKey2 = "AAECAwQFBgcICQABAgMEBQYHCAkAAQIDBAQFBggIAAA"; // hex 0001020304050607080900010203040506070809000102030404050608080000

// Semaphore V3 identity
export const ownerIdentity = new Identity(
  '["329061722381819402313027227353491409557029289040211387019699013780657641967", "99353161014976810914716773124042455250852206298527174581112949561812190422"]'
);

// Semaphore V4 identity
export const ownerIdentityV4 = new IdentityV4(
  "0001020304050607080900010203040506070809000102030405060708090001"
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
  pubKey: {
    type: EDDSA_PUBKEY_TYPE_STRING,
    value: "xDP3ppa3qjpSJO+zmTuvDM2eku7O4MKaP2yCCKnoHZ4"
  },
  otherTicketID: { type: "int", value: 999n },
  owner: { type: "cryptographic", value: ownerIdentity.commitment },
  ownerV4: PODEdDSAPublicKeyValue(encodePublicKey(ownerIdentityV4.publicKey))
} satisfies PODEntries;

// 3 entries, max depth 3
export const sampleEntries2 = {
  attendee: { type: "cryptographic", value: ownerIdentity.commitment },
  eventID: { type: "cryptographic", value: 456n },
  ticketID: { type: "cryptographic", value: 999n }
} satisfies PODEntries;

// 8 entries, max depth 4
export const allTypesEntries = {
  vString: { type: "string", value: "hello" },
  vBytes: { type: "bytes", value: new Uint8Array([1, 2, 3]) },
  vCryptographic: {
    type: "cryptographic",
    value:
      18003549444852780886592139349318927700964545643704389119309344945101355208480n
  },
  vInt: {
    type: "int",
    value: 123n
  },
  vBoolean: { type: "boolean", value: true },
  vEddsaPubkey: {
    type: "eddsa_pubkey",
    value: "xDP3ppa3qjpSJO+zmTuvDM2eku7O4MKaP2yCCKnoHZ4"
  },
  vDate: {
    type: "date",
    value: new Date("2024-01-01T00:00:00.000Z")
  },
  vNull: { type: "null", value: null }
} satisfies PODEntries;

export async function expectAsyncError(
  fn: () => Promise<void>,
  typeName: string,
  errSubstring?: string
): Promise<void> {
  try {
    await fn();
    assert.fail("Expected an error to be thrown.");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    if (e instanceof AssertionError) {
      throw e;
    }
    expect(e.constructor.name).to.eq(typeName);
    if (errSubstring) {
      expect("" + e).to.contain(errSubstring);
    }
  }
}
