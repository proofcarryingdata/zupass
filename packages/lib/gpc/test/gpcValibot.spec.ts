import {
  JSONBigInt,
  JSONPODValue,
  POD_INT_MAX,
  POD_INT_MIN,
  PODName,
  PODValue
} from "@pcd/pod";
import { expect } from "chai";
import "mocha";
import {
  ClosedInterval,
  GPCBoundConfig,
  GPCIdentifier,
  GPCProofConfig,
  GPCProofEntryConfig,
  GPCProofEntryConfigCommon,
  GPCProofObjectConfig,
  GPCProofTupleConfig,
  PODEntryIdentifier,
  SEMAPHORE_V3
} from "../src";
import * as ValibotBigInt from "../src/valibot/bigint";
import * as ValibotBoundConfig from "../src/valibot/boundConfig";
import * as ValidbotCircuitIdentifier from "../src/valibot/circuitIdentifier";
import * as ValibotClosedInterval from "../src/valibot/closedInterval";
import * as ValibotPODEntryIdentifier from "../src/valibot/podEntryIdentifier";
import * as ValibotPODName from "../src/valibot/podName";
import * as ValibotPODValue from "../src/valibot/podValue";
import * as ValibotProofConfig from "../src/valibot/proofConfig";
import * as ValibotProofEntryConfig from "../src/valibot/proofEntryConfig";
import * as ValibotProofEntryConfigCommon from "../src/valibot/proofEntryConfigCommon";
import * as ValibotProofObjectConfig from "../src/valibot/proofObjectConfig";
import * as ValibotProofTupleConfig from "../src/valibot/proofTupleConfig";

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
        expect(ValidbotCircuitIdentifier.toJSON(strVal)).to.eq(strVal);
        expect(ValidbotCircuitIdentifier.fromJSON(strVal)).to.eq(strVal);
      } else {
        expect(() => ValidbotCircuitIdentifier.toJSON(strVal)).to.throw();
        expect(() => ValidbotCircuitIdentifier.fromJSON(strVal)).to.throw();
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
});

describe("gpcValibot object type conversions should work", () => {
  it("ClosedInterval conversion", () => {
    const tsIn = { min: 123n, max: 456n } as unknown as ClosedInterval;

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
