import { Identity } from "@semaphore-protocol/identity";

// Key borrowed from https://github.com/iden3/circomlibjs/blob/4f094c5be05c1f0210924a3ab204d8fd8da69f49/test/eddsa.js#L103
export const EXAMPLE_EDDSA_PRIVATE_KEY =
  "0001020304050607080900010203040506070809000102030405060708090001";

export const EXAMPLE_POD_CONTENT = `{
  "A": 123,
  "B": 321,
  "C": "hello",
  "D": "foobar",
  "E": 123,
  "F": 4294967295,
  "G": 7,
  "H": 8,
  "I": 9,
  "J": 10,
  "owner": 18711405342588116796533073928767088921854096266145046362753928030796553161041
}`;

export const EXAMPLE_OWNER_IDENTITY = new Identity(
  '["329061722381819402313027227353491409557029289040211387019699013780657641967", "99353161014976810914716773124042455250852206298527174581112949561812190422"]'
);

export const EXAMPLE_GPC_CONFIG = `{
  "pods": {
    "pod0": {
      "entries": {
        "A": {
          "isRevealed": true
        },
        "E": {
          "isRevealed": false,
          "equalsEntry": "pod0.A"
        },
        "owner": {
          "isRevealed": false,
          "isOwnerID": true,
          "isMemberOf": "admissibleOwners"
        }
      }
    }
  },
  "tuples": {
    "tuple0": {
      "entries": ["pod0.A", "pod0.E"],
      "isMemberOf": "admissiblePairs"
    }
  }
}`;

export const EXAMPLE_MEMBERSHIP_LISTS = `{
  "admissibleOwners": [
    3,
    3472834734,
    2,
    9,
    "something",
    18711405342588116796533073928767088921854096266145046362753928030796553161041
  ],
  "admissiblePairs": [
    [0,0],
    [5,6],
    [123,123],
    ["zero", "zero"],
    [0, "one"]
  ]
}`;
