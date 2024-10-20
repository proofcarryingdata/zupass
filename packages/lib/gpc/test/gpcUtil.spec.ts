import { POD_INT_MAX, POD_INT_MIN } from "@pcd/pod";
import { expect } from "chai";
import "mocha";
import {
  GPCProofConfig,
  GPCProofEntryBoundsCheckConfig,
  GPCProofEntryConfig,
  GPCProofEntryConfigCommon,
  GPCProofEntryInequalityConfig
} from "../src";
import {
  canonicalizeBoundsCheckConfig,
  canonicalizeEntryConfig,
  canonicalizeEntryInequalityConfig,
  canonicalizePODUniquenessConfig,
  canonicalizeVirtualEntryConfig,
  numericValueConfigFromProofConfig
} from "../src/gpcUtil";

describe("Object entry configuration canonicalization should work", () => {
  it(`should work as expected on a typical POD entry configuration with isOwnerID = undefined`, () => {
    const config: GPCProofEntryConfig = {
      isNotMemberOf: "someOtherList",
      isOwnerID: undefined,
      equalsEntry: "pod0.B",
      isMemberOf: "someList",
      isRevealed: true
    };

    const canonicalizedConfig = canonicalizeEntryConfig(config);

    const expectedCanonicalizedConfig = {
      isRevealed: true,
      equalsEntry: "pod0.B",
      isMemberOf: "someList",
      isNotMemberOf: "someOtherList"
    };

    expect(canonicalizedConfig).to.deep.eq(expectedCanonicalizedConfig);
  });
  it(`should work as expected on a typical POD entry configuration with isOwnerID = "SemaphoreV3"`, () => {
    const config: GPCProofEntryConfig = {
      isNotMemberOf: "someOtherList",
      isOwnerID: "SemaphoreV3",
      equalsEntry: "pod0.B",
      isMemberOf: "someList",
      isRevealed: true
    };

    const canonicalizedConfig = canonicalizeEntryConfig(config);

    const expectedCanonicalizedConfig = {
      isRevealed: true,
      isOwnerID: "SemaphoreV3",
      equalsEntry: "pod0.B",
      isMemberOf: "someList",
      isNotMemberOf: "someOtherList"
    };

    expect(canonicalizedConfig).to.deep.eq(expectedCanonicalizedConfig);
  });
  it(`should work as expected on a typical POD entry configuration with isOwnerID = "SemaphoreV4"`, () => {
    const config: GPCProofEntryConfig = {
      isNotMemberOf: "someOtherList",
      isOwnerID: "SemaphoreV4",
      equalsEntry: "pod0.B",
      isMemberOf: "someList",
      isRevealed: true
    };

    const canonicalizedConfig = canonicalizeEntryConfig(config);

    const expectedCanonicalizedConfig = {
      isRevealed: true,
      isOwnerID: "SemaphoreV4",
      equalsEntry: "pod0.B",
      isMemberOf: "someList",
      isNotMemberOf: "someOtherList"
    };

    expect(canonicalizedConfig).to.deep.eq(expectedCanonicalizedConfig);
  });
  it("should work as expected on a POD entry configuration with bounds checks", () => {
    const config: GPCProofEntryConfig = {
      isRevealed: false,
      inRange: { min: -512n, max: 25n },
      notInRange: { min: -256n, max: -5n }
    };

    const canonicalizedConfig = canonicalizeEntryConfig(config);

    expect(canonicalizedConfig).to.deep.eq(config);
  });
  it("should work as expected on a POD entry configuration with inequality checks", () => {
    const config: GPCProofEntryConfig = {
      isRevealed: false,
      inRange: { min: -512n, max: 25n },
      notInRange: { min: -256n, max: -5n },
      lessThan: "somePOD.a",
      greaterThan: "somePOD.c",
      greaterThanEq: "somePOD.d",
      lessThanEq: "somePOD.b"
    };

    const canonicalizedConfig = canonicalizeEntryConfig(config);

    expect(canonicalizedConfig).to.deep.eq(config);
  });
});

describe("Object virtual entry configuration canonicalization should work", () => {
  it("should work as expected on a trivial configuration", () => {
    for (const defaultIsRevealed of [true, false]) {
      for (const isRevealed of [true, false]) {
        const config: GPCProofEntryConfigCommon = {
          isRevealed
        };

        const canonicalizedConfig = canonicalizeVirtualEntryConfig(
          config,
          defaultIsRevealed
        );

        expect(canonicalizedConfig).to.deep.eq(
          isRevealed === defaultIsRevealed ? undefined : config
        );
      }
    }
  });
  it("should work as expected on a typical virtual entry configuration", () => {
    for (const defaultIsRevealed of [true, false]) {
      for (const isRevealed of [true, false]) {
        const config: GPCProofEntryConfigCommon = {
          isNotMemberOf: "someOtherList",
          equalsEntry: "pod0.key",
          isMemberOf: "someList",
          isRevealed
        };

        const canonicalizedConfig = canonicalizeVirtualEntryConfig(
          config,
          defaultIsRevealed
        );

        const expectedCanonicalizedConfig = {
          isRevealed,
          equalsEntry: "pod0.key",
          isMemberOf: "someList",
          isNotMemberOf: "someOtherList"
        };

        expect(canonicalizedConfig).to.deep.eq(expectedCanonicalizedConfig);
      }
    }
  });
});

describe("Object entry bounds check canonicalization should work", () => {
  it("should work as expected in the absence of range checks", () => {
    const canonicalizedBoundsCheckConfig = canonicalizeBoundsCheckConfig(
      undefined,
      undefined
    );
    expect(canonicalizedBoundsCheckConfig).to.deep.eq({});
  });
  it("should work as expected for a simple in-range check", () => {
    const boundsCheckConfig = {
      inRange: { min: 0n, max: 27n }
    };
    const canonicalizedBoundsCheckConfig = canonicalizeBoundsCheckConfig(
      boundsCheckConfig.inRange,
      undefined
    );
    expect(canonicalizedBoundsCheckConfig).to.deep.eq(boundsCheckConfig);
  });
  it("should work as expected for a simple not-in-range check", () => {
    const boundsCheckConfig = {
      notInRange: { min: 256n, max: 8000000n }
    };
    const canonicalizedBoundsCheckConfig = canonicalizeBoundsCheckConfig(
      undefined,
      boundsCheckConfig.notInRange
    );
    expect(canonicalizedBoundsCheckConfig).to.deep.eq(boundsCheckConfig);
  });
  it("should throw for invalid intervals", () => {
    const boundsCheckConfigs = [
      { inRange: { min: 56n, max: 55n } },
      {
        notInRange: { min: 80n, max: 79n }
      },
      { inRange: { min: 52n, max: 51n }, notInRange: { min: 0n, max: 56n } },
      { inRange: { min: 0n, max: 100n }, notInRange: { min: 57n, max: 56n } }
    ];
    for (const boundsCheckConfig of boundsCheckConfigs) {
      expect(() =>
        canonicalizeBoundsCheckConfig(
          boundsCheckConfig.inRange,
          boundsCheckConfig.notInRange
        )
      ).to.throw;
    }
  });
  it("should work as expected for disjoint in- and not-in-range checks", () => {
    const boundsCheckConfigs = [
      {
        inRange: { min: POD_INT_MIN, max: 2n },
        notInRange: { min: 1000n, max: POD_INT_MAX }
      },
      { inRange: { min: 0n, max: 10n }, notInRange: { min: 55n, max: 128n } },
      {
        inRange: { min: 1000n, max: POD_INT_MAX },
        notInRange: { min: POD_INT_MIN, max: 2n }
      },
      { inRange: { min: 55n, max: 128n }, notInRange: { min: 0n, max: 10n } }
    ];
    for (const boundsCheckConfig of boundsCheckConfigs) {
      const canonicalizedBoundsCheckConfig = canonicalizeBoundsCheckConfig(
        boundsCheckConfig.inRange,
        boundsCheckConfig.notInRange
      );
      expect(canonicalizedBoundsCheckConfig).to.deep.eq({
        inRange: boundsCheckConfig.inRange
      });
    }
  });
  it("should work as expected for overlapping in- and not-in-range checks", () => {
    const boundsCheckConfigPairs: [
      GPCProofEntryBoundsCheckConfig,
      GPCProofEntryBoundsCheckConfig
    ][] = [
      // Left overlap
      [
        { inRange: { min: 27n, max: 53n }, notInRange: { min: -5n, max: 27n } },
        { inRange: { min: 28n, max: 53n } }
      ],
      [
        { inRange: { min: 27n, max: 53n }, notInRange: { min: -5n, max: 30n } },
        { inRange: { min: 31n, max: 53n } }
      ],
      [
        {
          inRange: { min: 88n, max: 1000n },
          notInRange: { min: 88n, max: 88n }
        },
        { inRange: { min: 89n, max: 1000n } }
      ],
      // Right overlap
      [
        { inRange: { min: 27n, max: 53n }, notInRange: { min: 53n, max: 60n } },
        { inRange: { min: 27n, max: 52n } }
      ],
      [
        { inRange: { min: 27n, max: 53n }, notInRange: { min: 30n, max: 60n } },
        { inRange: { min: 27n, max: 29n } }
      ],
      [
        {
          inRange: { min: 88n, max: 1000n },
          notInRange: { min: 1000n, max: 1000n }
        },
        { inRange: { min: 88n, max: 999n } }
      ]
    ];
    for (const [
      boundsCheckConfig,
      expectedCanonicalizedBoundsCheckConfig
    ] of boundsCheckConfigPairs) {
      const canonicalizedBoundsCheckConfig = canonicalizeBoundsCheckConfig(
        boundsCheckConfig.inRange,
        boundsCheckConfig.notInRange
      );
      expect(canonicalizedBoundsCheckConfig).to.deep.eq(
        expectedCanonicalizedBoundsCheckConfig
      );
    }
  });
  it("should work as expected in the case where notInRange ⊂⊂ inRange or inRange ⊂ notInRange", () => {
    const boundsCheckConfigs = [
      // notInRange ⊂⊂ inRange
      {
        inRange: { min: POD_INT_MIN, max: POD_INT_MAX },
        notInRange: { min: -256n, max: -5n }
      },
      {
        inRange: { min: -55n, max: 0n },
        notInRange: { min: -42n, max: -4n }
      },
      // inRange ⊂ notInRange, which amounts to the empty set. This will be
      // caught in the 'check' phase.
      {
        inRange: { min: -256n, max: -5n },
        notInRange: { min: -256n, max: -5n }
      },
      {
        inRange: { min: -256n, max: -5n },
        notInRange: { min: POD_INT_MIN, max: POD_INT_MAX }
      },
      {
        inRange: { min: -42n, max: -4n },
        notInRange: { min: -55n, max: 0n }
      }
    ];
    for (const boundsCheckConfig of boundsCheckConfigs) {
      const canonicalizedBoundsCheckConfig = canonicalizeBoundsCheckConfig(
        boundsCheckConfig.inRange,
        boundsCheckConfig.notInRange
      );
      expect(canonicalizedBoundsCheckConfig).to.deep.eq(boundsCheckConfig);
    }
  });
});

describe("Object entry inequality check canonicalization should work", () => {
  const configs: GPCProofEntryInequalityConfig[] = [
    { lessThan: "somePOD.a" },
    { greaterThan: "somePOD.a" },
    { lessThanEq: "somePOD.a" },
    { greaterThanEq: "somePOD.a" },
    { greaterThan: "somePOD.a", lessThan: "someOtherPOD.b" },
    { lessThanEq: "somePOD.a", lessThan: "someOtherPOD.b" },
    {
      lessThanEq: "somePOD.a",
      greaterThan: "somePOD.c",
      lessThan: "someOtherPOD.b",
      greaterThanEq: "somePOD.d"
    }
  ];
  const canonicalizedConfigs: GPCProofEntryInequalityConfig[] = configs.map(
    canonicalizeEntryInequalityConfig
  );
  expect(canonicalizedConfigs).to.deep.equal(configs);
});

describe("Numeric value configuration derivation works as expected", () => {
  it("should work as expected on a proof configuration without bounds checks", () => {
    const proofConfig: GPCProofConfig = {
      pods: {
        somePod: {
          entries: {
            A: {
              isRevealed: true
            }
          }
        }
      }
    };
    const numericValueConfig = numericValueConfigFromProofConfig(proofConfig);
    expect(numericValueConfig).to.deep.eq(new Map([]));
  });
  it("should work as expected on a proof configuration with simple bounds checks", () => {
    const proofConfig: GPCProofConfig = {
      pods: {
        somePod: {
          entries: {
            A: {
              isRevealed: false, // Not relevant, but bounds checks make the
              // most sense when the entry is *not* revealed!
              inRange: { min: 0n, max: POD_INT_MAX }
            },
            B: {
              isRevealed: false,
              notInRange: { min: POD_INT_MIN, max: 87n }
            },
            C: {
              isRevealed: true
            }
          }
        },
        someOtherPod: {
          entries: {
            D: {
              isRevealed: false,
              inRange: { min: 5n, max: 25n }
            }
          }
        }
      }
    };
    const numericValueConfig = numericValueConfigFromProofConfig(proofConfig);
    expect(numericValueConfig).to.deep.eq(
      new Map([
        [
          "someOtherPod.D",
          {
            boundsCheckConfig: {
              inRange: {
                min: 5n,
                max: 25n
              }
            },
            index: 0n
          }
        ],
        [
          "somePod.A",
          {
            boundsCheckConfig: {
              inRange: {
                min: 0n,
                max: POD_INT_MAX
              }
            },
            index: 1n
          }
        ],
        [
          "somePod.B",
          {
            boundsCheckConfig: {
              notInRange: {
                min: POD_INT_MIN,
                max: 87n
              }
            },
            index: 2n
          }
        ]
      ])
    );
  });
  it("should work as expected on a proof configuration with more complex bounds checks", () => {
    const proofConfig: GPCProofConfig = {
      pods: {
        somePod: {
          entries: {
            A: {
              isRevealed: false,
              inRange: { min: 0n, max: 24n }
            }
          }
        },
        someOtherPod: {
          entries: {
            D: {
              isRevealed: false,
              inRange: { min: 5n, max: 30n }
            },
            E: {
              isRevealed: false,
              inRange: { min: -1000n, max: 20n },
              notInRange: { min: -5n, max: 4n }
            },
            F: {
              isRevealed: false,
              notInRange: { min: 100n, max: 200n }
            }
          }
        }
      }
    };
    const numericValueConfig = numericValueConfigFromProofConfig(proofConfig);
    expect(numericValueConfig).to.deep.eq(
      new Map([
        [
          "someOtherPod.D",
          {
            boundsCheckConfig: {
              inRange: {
                min: 5n,
                max: 30n
              }
            },
            index: 0n
          }
        ],
        [
          "someOtherPod.E",
          {
            boundsCheckConfig: {
              inRange: { min: -1000n, max: 20n },
              notInRange: { min: -5n, max: 4n }
            },
            index: 1n
          }
        ],
        [
          "someOtherPod.F",
          {
            boundsCheckConfig: {
              notInRange: { min: 100n, max: 200n }
            },
            index: 2n
          }
        ],
        [
          "somePod.A",
          {
            boundsCheckConfig: {
              inRange: {
                min: 0n,
                max: 24n
              }
            },
            index: 3n
          }
        ]
      ])
    );
  });
});

describe("POD uniqueness config canonicalization should work", () => {
  it("should work as expected if omitted", () => {
    expect(canonicalizePODUniquenessConfig(undefined)).to.deep.equal({});
  });
  it("should work as expected if enabled", () => {
    expect(canonicalizePODUniquenessConfig(true)).to.deep.equal({
      uniquePODs: true
    });
  });
  it("should work as expected if explicitly disabled", () => {
    expect(canonicalizePODUniquenessConfig(false)).to.deep.equal({});
  });
});

// TODO(POD-P4): More tests
