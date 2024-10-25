import { BABY_JUB_NEGATIVE_ONE } from "@pcd/util";
import { Identity } from "@semaphore-protocol/identity";
import { Point } from "@zk-kit/baby-jubjub";
import { PODEntries } from "../src";

// Key borrowed from https://github.com/iden3/circomlibjs/blob/4f094c5be05c1f0210924a3ab204d8fd8da69f49/test/eddsa.js#L103
export const privateKeyHex =
  "0001020304050607080900010203040506070809000102030405060708090001";
export const privateKey = "AAECAwQFBgcICQABAgMEBQYHCAkAAQIDBAUGBwgJAAE";

export const expectedPublicKeyPoint = [
  0x1d5ac1f31407018b7d413a4f52c8f74463b30e6ac2238220ad8b254de4eaa3a2n,
  0x1e1de8a908826c3f9ac2e0ceee929ecd0caf3b99b3ef24523aaab796a6f733c4n
] as Point<bigint>;

export const expectedPublicKeyHex =
  "c433f7a696b7aa3a5224efb3993baf0ccd9e92eecee0c29a3f6c8208a9e81d9e";
export const expectedPublicKey = "xDP3ppa3qjpSJO+zmTuvDM2eku7O4MKaP2yCCKnoHZ4";

export const ownerIdentity = new Identity(
  '["329061722381819402313027227353491409557029289040211387019699013780657641967", "99353161014976810914716773124042455250852206298527174581112949561812190422"]'
);

export const sampleEntries1 = {
  E: { type: "int", value: -123n },
  F: { type: "cryptographic", value: BABY_JUB_NEGATIVE_ONE },
  C: { type: "string", value: "hello" },
  D: { type: "string", value: "foobar" },
  A: { type: "int", value: 123n },
  B: { type: "int", value: 321n },
  G: { type: "int", value: 7n },
  H: { type: "int", value: 8n },
  I: { type: "int", value: 9n },
  J: { type: "int", value: 10n },
  publicKey: { type: "eddsa_pubkey", value: expectedPublicKey },
  owner: { type: "cryptographic", value: ownerIdentity.commitment }
} satisfies PODEntries;

// If sample entries or private key change above, this value will need to
// change.  Test failures will indicate the new value.
export const expectedContentID1 =
  18003549444852780886592139349318927700964545643704389119309344945101355208480n;

// If sample entries or private key change above, this value will need to
// change.  Test failures will indicate the new value.
export const expectedSignature1Hex =
  "269de2d8f9e74682c29953f380ce81a30721838e23cf77cab8c40fcd742a5b2e23ccf169671d8ac0bb9a21869e61b77b021e05bac121b76561b157f723cd4002";
export const expectedSignature1 =
  "Jp3i2PnnRoLCmVPzgM6Bowchg44jz3fKuMQPzXQqWy4jzPFpZx2KwLuaIYaeYbd7Ah4FusEht2VhsVf3I81AAg";

export const sampleEntries2 = {
  attendee: { type: "cryptographic", value: ownerIdentity.commitment },
  eventID: { type: "cryptographic", value: 456n },
  ticketID: { type: "cryptographic", value: 999n },
  isConsumed: { type: "boolean", value: true },
  issueDate: { type: "date", value: new Date(Date.UTC(2024)) },
  image: { type: "bytes", value: new Uint8Array([1, 2, 3]) },
  vipStatus: { type: "null", value: null }
} satisfies PODEntries;

// If sample entries or private key change above, this value will need to
// change.  Test failures will indicate the new value.
export const expectedContentID2 =
  14490445713061892907571559700953246722753167030842690801373581812224357192993n;

// If sample entries or private key change above, this value will need to
// change.  Test failures will indicate the new value.
export const expectedSignature2Hex =
  "5ec3cbeb73492a4ab9f4288ef150b7bc314d18f78d7e70ec377ba09faf1a3908cebc030b891a84d88484050489940c5bf5ea24cb26ae52e2a51b20fdf0579205";
export const expectedSignature2 =
  "XsPL63NJKkq59CiO8VC3vDFNGPeNfnDsN3ugn68aOQjOvAMLiRqE2ISEBQSJlAxb9eokyyauUuKlGyD98FeSBQ";

export const testStringsToHash: string[] = [
  "",
  "a",
  "A",
  "\0",
  "valid_identifier",
  "not a valid Identifier",
  "😜"
];

export const testBytesToHash: Uint8Array[] = [
  new Uint8Array([]),
  Buffer.from("hello"),
  new Uint8Array([1, 2, 3]),
  Buffer.from(
    "longbytes\0longerbyteslongbytes\0longerbyteslongbytes\0longerbyteslongbytes\0longerbyteslongbytes\0longerbyteslongbytes\0longerbyteslongbytes\0longerbytes"
  )
];

export const testUniqueBytesToHash: Uint8Array[] = [
  new Uint8Array([1, 2, 3]),
  Buffer.from(
    "longbytes\0longerbyteslongbytes\0longerbyteslongbytes\0longerbyteslongbytes\0longerbyteslongbytes\0longerbyteslongbytes\0longerbyteslongbytes\0longerbytes"
  )
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

export const testDatesToHash = [
  new Date(1234567),
  new Date(Date.UTC(2024)),
  new Date("2024-10-25T04:01:00.638Z")
];

export const testPublicKeysToHash = [
  "4f5fb4898c477d8c17227ddd81eb597125e4d437489c01a6085b5db54e053b0a",
  "09ba237eb49e4552da3bf5260f8ca8a9a9055c41aad47ef564de4bb1a5cba619",
  "ce1c9c187ad59b5a324020ab503e783bc95bc268cb1b03cb5c7be91f1e4e8917",
  "c2478aa919f5d09a68fe264d9e980b94872d2472cb53f514bfc1b19f3029741f",
  "bcac8981e8ee8f5d9206f5b74f67b1ce91c6bc18b81d259c7a9526b251e7a39f",
  "f71b62538fbc40df0d5e5b2034641ae437bdbf06012779590099456cf25b5f8f",
  "755224af31d5b5e47cc6ca8827b8bf9d2ceba48bf439907abaade0a3269d561b",
  "f27205e5ceeaad24025652cc9f6f18cee5897266f8c0aac5b702d48e0dea3585",
  "2af47e1aaf8f0450b9fb2e429042708ec7d173c4ac4329747db1063b78db4e0d"
];

export const testPrivateKeysHex = [
  "0001020304050607080900010203040506070809000102030405060708090001", // private key above

  "00112233445566778899AABBCCDDEEFF00112233445566778899aabbccddeeff", // mixed-case hex digits
  "FFEEDDCCBBAA99887766554433221100ffeeddccbbaa99887766554433221100", // mixed-case hex digits in reverse

  // The remaining keys here are randomly generated (hex).
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

// All the same keys above in base64 with padding.
export const testPrivateKeysBase64pad = [
  "AAECAwQFBgcICQABAgMEBQYHCAkAAQIDBAUGBwgJAAE=",
  "ABEiM0RVZneImaq7zN3u/wARIjNEVWZ3iJmqu8zd7v8=",
  "/+7dzLuqmYh3ZlVEMyIRAP/u3cy7qpmId2ZVRDMiEQA=",
  "T3ClvQ4tLE/jP4HhVBzZOJDnSuoORdzhXoJ5rQCiP+U=",
  "M9ZA+Vdld0H8AnezqKt+8iovWmsDjV9A3CmPGoENz+s=",
  "sHOAQ8svPZjLWRD69mhhoSzXeG4hNPrxWsQvOfIJnU8=",
  "QoBZoSREunMghMkvvKHq9pBmN25UX6S6Z4DEFCnSc3A=",
  "4i+x6+f1MyxlmYgQMlb9v+kUUqwzfrC2A/tg5UdS5KI=",
  "iWSS2vRAGZzvUKpLs2R6HxLLbOXlON4ivGNU9+eFtAI=",
  "Kk1flerJ5MHjat/ayTw+fbbZR2wIh8X4T3p6k+e+v6w=",
  "6NdvoIgadPy31yIqoaxUYTcxSsVZ0/9cEmDR4VHuZvE=",
  "GVezUlTqulLuwIAj5oycYUmoYBC25WNzZoQf8PnhBx8=",
  "V5QnFjAO3EQu7inyDWcdx7wSo1h88Lh5qPUGHjgxbrs="
];

// All the same keys above in base64 without padding.
export const testPrivateKeysBase64 = [
  "AAECAwQFBgcICQABAgMEBQYHCAkAAQIDBAUGBwgJAAE",
  "ABEiM0RVZneImaq7zN3u/wARIjNEVWZ3iJmqu8zd7v8",
  "/+7dzLuqmYh3ZlVEMyIRAP/u3cy7qpmId2ZVRDMiEQA",
  "T3ClvQ4tLE/jP4HhVBzZOJDnSuoORdzhXoJ5rQCiP+U",
  "M9ZA+Vdld0H8AnezqKt+8iovWmsDjV9A3CmPGoENz+s",
  "sHOAQ8svPZjLWRD69mhhoSzXeG4hNPrxWsQvOfIJnU8",
  "QoBZoSREunMghMkvvKHq9pBmN25UX6S6Z4DEFCnSc3A",
  "4i+x6+f1MyxlmYgQMlb9v+kUUqwzfrC2A/tg5UdS5KI",
  "iWSS2vRAGZzvUKpLs2R6HxLLbOXlON4ivGNU9+eFtAI",
  "Kk1flerJ5MHjat/ayTw+fbbZR2wIh8X4T3p6k+e+v6w",
  "6NdvoIgadPy31yIqoaxUYTcxSsVZ0/9cEmDR4VHuZvE",
  "GVezUlTqulLuwIAj5oycYUmoYBC25WNzZoQf8PnhBx8",
  "V5QnFjAO3EQu7inyDWcdx7wSo1h88Lh5qPUGHjgxbrs"
];

export const testPrivateKeys = testPrivateKeysBase64;

export const testPrivateKeysAllFormats = testPrivateKeysHex.concat(
  testPrivateKeysBase64pad,
  testPrivateKeysBase64
);

/**
 * Strip trailing `=` padding from Base64.
 *
 * Intentionally distinct from podUtil's stripBase64Padding, to avoid testing
 * code against itself.
 */
export function stripB64(encoded: string): string {
  while (encoded.endsWith("=")) {
    encoded = encoded.slice(0, encoded.length - 1);
  }
  return encoded;
}
