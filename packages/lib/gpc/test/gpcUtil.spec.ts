import { POD_INT_MAX, POD_INT_MIN } from "@pcd/pod";
import { expect } from "chai";
import "mocha";
import {
  GPCProofConfig,
  GPCProofEntryConfig,
  GPCProofEntryConfigCommon
} from "../src";
import {
  boundsCheckConfigFromProofConfig,
  canonicalizeEntryConfig,
  canonicalizeSignerPublicKeyConfig
} from "../src/gpcUtil";

describe("Object entry configuration canonicalization should work", () => {
  it("should work as expected on a typical POD entry configuration with isOwnerID = false", () => {
    const config: GPCProofEntryConfig = {
      isNotMemberOf: "someOtherList",
      isOwnerID: false,
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
  it("should work as expected on a typical POD entry configuration with isOwnerID = true", () => {
    const config: GPCProofEntryConfig = {
      isNotMemberOf: "someOtherList",
      isOwnerID: true,
      equalsEntry: "pod0.B",
      isMemberOf: "someList",
      isRevealed: true
    };

    const canonicalizedConfig = canonicalizeEntryConfig(config);

    const expectedCanonicalizedConfig = {
      isRevealed: true,
      isOwnerID: true,
      equalsEntry: "pod0.B",
      isMemberOf: "someList",
      isNotMemberOf: "someOtherList"
    };

    expect(canonicalizedConfig).to.deep.eq(expectedCanonicalizedConfig);
  });
});

describe("Object signer's public key configuration canonicalization should work", () => {
  it("should work as expected on a trivial POD signer's public key configuration", () => {
    const config: GPCProofEntryConfigCommon = {
      isRevealed: true
    };

    const canonicalizedConfig = canonicalizeSignerPublicKeyConfig(config);

    expect(canonicalizedConfig).to.be.undefined;
  });
  it("should work as expected on a typical POD signer's public key configuration", () => {
    const config: GPCProofEntryConfigCommon = {
      isNotMemberOf: "someOtherList",
      equalsEntry: "pod0.key",
      isMemberOf: "someList",
      isRevealed: true
    };

    const canonicalizedConfig = canonicalizeSignerPublicKeyConfig(config);

    const expectedCanonicalizedConfig = {
      isRevealed: true,
      equalsEntry: "pod0.key",
      isMemberOf: "someList",
      isNotMemberOf: "someOtherList"
    };

    expect(canonicalizedConfig).to.deep.eq(expectedCanonicalizedConfig);
  });
});

describe("Bounds check configuration derivation works as expected", () => {
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
    const boundsCheckConfig = boundsCheckConfigFromProofConfig(proofConfig);
    expect(boundsCheckConfig).to.deep.eq({});
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
    const boundsCheckConfig = boundsCheckConfigFromProofConfig(proofConfig);
    expect(boundsCheckConfig).to.deep.eq({
      "somePod.A": {
        inRange: {
          min: 0n,
          max: POD_INT_MAX
        }
      },
      "somePod.B": {
        notInRange: {
          min: POD_INT_MIN,
          max: 87n
        }
      },
      "someOtherPod.D": {
        inRange: {
          min: 5n,
          max: 25n
        }
      }
    });
  });
  it("should work as expected on a proof configuration with more complex bounds checks", () => {
    const proofConfig: GPCProofConfig = {
      pods: {
        somePod: {
          entries: {
            A: {
              isRevealed: false,
              inRange: { min: 0n, max: 24n },
              notInRange: { min: 25n, max: 30n }
            },
            B: {
              isRevealed: false,
              inRange: { min: 0n, max: 24n },
              notInRange: { min: 24n, max: 500n }
            },
            C: {
              isRevealed: true,
              inRange: { min: 0n, max: 24n },
              notInRange: { min: -10n, max: -1n }
            },
            D: {
              isRevealed: false,
              inRange: { min: 0n, max: 24n },
              notInRange: { min: -10n, max: 0n }
            },
            E: {
              isRevealed: false,
              inRange: { min: 0n, max: 24n }
            }
          }
        },
        someOtherPod: {
          entries: {
            D: {
              isRevealed: false,
              inRange: { min: 0n, max: 30n },
              notInRange: { min: -10n, max: 4n }
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
    const boundsCheckConfig = boundsCheckConfigFromProofConfig(proofConfig);
    expect(boundsCheckConfig).to.deep.eq({
      "somePod.A": {
        inRange: {
          min: 0n,
          max: 24n
        }
      },
      "somePod.B": {
        inRange: {
          min: 0n,
          max: 23n
        }
      },
      "somePod.C": {
        inRange: {
          min: 0n,
          max: 24n
        }
      },
      "somePod.D": {
        inRange: {
          min: 1n,
          max: 24n
        }
      },
      "somePod.E": {
        inRange: {
          min: 0n,
          max: 24n
        }
      },
      "someOtherPod.D": {
        inRange: {
          min: 5n,
          max: 30n
        }
      },
      "someOtherPod.E": {
        inRange: { min: -1000n, max: 20n },
        notInRange: { min: -5n, max: 4n }
      },
      "someOtherPod.F": {
        notInRange: { min: 100n, max: 200n }
      }
    });
  });
});
// TODO(POD-P3): More tests
