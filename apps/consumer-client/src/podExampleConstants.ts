import { podMembershipListsToJSON } from "@pcd/gpc";
import { fixedPODEntriesToJSON } from "@pcd/gpc-pcd";
import { podEntriesToJSON } from "@pcd/pod";
import { Identity } from "@semaphore-protocol/identity";

// Key borrowed from https://github.com/iden3/circomlibjs/blob/4f094c5be05c1f0210924a3ab204d8fd8da69f49/test/eddsa.js#L103
export const EXAMPLE_EDDSA_PRIVATE_KEY =
  "AAECAwQFBgcICQABAgMEBQYHCAkAAQIDBAUGBwgJAAE="; // hex 0001020304050607080900010203040506070809000102030405060708090001
export const EXAMPLE_EDDSA_PRIVATE_KEY2 =
  "AAECAwQFBgcICQABAgMEBQYHCAkAAQIDBAUGBwgJAAA="; // hex 0001020304050607080900010203040506070809000102030405060708090000

export const EXAMPLE_POD_CONTENT = JSON.stringify(
  podEntriesToJSON({
    A: { type: "int", value: 123n },
    B: { type: "int", value: 321n },
    C: { type: "string", value: "hello" },
    D: { type: "string", value: "foobar" },
    E: { type: "int", value: 123n },
    F: { type: "int", value: 4294967295n },
    G: { type: "int", value: 7n },
    H: { type: "int", value: 8n },
    I: { type: "int", value: 9n },
    J: { type: "int", value: 10n },
    K: { type: "int", value: -5n },
    owner: {
      type: "cryptographic",
      value:
        18711405342588116796533073928767088921854096266145046362753928030796553161041n
    },
    ownerV4: {
      type: "eddsa_pubkey",
      value: "1nsPGF66uuDfBnpQD+7o/9SPX7L0JDn+lubKh+QGuS8"
    }
  }),
  null,
  2
);

export const EXAMPLE_POD_CONTENT_WITH_DISPLAY = JSON.stringify(
  podEntriesToJSON({
    zupass_display: { type: "string", value: "collectable" },
    zupass_image_url: {
      type: "string",
      value:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Felis_catus-cat_on_snow.jpg/358px-Felis_catus-cat_on_snow.jpg"
    },
    zupass_title: { type: "string", value: "friendly kitty" },
    zupass_description: { type: "string", value: "friendly kitty says hello" },
    owner: {
      type: "cryptographic",
      value:
        18711405342588116796533073928767088921854096266145046362753928030796553161041n
    }
  }),
  null,
  2
);

export const EXAMPLE_OWNER_IDENTITY = new Identity(
  '["329061722381819402313027227353491409557029289040211387019699013780657641967", "99353161014976810914716773124042455250852206298527174581112949561812190422"]'
);

export const EXAMPLE_GPC_CONFIG = `{
  "pods": {
    "examplePOD": {
      "entries": {
        "A": {
          "isRevealed": true,
          "isMemberOf": "admissibleValues"
        },
        "C": {
          "isRevealed": false
        },
        "E": {
          "isRevealed": false,
          "equalsEntry": "examplePOD.A"
        },
        "F": {
          "isRevealed": false,
          "inRange": {
            "min": 38,
            "max": 5000000000
          }
        },
        "owner": {
          "isRevealed": false,
          "isOwnerID": "SemaphoreV3"
        }
      }
    },
    "cardPOD": {
      "entries": {
        "zupass_title": {
          "isRevealed": true
        }
      }
    }
  },
  "tuples": {
    "tuple0": {
      "entries": ["examplePOD.E", "examplePOD.C"],
      "isMemberOf": "admissiblePairs"
    }
  }
}`;

export const EXAMPLE_MEMBERSHIP_LISTS = JSON.stringify(
  podMembershipListsToJSON({
    admissibleValues: [
      { type: "int", value: 3n },
      { type: "int", value: 3472834734n },
      { type: "int", value: 123n },
      { type: "int", value: 9n },
      { type: "string", value: "something" },
      {
        type: "cryptographic",
        value:
          18711405342588116796533073928767088921854096266145046362753928030796553161041n
      }
    ],
    admissiblePairs: [
      [
        { type: "int", value: 0n },
        { type: "int", value: 0n }
      ],
      [
        { type: "int", value: 5n },
        { type: "int", value: 6n }
      ],
      [
        { type: "int", value: 123n },
        { type: "string", value: "hello" }
      ],
      [
        { type: "string", value: "zero" },
        { type: "string", value: "zero" }
      ],
      [
        { type: "int", value: 0n },
        { type: "string", value: "one" }
      ]
    ]
  }),
  null,
  2
);

export const EXAMPLE_PRESCRIBED_ENTRIES = JSON.stringify(
  fixedPODEntriesToJSON({
    examplePOD: {
      A: { type: "int", value: 123n }
    }
  }),
  null,
  2
);

export const EXAMPLE_PRESCRIBED_SIGNER_PUBLIC_KEYS = JSON.stringify(
  {
    examplePOD: "xDP3ppa3qjpSJO+zmTuvDM2eku7O4MKaP2yCCKnoHZ4",
    cardPOD: "su2CUR47c1us1FwPUN3RNZWzit9nmya2QD60Y/iffxI"
  },
  null,
  2
);
