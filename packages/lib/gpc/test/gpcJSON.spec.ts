import { POD_INT_MAX } from "@pcd/pod";
import { expect } from "chai";
import "mocha";
import {
  JSONPODMembershipLists,
  PODMembershipLists,
  podMembershipListsFromJSON,
  podMembershipListsToJSON
} from "../src";

describe("gpcJSON conversions should work", () => {
  const testMembershipListsInputOutput: [
    PODMembershipLists,
    JSONPODMembershipLists
  ][] = [
    [{}, {}],
    [
      { list1: [], list2: [] },
      { list1: [], list2: [] }
    ],
    [
      {
        list: [
          { type: "int", value: 1n },
          { type: "string", value: "hello" },
          {
            type: "cryptographic",
            value:
              0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdefn
          },
          {
            type: "eddsa_pubkey",
            value:
              "c433f7a696b7aa3a5224efb3993baf0ccd9e92eecee0c29a3f6c8208a9e81d9e"
          }
        ]
      },
      {
        list: [
          1,
          "hello",
          {
            cryptographic:
              "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
          },
          {
            eddsa_pubkey:
              "c433f7a696b7aa3a5224efb3993baf0ccd9e92eecee0c29a3f6c8208a9e81d9e"
          }
        ]
      }
    ],
    [
      {
        list: [
          [
            { type: "int", value: 1n },
            { type: "string", value: "hello" }
          ],
          [
            {
              type: "cryptographic",
              value:
                0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdefn
            },
            {
              type: "eddsa_pubkey",
              value:
                "c433f7a696b7aa3a5224efb3993baf0ccd9e92eecee0c29a3f6c8208a9e81d9e"
            }
          ]
        ]
      },
      {
        list: [
          [1, "hello"],
          [
            {
              cryptographic:
                "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
            },
            {
              eddsa_pubkey:
                "c433f7a696b7aa3a5224efb3993baf0ccd9e92eecee0c29a3f6c8208a9e81d9e"
            }
          ]
        ]
      }
    ]
  ];

  it("podMembershipListsFromJSON should convert valid formats", () => {
    for (const [input, output] of testMembershipListsInputOutput) {
      expect(podMembershipListsToJSON(input)).to.deep.eq(output);
    }
  });

  it("podMembershipListsFromJSON should reject invalid formats", () => {
    const badLists: [JSONPODMembershipLists, ErrorConstructor][] = [
      [undefined as unknown as JSONPODMembershipLists, TypeError],
      [null as unknown as JSONPODMembershipLists, TypeError],
      ["hello" as unknown as JSONPODMembershipLists, TypeError],
      [[1, 2, 3] as unknown as JSONPODMembershipLists, TypeError],
      [{ list: undefined } as unknown as JSONPODMembershipLists, TypeError],
      [{ list: null } as unknown as JSONPODMembershipLists, TypeError],
      [{ list: "hello" } as unknown as JSONPODMembershipLists, TypeError],
      [{ list: {} } as unknown as JSONPODMembershipLists, TypeError],
      [{ list: [undefined] } as unknown as JSONPODMembershipLists, TypeError],
      [
        { list: [{ wrongType: 123 }] } as unknown as JSONPODMembershipLists,
        TypeError
      ],
      [{ list: [Number(POD_INT_MAX + 1n)] }, RangeError]
    ];
    for (const [badInput, expectedError] of badLists) {
      const fn = (): PODMembershipLists => podMembershipListsFromJSON(badInput);
      expect(fn).to.throw(expectedError);
    }
  });

  it("podMembershipListsToJSON should convert valid formats", () => {
    for (const [output, input] of testMembershipListsInputOutput) {
      expect(podMembershipListsFromJSON(input)).to.deep.eq(output);
    }
  });

  it("podMembershipListsToJSON should reject invalid formats", () => {
    const badLists: [PODMembershipLists, ErrorConstructor][] = [
      [undefined as unknown as PODMembershipLists, TypeError],
      [null as unknown as PODMembershipLists, TypeError],
      ["hello" as unknown as PODMembershipLists, TypeError],
      [[1, 2, 3] as unknown as PODMembershipLists, TypeError],
      [{ list: undefined } as unknown as PODMembershipLists, TypeError],
      [{ list: null } as unknown as PODMembershipLists, TypeError],
      [{ list: "hello" } as unknown as PODMembershipLists, TypeError],
      [{ list: {} } as unknown as PODMembershipLists, TypeError],
      [{ list: [undefined] } as unknown as PODMembershipLists, TypeError],
      [
        {
          list: [{ type: "wrongType", value: 123n }]
        } as unknown as PODMembershipLists,
        TypeError
      ],
      [{ list: [{ type: "int", value: POD_INT_MAX + 1n }] }, RangeError]
    ];
    for (const [badInput, expectedError] of badLists) {
      const fn = (): JSONPODMembershipLists =>
        podMembershipListsToJSON(badInput);
      expect(fn).to.throw(expectedError);
    }
  });
});
