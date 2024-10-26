import {
  JSONBigInt,
  JSONPODBooleanValue,
  JSONPODEntries,
  JSONPODValue,
  POD_INT_MAX,
  POD_INT_MIN,
  PODBooleanValue,
  PODEntries,
  PODName,
  PODValue
} from "@pcd/pod";
import { expect } from "chai";
import "mocha";
import {
  GPCBoundConfig,
  GPCClosedInterval,
  GPCIdentifier,
  GPCProofConfig,
  GPCProofEntryConfig,
  GPCProofEntryConfigCommon,
  GPCProofObjectConfig,
  GPCProofTupleConfig,
  GPCRevealedClaims,
  GPCRevealedObjectClaims,
  JSONPODMembershipLists,
  JSONRevealedClaims,
  PODEntryIdentifier,
  PODMembershipLists,
  SEMAPHORE_V3
} from "../src";
import {
  ValibotBigInt,
  ValibotBoundConfig,
  ValibotCircuitIdentifier,
  ValibotClosedInterval,
  ValibotMembershipLists,
  ValibotPODEntries,
  ValibotPODEntryIdentifier,
  ValibotPODName,
  ValibotPODValue,
  ValibotProofConfig,
  ValibotProofEntryConfig,
  ValibotProofEntryConfigCommon,
  ValibotProofObjectConfig,
  ValibotProofTupleConfig,
  ValibotRevealedClaims,
  ValibotRevealedObjectClaims
} from "../src/gpcValibot";

describe("gpcValibot value types should work", () => {
  it("PODName conversion", () => {
    const tsToJSON: [PODName, boolean][] = [
      ["hello", true],
      ["_foo123", true],
      ["_1", true],
      ["123_a", false],
      ["abc!@#$%^&*", false],
      [undefined as unknown as PODName, false],
      [123 as unknown as PODName, false]
    ];
    for (const [strVal, isValid] of tsToJSON) {
      if (isValid) {
        expect(ValibotPODName.toJSON(strVal)).to.eq(strVal);
        expect(ValibotPODName.fromJSON(strVal)).to.eq(strVal);
      } else {
        expect(() => ValibotPODName.toJSON(strVal)).to.throw();
        expect(() => ValibotPODName.fromJSON(strVal)).to.throw();
      }
    }
  });

  it("PODEntryIdentifier conversion", () => {
    const tsToJSON: [PODEntryIdentifier, boolean][] = [
      ["hello.there", true],
      ["_foo123.$signerPublicKey", true],
      ["_1.$contentID", true],
      ["_1.$_2", false],
      ["hello.123_a", false],
      ["abc!@#$%^&*.hello", false],
      [undefined as unknown as PODEntryIdentifier, false],
      [123 as unknown as PODEntryIdentifier, false]
    ];
    for (const [strVal, isValid] of tsToJSON) {
      if (isValid) {
        expect(ValibotPODEntryIdentifier.toJSON(strVal)).to.eq(strVal);
        expect(ValibotPODEntryIdentifier.fromJSON(strVal)).to.eq(strVal);
      } else {
        expect(() => ValibotPODEntryIdentifier.toJSON(strVal)).to.throw();
        expect(() => ValibotPODEntryIdentifier.fromJSON(strVal)).to.throw();
      }
    }
  });

  it("GPCIdentifier conversion", () => {
    const tsToJSON: [GPCIdentifier, boolean][] = [
      ["hello_there", true],
      ["proto-pod-gpc_3o-10e-8md-4nv-2ei-4x20l-5x3t-1ov3-1ov4", true],
      ["1_$contentID", true],
      ["hello" as unknown as GPCIdentifier, false],
      [undefined as unknown as GPCIdentifier, false],
      [123 as unknown as GPCIdentifier, false]
    ];
    for (const [strVal, isValid] of tsToJSON) {
      if (isValid) {
        expect(ValibotCircuitIdentifier.toJSON(strVal)).to.eq(strVal);
        expect(ValibotCircuitIdentifier.fromJSON(strVal)).to.eq(strVal);
      } else {
        expect(() => ValibotCircuitIdentifier.toJSON(strVal)).to.throw();
        expect(() => ValibotCircuitIdentifier.fromJSON(strVal)).to.throw();
      }
    }
  });

  it("bigint conversion", () => {
    const tsToJSON: [bigint, JSONBigInt, boolean][] = [
      [0n, 0, true],
      [123n, 123, true],
      [-123n, -123, true],
      [
        0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdefn,
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        true
      ],
      [
        -0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdefn,
        "-8234104122482341265491137074636836252947884782870784360943022469005013929455",
        true
      ],
      [undefined as unknown as bigint, undefined as unknown as number, false],
      ["hello" as unknown as bigint, "hello", false]
    ];
    for (const [tsVal, jsVal, isValid] of tsToJSON) {
      if (isValid) {
        expect(ValibotBigInt.toJSON(tsVal)).to.eq(jsVal);
        expect(ValibotBigInt.fromJSON(jsVal)).to.eq(tsVal);
      } else {
        expect(() => ValibotBigInt.toJSON(tsVal)).to.throw();
        expect(() => ValibotBigInt.fromJSON(jsVal)).to.throw();
      }
    }
  });

  it("PODValue conversion", () => {
    const tsToJSON: [PODValue, JSONPODValue, boolean][] = [
      [{ type: "string", value: "hello" }, "hello", true],
      [
        { type: "bytes", value: new Uint8Array([1, 2, 3]) },
        { bytes: "AQID" },
        true
      ],
      [{ type: "int", value: 0n }, 0, true],
      [{ type: "cryptographic", value: 123n }, { cryptographic: 123 }, true],
      [{ type: "int", value: -123n }, -123, true],
      [
        {
          type: "cryptographic",
          value:
            0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdefn
        },
        {
          cryptographic:
            "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        },
        true
      ],
      [
        {
          type: "cryptographic",
          value:
            -0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdefn
        },
        {
          cryptographic:
            "-8234104122482341265491137074636836252947884782870784360943022469005013929455"
        },
        false
      ],
      [{ type: "boolean", value: true }, true, true],
      [
        { type: "boolean", value: 1n } as unknown as PODBooleanValue,
        { bool: 1n } as unknown as JSONPODBooleanValue,
        false
      ],
      [
        {
          type: "eddsa_pubkey",
          value:
            "c433f7a696b7aa3a5224efb3993baf0ccd9e92eecee0c29a3f6c8208a9e81d9e"
        },
        {
          eddsa_pubkey:
            "c433f7a696b7aa3a5224efb3993baf0ccd9e92eecee0c29a3f6c8208a9e81d9e"
        },
        true
      ],
      [
        {
          type: "eddsa_pubkey",
          value: "hello"
        },
        {
          eddsa_pubkey: "hello"
        },
        false
      ],
      [
        {
          type: "date",
          value: new Date("2024-10-25T04:01:00.638Z")
        },
        {
          date: "2024-10-25T04:01:00.638Z"
        },
        true
      ],
      [
        {
          type: "date",
          value: new Date("2024Z")
        },
        {
          date: "2024-01-01T00:00:00.000Z"
        },
        true
      ],
      [{ type: "null", value: null }, null, true],
      [undefined as unknown as PODValue, undefined as unknown as number, false],
      [
        { type: "bad", value: "bad" } as unknown as PODValue,
        { string: 123 } as unknown as JSONPODValue,
        false
      ]
    ];
    for (const [tsVal, jsVal, isValid] of tsToJSON) {
      if (isValid) {
        expect(ValibotPODValue.toJSON(tsVal)).to.deep.eq(jsVal);
        expect(ValibotPODValue.fromJSON(jsVal)).to.deep.eq(tsVal);
      } else {
        expect(() => ValibotPODValue.toJSON(tsVal)).to.throw();
        expect(() => ValibotPODValue.fromJSON(jsVal)).to.throw();
      }
    }
  });

  it("PODEntries conversion", () => {
    const tsToJSON: [PODEntries, JSONPODEntries, boolean][] = [
      [
        undefined as unknown as PODEntries,
        undefined as unknown as JSONPODEntries,
        false
      ],
      [{}, {}, true],
      [{ foo: { type: "string", value: "hello" } }, { foo: "hello" }, true],
      [
        {
          foo: { type: "string", value: "hello" },
          bar: { type: "int", value: 123n }
        },
        { foo: "hello", bar: 123 },
        true
      ],
      [
        { "!@#$%": { type: "string", value: "hello" } },
        { "!@#$%": "hello" },
        false
      ],
      [
        { foo: { type: "int", value: "hello" } } as unknown as PODEntries,
        { foo: { int: "hello" } } as unknown as JSONPODEntries,
        false
      ]
    ];

    for (const [tsVal, jsVal, isValid] of tsToJSON) {
      if (isValid) {
        const jsOut = ValibotPODEntries.toJSON(tsVal);
        expect(jsOut).to.deep.eq(jsVal);
        const jsDeserialized = JSON.parse(JSON.stringify(jsOut));
        expect(jsDeserialized).to.deep.eq(jsOut);
        const tsOut = ValibotPODEntries.fromJSON(jsDeserialized);
        expect(tsOut).to.deep.equals(tsVal);
      } else {
        expect(() => ValibotPODEntries.toJSON(tsVal)).to.throw();
        expect(() => ValibotPODEntries.fromJSON(jsVal)).to.throw();
      }
    }
  });
});

describe("gpcValibot config object type conversions should work", () => {
  it("ClosedInterval conversion", () => {
    const tsIn = { min: 123n, max: 456n } as unknown as GPCClosedInterval;

    const jsOut = ValibotClosedInterval.toJSON(tsIn);
    const jsDeserialized = JSON.parse(JSON.stringify(jsOut));
    expect(jsDeserialized).to.deep.eq(jsOut);
    const tsOut = ValibotClosedInterval.fromJSON(jsDeserialized);
    expect(tsOut).to.deep.equals(tsIn);
  });

  it("GPCProofEntryConfigCommon conversion", () => {
    const tsToJSON: [
      GPCProofEntryConfigCommon,
      ValibotProofEntryConfigCommon.JSONType,
      boolean
    ][] = [
      [
        undefined as unknown as GPCProofEntryConfigCommon,
        undefined as unknown as ValibotProofEntryConfigCommon.JSONType,
        false
      ],
      [
        {} as unknown as GPCProofEntryConfigCommon,
        {} as unknown as ValibotProofEntryConfigCommon.JSONType,
        false
      ],
      [{ isRevealed: false }, { isRevealed: false }, true],
      [
        {
          isRevealed: false,
          equalsEntry: "foo.bar",
          notEqualsEntry: "foo.baz",
          isMemberOf: "list1",
          isNotMemberOf: "list2"
        },
        {
          isRevealed: false,
          equalsEntry: "foo.bar",
          notEqualsEntry: "foo.baz",
          isMemberOf: "list1",
          isNotMemberOf: "list2"
        },
        true
      ],
      [
        {
          isRevealed: false,
          isOwnerId: SEMAPHORE_V3
        } as unknown as GPCProofEntryConfigCommon,
        {
          isRevealed: false,
          isOwnerId: SEMAPHORE_V3
        } as unknown as ValibotProofEntryConfigCommon.JSONType,
        false
      ]
    ];

    for (const [tsVal, jsVal, isValid] of tsToJSON) {
      if (isValid) {
        const jsOut = ValibotProofEntryConfigCommon.toJSON(tsVal);
        expect(jsOut).to.deep.eq(jsVal);
        const jsDeserialized = JSON.parse(JSON.stringify(jsOut));
        expect(jsDeserialized).to.deep.eq(jsOut);
        const tsOut = ValibotProofEntryConfigCommon.fromJSON(jsDeserialized);
        expect(tsOut).to.deep.equals(tsVal);
      } else {
        expect(() => ValibotProofEntryConfigCommon.toJSON(tsVal)).to.throw();
        expect(() => ValibotProofEntryConfigCommon.fromJSON(jsVal)).to.throw();
      }
    }
  });

  it("GPCProofEntryConfig conversion", () => {
    const tsToJSON: [
      GPCProofEntryConfig,
      ValibotProofEntryConfig.JSONType,
      boolean
    ][] = [
      [
        undefined as unknown as GPCProofEntryConfigCommon,
        undefined as unknown as ValibotProofEntryConfigCommon.JSONType,
        false
      ],
      [
        {} as unknown as GPCProofEntryConfigCommon,
        {} as unknown as ValibotProofEntryConfigCommon.JSONType,
        false
      ],
      [{ isRevealed: false }, { isRevealed: false }, true],
      [
        {
          isRevealed: false,
          isOwnerID: SEMAPHORE_V3,
          equalsEntry: "foo.bar",
          notEqualsEntry: "foo.baz",
          inRange: { min: POD_INT_MIN, max: POD_INT_MAX },
          notInRange: { min: -123n, max: 123n },
          isMemberOf: "list1",
          isNotMemberOf: "list2",
          lessThan: "foo.bar1",
          lessThanEq: "foo.bar2",
          greaterThan: "foo.bar3",
          greaterThanEq: "foo.bar4"
        },
        {
          isRevealed: false,
          isOwnerID: SEMAPHORE_V3,
          equalsEntry: "foo.bar",
          notEqualsEntry: "foo.baz",
          inRange: {
            min: POD_INT_MIN.toString(),
            max: "0x" + POD_INT_MAX.toString(16)
          },
          notInRange: { min: -123, max: 123 },
          isMemberOf: "list1",
          isNotMemberOf: "list2",
          lessThan: "foo.bar1",
          lessThanEq: "foo.bar2",
          greaterThan: "foo.bar3",
          greaterThanEq: "foo.bar4"
        },
        true
      ],
      [
        {
          isRevealed: false,
          extraField: true
        } as unknown as GPCProofEntryConfigCommon,
        {
          isRevealed: false,
          extraField: true
        } as unknown as ValibotProofEntryConfigCommon.JSONType,
        false
      ]
    ];

    for (const [tsVal, jsVal, isValid] of tsToJSON) {
      if (isValid) {
        const jsOut = ValibotProofEntryConfig.toJSON(tsVal);
        expect(jsOut).to.deep.eq(jsVal);
        const jsDeserialized = JSON.parse(JSON.stringify(jsOut));
        expect(jsDeserialized).to.deep.eq(jsOut);
        const tsOut = ValibotProofEntryConfig.fromJSON(jsDeserialized);
        expect(tsOut).to.deep.equals(tsVal);
      } else {
        expect(() => ValibotProofEntryConfig.toJSON(tsVal)).to.throw();
        expect(() => ValibotProofEntryConfig.fromJSON(jsVal)).to.throw();
      }
    }
  });

  it("GPCProofObjectConfig conversion", () => {
    const tsToJSON: [
      GPCProofObjectConfig,
      ValibotProofObjectConfig.JSONType,
      boolean
    ][] = [
      [
        undefined as unknown as GPCProofObjectConfig,
        undefined as unknown as ValibotProofObjectConfig.JSONType,
        false
      ],
      [
        {} as unknown as GPCProofObjectConfig,
        {} as unknown as ValibotProofObjectConfig.JSONType,
        false
      ],
      [{ entries: {} }, { entries: {} }, true],
      [
        { entries: {}, contentID: {} } as unknown as GPCProofObjectConfig,
        {
          entries: {},
          contentID: {}
        } as unknown as ValibotProofObjectConfig.JSONType,
        false
      ],
      [
        { entries: {}, signerPublicKey: {} } as unknown as GPCProofObjectConfig,
        {
          entries: {},
          signerPublicKey: {}
        } as unknown as ValibotProofObjectConfig.JSONType,
        false
      ],
      [
        {
          entries: { foo: { isRevealed: true } },
          contentID: { isRevealed: true },
          signerPublicKey: { isRevealed: true }
        },
        {
          entries: { foo: { isRevealed: true } },
          contentID: { isRevealed: true },
          signerPublicKey: { isRevealed: true }
        },
        true
      ],
      [
        {
          entries: {
            foo: {
              isRevealed: false,
              isOwnerID: SEMAPHORE_V3,
              equalsEntry: "foo.bar",
              notEqualsEntry: "foo.baz",
              inRange: { min: POD_INT_MIN, max: POD_INT_MAX },
              notInRange: { min: -123n, max: 123n },
              isMemberOf: "list1",
              isNotMemberOf: "list2",
              lessThan: "foo.bar1",
              lessThanEq: "foo.bar2",
              greaterThan: "foo.bar3",
              greaterThanEq: "foo.bar4"
            },
            bar: { isRevealed: false }
          }
        },
        {
          entries: {
            foo: {
              isRevealed: false,
              isOwnerID: SEMAPHORE_V3,
              equalsEntry: "foo.bar",
              notEqualsEntry: "foo.baz",
              inRange: {
                min: POD_INT_MIN.toString(),
                max: "0x" + POD_INT_MAX.toString(16)
              },
              notInRange: { min: -123, max: 123 },
              isMemberOf: "list1",
              isNotMemberOf: "list2",
              lessThan: "foo.bar1",
              lessThanEq: "foo.bar2",
              greaterThan: "foo.bar3",
              greaterThanEq: "foo.bar4"
            },
            bar: { isRevealed: false }
          }
        },
        true
      ],
      [
        {
          entries: {},
          contentID: {
            isRevealed: false,
            isOwnerID: true
          }
        } as unknown as GPCProofObjectConfig,
        {
          entries: {},
          contentID: {
            isRevealed: false,
            isOwnerID: true
          }
        } as unknown as ValibotProofObjectConfig.JSONType,
        false
      ]
    ];

    for (const [tsVal, jsVal, isValid] of tsToJSON) {
      if (isValid) {
        const jsOut = ValibotProofObjectConfig.toJSON(tsVal);
        expect(jsOut).to.deep.eq(jsVal);
        const jsDeserialized = JSON.parse(JSON.stringify(jsOut));
        expect(jsDeserialized).to.deep.eq(jsOut);
        const tsOut = ValibotProofObjectConfig.fromJSON(jsDeserialized);
        expect(tsOut).to.deep.equals(tsVal);
      } else {
        expect(() => ValibotProofObjectConfig.toJSON(tsVal)).to.throw();
        expect(() => ValibotProofObjectConfig.fromJSON(jsVal)).to.throw();
      }
    }
  });

  it("GPCProofTupleConfig conversion", () => {
    const tsToJSON: [
      GPCProofTupleConfig,
      ValibotProofTupleConfig.JSONType,
      boolean
    ][] = [
      [
        undefined as unknown as GPCProofTupleConfig,
        undefined as unknown as ValibotProofTupleConfig.JSONType,
        false
      ],
      [
        {} as unknown as GPCProofTupleConfig,
        {} as unknown as ValibotProofTupleConfig.JSONType,
        false
      ],
      [{ entries: [] }, { entries: [] }, true],
      [
        {
          entries: ["foo.bar", "baz.quux", "quam.$contentID"],
          isMemberOf: "list1",
          isNotMemberOf: "list2"
        },
        {
          entries: ["foo.bar", "baz.quux", "quam.$contentID"],
          isMemberOf: "list1",
          isNotMemberOf: "list2"
        },
        true
      ],
      [
        {
          entries: ["@!#$.foo"]
        },
        {
          entries: ["@!#$.foo"]
        },
        false
      ],
      [
        {
          entries: ["foo.bar"],
          isMemberOf: "123",
          isNotMemberOf: "!@#$"
        },
        {
          entries: ["foo.bar"],
          isMemberOf: "123",
          isNotMemberOf: "!@#$"
        },
        false
      ]
    ];

    for (const [tsVal, jsVal, isValid] of tsToJSON) {
      if (isValid) {
        const jsOut = ValibotProofTupleConfig.toJSON(tsVal);
        expect(jsOut).to.deep.eq(jsVal);
        const jsDeserialized = JSON.parse(JSON.stringify(jsOut));
        expect(jsDeserialized).to.deep.eq(jsOut);
        const tsOut = ValibotProofTupleConfig.fromJSON(jsDeserialized);
        expect(tsOut).to.deep.equals(tsVal);
      } else {
        expect(() => ValibotProofTupleConfig.toJSON(tsVal)).to.throw();
        expect(() => ValibotProofTupleConfig.fromJSON(jsVal)).to.throw();
      }
    }
  });

  it("GPCProofConfig conversion", () => {
    const tsToJSON: [GPCProofConfig, ValibotProofConfig.JSONType, boolean][] = [
      [
        undefined as unknown as GPCProofConfig,
        undefined as unknown as ValibotProofConfig.JSONType,
        false
      ],
      [
        {} as unknown as GPCProofConfig,
        {} as unknown as ValibotProofConfig.JSONType,
        false
      ],
      [{ pods: {} }, { pods: {} }, true],
      [
        {
          circuitIdentifier: "foo_bar",
          pods: {},
          uniquePODs: true,
          tuples: {}
        },
        {
          circuitIdentifier: "foo_bar",
          pods: {},
          uniquePODs: true,
          tuples: {}
        },
        true
      ],
      [
        { pods: {}, circuitIdentifier: "bad" } as unknown as GPCProofConfig,
        {
          pods: {},
          circuitIdentifier: "bad"
        } as unknown as ValibotProofConfig.JSONType,
        false
      ],
      [
        {
          pods: {
            foo: { entries: { foo1: { isRevealed: true } } },
            bar: {
              entries: { bar1: { isRevealed: false } },
              contentID: { isRevealed: true }
            }
          },
          uniquePODs: true,
          tuples: {
            t1: {
              entries: ["foo.foo1", "bar.bar1"],
              isMemberOf: "list1",
              isNotMemberOf: "list2"
            }
          }
        },
        {
          pods: {
            foo: { entries: { foo1: { isRevealed: true } } },
            bar: {
              entries: { bar1: { isRevealed: false } },
              contentID: { isRevealed: true }
            }
          },
          uniquePODs: true,
          tuples: {
            t1: {
              entries: ["foo.foo1", "bar.bar1"],
              isMemberOf: "list1",
              isNotMemberOf: "list2"
            }
          }
        },
        true
      ],
      [
        {
          pods: { "123": { entries: {} } }
        },
        {
          pods: { "123": { entries: {} } }
        },
        false
      ],
      [
        {
          pods: {},
          uniquePODs: 123
        } as unknown as GPCProofConfig,
        {
          pods: {},
          uniquePODs: 123
        } as unknown as ValibotProofConfig.JSONType,
        false
      ],
      [
        {
          pods: {},
          tuples: ["foo.bar"]
        } as unknown as GPCProofConfig,
        {
          pods: {},
          tuples: ["foo.bar"]
        } as unknown as ValibotProofConfig.JSONType,
        false
      ]
    ];

    for (const [tsVal, jsVal, isValid] of tsToJSON) {
      if (isValid) {
        const jsOut = ValibotProofConfig.toJSON(tsVal);
        expect(jsOut).to.deep.eq(jsVal);
        const jsDeserialized = JSON.parse(JSON.stringify(jsOut));
        expect(jsDeserialized).to.deep.eq(jsOut);
        const tsOut = ValibotProofConfig.fromJSON(jsDeserialized);
        expect(tsOut).to.deep.equals(tsVal);
      } else {
        expect(() => ValibotProofConfig.toJSON(tsVal)).to.throw();
        expect(() => ValibotProofConfig.fromJSON(jsVal)).to.throw();
      }
    }
  });

  it("GPCBoundConfig conversion", () => {
    const tsToJSON: [GPCBoundConfig, ValibotBoundConfig.JSONType, boolean][] = [
      [
        undefined as unknown as GPCBoundConfig,
        undefined as unknown as ValibotBoundConfig.JSONType,
        false
      ],
      [
        {} as unknown as GPCBoundConfig,
        {} as unknown as ValibotBoundConfig.JSONType,
        false
      ],
      [
        { circuitIdentifier: "foo_bar", pods: {} },
        { circuitIdentifier: "foo_bar", pods: {} },
        true
      ],
      [
        {
          circuitIdentifier: "foo_bar",
          pods: {},
          uniquePODs: true,
          tuples: {}
        },
        {
          circuitIdentifier: "foo_bar",
          pods: {},
          uniquePODs: true,
          tuples: {}
        },
        true
      ],
      [
        { pods: {}, circuitIdentifier: "bad" } as unknown as GPCBoundConfig,
        {
          pods: {},
          circuitIdentifier: "bad"
        } as unknown as ValibotBoundConfig.JSONType,
        false
      ],
      [
        {
          circuitIdentifier: "foo_bar",
          pods: {
            foo: { entries: { foo1: { isRevealed: true } } },
            bar: {
              entries: { bar1: { isRevealed: false } },
              contentID: { isRevealed: true }
            }
          },
          uniquePODs: true,
          tuples: {
            t1: {
              entries: ["foo.foo1", "bar.bar1"],
              isMemberOf: "list1",
              isNotMemberOf: "list2"
            }
          }
        },
        {
          circuitIdentifier: "foo_bar",
          pods: {
            foo: { entries: { foo1: { isRevealed: true } } },
            bar: {
              entries: { bar1: { isRevealed: false } },
              contentID: { isRevealed: true }
            }
          },
          uniquePODs: true,
          tuples: {
            t1: {
              entries: ["foo.foo1", "bar.bar1"],
              isMemberOf: "list1",
              isNotMemberOf: "list2"
            }
          }
        },
        true
      ],
      [
        {
          circuitIdentifier: "foo_bar",
          pods: { "123": { entries: {} } }
        },
        {
          circuitIdentifier: "foo_bar",
          pods: { "123": { entries: {} } }
        },
        false
      ],
      [
        {
          circuitIdentifier: "foo_bar",
          pods: {},
          uniquePODs: 123
        } as unknown as GPCBoundConfig,
        {
          circuitIdentifier: "foo_bar",
          pods: {},
          uniquePODs: 123
        } as unknown as ValibotBoundConfig.JSONType,
        false
      ],
      [
        {
          circuitIdentifier: "foo_bar",
          pods: {},
          tuples: ["foo.bar"]
        } as unknown as GPCBoundConfig,
        {
          circuitIdentifier: "foo_bar",
          pods: {},
          tuples: ["foo.bar"]
        } as unknown as ValibotBoundConfig.JSONType,
        false
      ]
    ];

    for (const [tsVal, jsVal, isValid] of tsToJSON) {
      if (isValid) {
        const jsOut = ValibotProofConfig.toJSON(tsVal);
        expect(jsOut).to.deep.eq(jsVal);
        const jsDeserialized = JSON.parse(JSON.stringify(jsOut));
        expect(jsDeserialized).to.deep.eq(jsOut);
        const tsOut = ValibotProofConfig.fromJSON(jsDeserialized);
        expect(tsOut).to.deep.equals(tsVal);
      } else {
        expect(() => ValibotProofConfig.toJSON(tsVal)).to.throw();
        expect(() => ValibotProofConfig.fromJSON(jsVal)).to.throw();
      }
    }
  });
});

describe("gpcValibot revealed object type conversions should work", () => {
  it("PODMembershipLists conversion", () => {
    const tsToJSON: [PODMembershipLists, JSONPODMembershipLists, boolean][] = [
      [
        undefined as unknown as PODMembershipLists,
        undefined as unknown as JSONPODMembershipLists,
        false
      ],
      [{}, {}, true],
      [{ list1: [], list2: [] }, { list1: [], list2: [] }, true],
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
        },
        true
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
        },
        true
      ],
      [
        null as unknown as PODMembershipLists,
        null as unknown as JSONPODMembershipLists,
        false
      ],
      [
        "hello" as unknown as PODMembershipLists,
        "hello" as unknown as JSONPODMembershipLists,
        false
      ],
      [
        [1, 2, 3] as unknown as PODMembershipLists,
        [1, 2, 3] as unknown as JSONPODMembershipLists,
        false
      ],
      [
        { list: undefined } as unknown as PODMembershipLists,
        { list: undefined } as unknown as JSONPODMembershipLists,
        false
      ],
      [
        { list: null } as unknown as PODMembershipLists,
        { list: null } as unknown as JSONPODMembershipLists,
        false
      ],
      [
        { list: "hello" } as unknown as PODMembershipLists,
        { list: "hello" } as unknown as JSONPODMembershipLists,
        false
      ],
      [
        { list: {} } as unknown as PODMembershipLists,
        { list: {} } as unknown as JSONPODMembershipLists,
        false
      ],
      [
        { list: [undefined] } as unknown as PODMembershipLists,
        { list: [undefined] } as unknown as JSONPODMembershipLists,
        false
      ],
      [
        {
          list: [{ type: "wrongType", value: 123n }]
        } as unknown as PODMembershipLists,
        { list: [{ wrongType: 123 }] } as unknown as JSONPODMembershipLists,
        false
      ],
      [
        { list: [{ type: "int", value: POD_INT_MAX + 1n }] },
        { list: [Number(POD_INT_MAX + 1n)] },
        false
      ]
    ];

    for (const [tsVal, jsVal, isValid] of tsToJSON) {
      if (isValid) {
        const jsOut = ValibotMembershipLists.toJSON(tsVal);
        expect(jsOut).to.deep.eq(jsVal);
        const jsDeserialized = JSON.parse(JSON.stringify(jsOut));
        expect(jsDeserialized).to.deep.eq(jsOut);
        const tsOut = ValibotMembershipLists.fromJSON(jsDeserialized);
        expect(tsOut).to.deep.equals(tsVal);
      } else {
        expect(() => ValibotMembershipLists.toJSON(tsVal)).to.throw();
        expect(() => ValibotMembershipLists.fromJSON(jsVal)).to.throw();
      }
    }
  });

  it("GPCRevealedObjectClaims conversion", () => {
    const tsToJSON: [
      GPCRevealedObjectClaims,
      ValibotRevealedObjectClaims.JSONType,
      boolean
    ][] = [
      [
        undefined as unknown as GPCRevealedObjectClaims,
        undefined as unknown as ValibotRevealedObjectClaims.JSONType,
        false
      ],
      [{}, {}, true],
      [
        {
          entries: {},
          contentID:
            18003549444852780886592139349318927700964545643704389119309344945101355208480n,
          signerPublicKey: "xDP3ppa3qjpSJO+zmTuvDM2eku7O4MKaP2yCCKnoHZ4"
        },
        {
          entries: {},
          contentID:
            "0x27cda5db59bc5d2d7c5e40f5cd563556c062823ff4dcb161e92c160de65dcf20",
          signerPublicKey: "xDP3ppa3qjpSJO+zmTuvDM2eku7O4MKaP2yCCKnoHZ4"
        },
        true
      ],
      [
        {
          entries: { "!@#$": { type: "int", value: 0n } }
        },
        {
          entries: { "!@#$": 0 }
        },
        false
      ],
      [
        {
          contentID: 0 as unknown as bigint
        },
        {
          contentID: 0n as unknown as number
        },
        false
      ],
      [
        {
          signerPublicKey: 0 as unknown as string
        },
        {
          signerPublicKey: 0n as unknown as string
        },
        false
      ]
    ];

    for (const [tsVal, jsVal, isValid] of tsToJSON) {
      if (isValid) {
        const jsOut = ValibotRevealedObjectClaims.toJSON(tsVal);
        expect(jsOut).to.deep.eq(jsVal);
        const jsDeserialized = JSON.parse(JSON.stringify(jsOut));
        expect(jsDeserialized).to.deep.eq(jsOut);
        const tsOut = ValibotRevealedObjectClaims.fromJSON(jsDeserialized);
        expect(tsOut).to.deep.equals(tsVal);
      } else {
        expect(() => ValibotRevealedObjectClaims.toJSON(tsVal)).to.throw();
        expect(() => ValibotRevealedObjectClaims.fromJSON(jsVal)).to.throw();
      }
    }
  });

  it("GPCRevealedClaims conversion", () => {
    const tsToJSON: [GPCRevealedClaims, JSONRevealedClaims, boolean][] = [
      [
        undefined as unknown as GPCRevealedClaims,
        undefined as unknown as JSONRevealedClaims,
        false
      ],
      [
        {} as unknown as GPCRevealedClaims,
        {} as unknown as JSONRevealedClaims,
        false
      ],
      [{ pods: {} }, { pods: {} }, true],
      [
        { pods: {}, owner: {} } as unknown as GPCRevealedClaims,
        { pods: {}, owner: {} } as unknown as JSONRevealedClaims,
        false
      ],
      [
        { pods: {}, owner: { externalNullifier: { type: "int", value: 0n } } },
        { pods: {}, owner: { externalNullifier: 0 } },
        true
      ],
      [
        {
          pods: {},
          owner: { externalNullifier: { type: "bad", value: 0n } }
        } as unknown as GPCRevealedClaims,
        {
          pods: {},
          owner: { externalNullifier: 0n }
        } as unknown as JSONRevealedClaims,
        false
      ],
      [
        {
          extra: true,
          pods: {},
          owner: { externalNullifier: { type: "int", value: 0n } }
        } as unknown as GPCRevealedClaims,
        {
          extra: true,
          pods: {},
          owner: { externalNullifier: 0 }
        } as unknown as JSONRevealedClaims,
        false
      ],
      [
        {
          pods: {
            foo: {
              entries: {},
              contentID:
                18003549444852780886592139349318927700964545643704389119309344945101355208480n,
              signerPublicKey: "xDP3ppa3qjpSJO+zmTuvDM2eku7O4MKaP2yCCKnoHZ4"
            }
          },
          owner: {
            externalNullifier: { type: "string", value: "hello" },
            nullifierHashV3: 0n,
            nullifierHashV4: 0n
          },
          membershipLists: {
            vlist: [{ type: "int", value: 1n }],
            tlist: [[{ type: "string", value: "hello" }]]
          },
          watermark: { type: "string", value: "watermark" }
        },
        {
          pods: {
            foo: {
              entries: {},
              contentID:
                "0x27cda5db59bc5d2d7c5e40f5cd563556c062823ff4dcb161e92c160de65dcf20",
              signerPublicKey: "xDP3ppa3qjpSJO+zmTuvDM2eku7O4MKaP2yCCKnoHZ4"
            }
          },
          owner: {
            externalNullifier: "hello",
            nullifierHashV3: 0,
            nullifierHashV4: 0
          },
          membershipLists: {
            vlist: [1],
            tlist: [["hello"]]
          },
          watermark: "watermark"
        },
        true
      ]
    ];

    for (const [tsVal, jsVal, isValid] of tsToJSON) {
      if (isValid) {
        const jsOut = ValibotRevealedClaims.toJSON(tsVal);
        expect(jsOut).to.deep.eq(jsVal);
        const jsDeserialized = JSON.parse(JSON.stringify(jsOut));
        expect(jsDeserialized).to.deep.eq(jsOut);
        const tsOut = ValibotRevealedClaims.fromJSON(jsDeserialized);
        expect(tsOut).to.deep.equals(tsVal);
      } else {
        expect(() => ValibotRevealedClaims.toJSON(tsVal)).to.throw();
        expect(() => ValibotRevealedClaims.fromJSON(jsVal)).to.throw();
      }
    }
  });
});
