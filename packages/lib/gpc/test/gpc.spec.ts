import { ProtoPODGPC } from "@pcd/gpcircuits";
import { POD, PODValue } from "@pcd/pod";
import { expect } from "chai";
import "mocha";
import { poseidon2 } from "poseidon-lite/poseidon2";
import {
  GPCArtifactSource,
  GPCArtifactStability,
  GPCArtifactVersion,
  GPCBoundConfig,
  GPCProofConfig,
  GPCProofInputs,
  GPCRevealedClaims,
  gpcArtifactDownloadURL,
  gpcProve,
  gpcVerify
} from "../src";
import { makeCircuitIdentifier, makeWatermarkSignal } from "../src/gpcUtil";
import {
  GPC_TEST_ARTIFACTS_PATH,
  expectAsyncError,
  ownerIdentity,
  privateKey,
  sampleEntries,
  sampleEntries2
} from "./common";

describe("gpc library (Compiled test artifacts) should work", async function () {
  function makeMinimalArgs(includeWatermark?: boolean): {
    proofConfig: GPCProofConfig;
    proofInputs: GPCProofInputs;
    expectedRevealedClaims: GPCRevealedClaims;
  } {
    const pod2 = POD.sign(sampleEntries2, privateKey);

    const proofConfig: GPCProofConfig = {
      pods: {
        somePodName: {
          entries: {
            ticketID: { isRevealed: true }
          }
        }
      }
    };
    const proofInputs: GPCProofInputs = {
      pods: {
        somePodName: pod2
      },
      watermark: includeWatermark ? { type: "int", value: 1337n } : undefined
    };
    const expectedRevealedClaims: GPCRevealedClaims = {
      pods: {
        somePodName: {
          entries: { ticketID: { type: "cryptographic", value: 999n } },
          signerPublicKey: pod2.signerPublicKey
        }
      },
      ...(includeWatermark ? { watermark: { type: "int", value: 1337n } } : {})
    };
    return { proofConfig, proofInputs, expectedRevealedClaims };
  }

  async function gpcProofTest(
    proofConfig: GPCProofConfig,
    proofInputs: GPCProofInputs,
    expectedRevealedClaims: GPCRevealedClaims
  ): Promise<{
    isVerified: boolean;
    boundConfig: GPCBoundConfig;
    revealedClaims: GPCRevealedClaims;
  }> {
    const { proof, boundConfig, revealedClaims } = await gpcProve(
      proofConfig,
      proofInputs,
      GPC_TEST_ARTIFACTS_PATH
    );

    // There's nothing non-canonical about our input, so boundConfig should
    // only differ by circuit selection.
    const manuallyBoundConfig = {
      ...proofConfig,
      circuitIdentifier: boundConfig.circuitIdentifier
    };
    expect(boundConfig).to.deep.eq(manuallyBoundConfig);

    expect(revealedClaims).to.deep.eq(expectedRevealedClaims);

    const isVerified = await gpcVerify(
      proof,
      boundConfig,
      revealedClaims,
      GPC_TEST_ARTIFACTS_PATH
    );
    return { isVerified, boundConfig, revealedClaims };
  }

  it("should prove and verify a minimal case", async function () {
    const { proofConfig, proofInputs, expectedRevealedClaims } =
      makeMinimalArgs();
    const { isVerified, boundConfig } = await gpcProofTest(
      proofConfig,
      proofInputs,
      expectedRevealedClaims
    );
    expect(isVerified).to.be.true;

    // For this small case, the library should auto-pick the smallest circuit.
    expect(boundConfig.circuitIdentifier).to.eq(
      makeCircuitIdentifier(ProtoPODGPC.CIRCUIT_FAMILY[0])
    );
  });

  it("should prove and verify a minimal case with each circuit in the family", async function () {
    const { proofConfig, proofInputs, expectedRevealedClaims } =
      makeMinimalArgs();
    for (const circuitDesc of ProtoPODGPC.CIRCUIT_FAMILY.slice(1)) {
      const circuitID = makeCircuitIdentifier(circuitDesc);
      const { isVerified, boundConfig } = await gpcProofTest(
        {
          ...proofConfig,
          circuitIdentifier: circuitID
        },
        proofInputs,
        expectedRevealedClaims
      );
      expect(isVerified).to.be.true;
      expect(boundConfig.circuitIdentifier).to.eq(circuitID);
    }
  });

  it("should prove and verify a typical case", async function () {
    const pod1 = POD.sign(sampleEntries, privateKey);
    const proofConfig: GPCProofConfig = {
      pods: {
        pod1: {
          entries: {
            A: { isRevealed: true },
            E: { isRevealed: false, equalsEntry: "pod1.A" },
            owner: { isRevealed: false, isOwnerID: true }
          }
        }
      }
    };
    const proofInputs: GPCProofInputs = {
      pods: { pod1 },
      owner: {
        semaphoreV3: ownerIdentity,
        externalNullifier: { type: "int", value: 42n }
      },
      watermark: { type: "int", value: 1337n }
    };
    const expectedRevealedClaims: GPCRevealedClaims = {
      pods: {
        pod1: {
          entries: { A: { type: "int", value: 123n } },
          signerPublicKey: pod1.signerPublicKey
        }
      },
      owner: {
        externalNullifier: { type: "int", value: 42n },
        nullifierHash: poseidon2([
          makeWatermarkSignal({ type: "int", value: 42n }),
          ownerIdentity.nullifier
        ])
      },
      watermark: { type: "int", value: 1337n }
    };

    const { isVerified } = await gpcProofTest(
      proofConfig,
      proofInputs,
      expectedRevealedClaims
    );
    expect(isVerified).to.be.true;
  });

  it("should prove and verify a complex case", async function () {
    const pod1 = POD.sign(sampleEntries, privateKey);
    const pod2 = POD.sign(sampleEntries2, privateKey);
    const externalNullifier: PODValue = {
      type: "string",
      value: "nullify me if you dare!"
    };
    const watermark: PODValue = {
      type: "string",
      value: '{"json": "is allowed"}'
    };
    const proofConfig: GPCProofConfig = {
      pods: {
        pod2: {
          entries: {
            ticketID: { isRevealed: false, equalsEntry: "pod1.otherTicketID" },
            attendee: { isRevealed: false, isOwnerID: true }
          }
        },
        pod1: {
          entries: {
            G: { isRevealed: true },
            otherTicketID: { isRevealed: false },
            owner: { isRevealed: false, isOwnerID: true }
          }
        }
      }
    };
    const proofInputs: GPCProofInputs = {
      pods: { pod1, pod2 },
      owner: {
        semaphoreV3: ownerIdentity,
        externalNullifier
      },
      watermark
    };
    const expectedRevealedClaims: GPCRevealedClaims = {
      pods: {
        pod1: {
          entries: { G: { type: "int", value: 7n } },
          signerPublicKey: pod1.signerPublicKey
        },
        pod2: {
          signerPublicKey: pod2.signerPublicKey
        }
      },
      owner: {
        externalNullifier,
        nullifierHash: poseidon2([
          makeWatermarkSignal(externalNullifier),
          ownerIdentity.nullifier
        ])
      },
      watermark
    };

    await gpcProofTest(proofConfig, proofInputs, expectedRevealedClaims);
  });

  it("proving should throw on illegal inputs", async function () {
    const { proofConfig, proofInputs } = makeMinimalArgs(true);

    // Config is illegal.
    await expectAsyncError(
      async () => {
        await gpcProve(
          {
            ...proofConfig,
            pods: {
              somePodName: { entries: {} }
            }
          },
          proofInputs,
          GPC_TEST_ARTIFACTS_PATH
        );
      },
      "TypeError",
      "Must prove at least one entry in object"
    );

    // Input is illegal.
    await expectAsyncError(
      async () => {
        await gpcProve(
          proofConfig,
          {
            ...proofInputs,
            watermark: { type: "string", value: 123n } as unknown as PODValue
          },
          GPC_TEST_ARTIFACTS_PATH
        );
      },
      "TypeError",
      "Invalid value for entry watermark"
    );

    // Config doesn't match input.
    await expectAsyncError(
      async () => {
        await gpcProve(
          {
            ...proofConfig,
            pods: {
              wrongPODName: {
                entries: {
                  ticketID: { isRevealed: true }
                }
              }
            }
          },
          proofInputs,
          GPC_TEST_ARTIFACTS_PATH
        );
      },
      "ReferenceError",
      "Configured POD object wrongPODName not provided in inputs"
    );
  });

  it("verifying should throw on illegal inputs", async function () {
    const { proofConfig, proofInputs } = makeMinimalArgs(true);
    const { proof, boundConfig, revealedClaims } = await gpcProve(
      proofConfig,
      proofInputs,
      GPC_TEST_ARTIFACTS_PATH
    );

    // Config is illegal.
    await expectAsyncError(
      async () => {
        await gpcVerify(
          proof,
          proofConfig as GPCBoundConfig, // not bound
          revealedClaims,
          GPC_TEST_ARTIFACTS_PATH
        );
      },
      "TypeError",
      "Bound config must include circuit identifier"
    );

    // Claims is illegal.
    await expectAsyncError(
      async () => {
        await gpcVerify(
          proof,
          boundConfig,
          {
            ...revealedClaims,
            watermark: { type: "string", value: 123n } as unknown as PODValue
          },
          GPC_TEST_ARTIFACTS_PATH
        );
      },
      "TypeError",
      "Invalid value for entry watermark"
    );

    // Config doesn't match claims.
    await expectAsyncError(
      async () => {
        await gpcVerify(
          proof,
          {
            ...boundConfig,
            pods: {
              wrongPODName: {
                entries: {
                  ticketID: { isRevealed: true }
                }
              }
            }
          },
          revealedClaims,
          GPC_TEST_ARTIFACTS_PATH
        );
      },
      "ReferenceError",
      'Configuration reveals entry "wrongPODName.ticketID" but the POD is not revealed in claims.'
    );
  });

  it("should not verify tampered args which pass compiler checks", async function () {
    const { proofConfig, proofInputs } = makeMinimalArgs(true);
    const { proof, boundConfig, revealedClaims } = await gpcProve(
      proofConfig,
      proofInputs,
      GPC_TEST_ARTIFACTS_PATH
    );

    // Tamper with proof
    let isVerified = await gpcVerify(
      { ...proof, pi_a: [proof.pi_a[0] + 1, proof.pi_a[1]] },
      boundConfig,
      revealedClaims,
      GPC_TEST_ARTIFACTS_PATH
    );
    expect(isVerified).to.be.false;

    // Tamper with watermark or nullifier
    isVerified = await gpcVerify(
      proof,
      boundConfig,
      { ...revealedClaims, watermark: { type: "string", value: "fake" } },
      GPC_TEST_ARTIFACTS_PATH
    );
    expect(isVerified).to.be.false;
    isVerified = await gpcVerify(
      proof,
      boundConfig,
      { ...revealedClaims, watermark: undefined },
      GPC_TEST_ARTIFACTS_PATH
    );
    expect(isVerified).to.be.false;
    isVerified = await gpcVerify(
      proof,
      boundConfig,
      {
        ...revealedClaims,
        owner: {
          externalNullifier: { type: "string", value: "fake" },
          nullifierHash: 1234n
        }
      },
      GPC_TEST_ARTIFACTS_PATH
    );
    expect(isVerified).to.be.false;

    // Tamper with revealed entry name.
    isVerified = await gpcVerify(
      proof,
      {
        ...boundConfig,
        pods: {
          somePodName: {
            entries: {
              fakeEntry: { isRevealed: true }
            }
          }
        }
      },
      {
        ...revealedClaims,
        pods: {
          somePodName: {
            entries: { fakeEntry: { type: "cryptographic", value: 999n } },
            signerPublicKey: revealedClaims.pods.somePodName.signerPublicKey
          }
        }
      },
      GPC_TEST_ARTIFACTS_PATH
    );
    expect(isVerified).to.be.false;

    // Tamper with revealed entry value.
    isVerified = await gpcVerify(
      proof,
      boundConfig,
      {
        ...revealedClaims,
        pods: {
          somePodName: {
            entries: { ticketID: { type: "cryptographic", value: 111111n } },
            signerPublicKey: revealedClaims.pods.somePodName.signerPublicKey
          }
        }
      },
      GPC_TEST_ARTIFACTS_PATH
    );
    expect(isVerified).to.be.false;
  });
});

describe("gpcArtifactDownloadURL should work", async function () {
  it("should work for source=zupass", async function () {
    const TEST_CASES = [
      {
        stability: "test",
        version: undefined,
        zupassURL: undefined,
        expected: undefined
      },
      {
        stability: "test",
        version: "foo",
        zupassURL: undefined,
        expected: undefined
      },
      {
        stability: "prod",
        version: undefined,
        zupassURL: undefined,
        expected: undefined
      },
      {
        stability: "prod",
        version: "foo",
        zupassURL: undefined,
        expected: undefined
      },
      {
        stability: "test",
        version: undefined,
        zupassURL: "/",
        expected: "/artifacts/test/proto-pod-gpc"
      },
      {
        stability: "prod",
        version: undefined,
        zupassURL: "/",
        expected: "/artifacts/proto-pod-gpc"
      },
      {
        stability: "test",
        version: "foo",
        zupassURL: "/",
        expected: "/artifacts/test/proto-pod-gpc"
      },
      {
        stability: "prod",
        version: "foo",
        zupassURL: "/",
        expected: "/artifacts/proto-pod-gpc"
      },
      {
        stability: "test",
        version: undefined,
        zupassURL: "",
        expected: "artifacts/test/proto-pod-gpc"
      },
      {
        stability: "prod",
        version: undefined,
        zupassURL: "",
        expected: "artifacts/proto-pod-gpc"
      },
      {
        stability: "test",
        version: "foo",
        zupassURL: "",
        expected: "artifacts/test/proto-pod-gpc"
      },
      {
        stability: "prod",
        version: "foo",
        zupassURL: "",
        expected: "artifacts/proto-pod-gpc"
      },
      {
        stability: "test",
        version: undefined,
        zupassURL: "https://zupass.org",
        expected: "https://zupass.org/artifacts/test/proto-pod-gpc"
      },
      {
        stability: "prod",
        version: undefined,
        zupassURL: "https://zupass.org/",
        expected: "https://zupass.org/artifacts/proto-pod-gpc"
      },
      {
        stability: "test",
        version: "foo",
        zupassURL: "https://zupass.org/",
        expected: "https://zupass.org/artifacts/test/proto-pod-gpc"
      },
      {
        stability: "prod",
        version: "foo",
        zupassURL: "https://zupass.org",
        expected: "https://zupass.org/artifacts/proto-pod-gpc"
      }
    ];

    for (const testCase of TEST_CASES) {
      if (testCase.expected !== undefined) {
        expect(
          gpcArtifactDownloadURL(
            "zupass",
            testCase.stability as GPCArtifactStability,
            testCase.version as GPCArtifactVersion,
            testCase.zupassURL
          )
        ).to.eq(testCase.expected);
      } else {
        expect(() =>
          gpcArtifactDownloadURL(
            "zupass",
            testCase.stability as GPCArtifactStability,
            testCase.version as GPCArtifactVersion,
            testCase.zupassURL
          )
        ).to.throw(Error);
      }
    }
  });

  it("should work for source=github", async function () {
    const TEST_CASES = [
      {
        stability: "test",
        version: undefined,
        zupassURL: undefined,
        expected: undefined
      },
      {
        stability: "prod",
        version: undefined,
        zupassURL: undefined,
        expected: undefined
      },
      {
        stability: "test",
        version: undefined,
        zupassURL: "https://zupass.org",
        expected: undefined
      },
      {
        stability: "prod",
        version: undefined,
        zupassURL: "https://zupass.org",
        expected: undefined
      },
      {
        stability: "test",
        version: "foo",
        zupassURL: undefined,
        expected:
          "https://raw.githubusercontent.com/proofcarryingdata/snark-artifacts/foo/packages/proto-pod-gpc"
      },
      {
        stability: "prod",
        version: "foo",
        zupassURL: undefined,
        expected:
          "https://raw.githubusercontent.com/proofcarryingdata/snark-artifacts/foo/packages/proto-pod-gpc"
      },
      {
        stability: "prod",
        version: "foo/bar",
        zupassURL: "https://zupass.org",
        expected:
          "https://raw.githubusercontent.com/proofcarryingdata/snark-artifacts/foo/bar/packages/proto-pod-gpc"
      }
    ];

    for (const testCase of TEST_CASES) {
      if (testCase.expected !== undefined) {
        expect(
          gpcArtifactDownloadURL(
            "github",
            testCase.stability as GPCArtifactStability,
            testCase.version as GPCArtifactVersion,
            testCase.zupassURL
          )
        ).to.eq(testCase.expected);
      } else {
        expect(() =>
          gpcArtifactDownloadURL(
            "github",
            testCase.stability as GPCArtifactStability,
            testCase.version as GPCArtifactVersion,
            testCase.zupassURL
          )
        ).to.throw(Error);
      }
    }
  });

  it("should work for source=unpkg", async function () {
    const TEST_CASES = [
      {
        stability: "test",
        version: undefined,
        zupassURL: undefined,
        expected: undefined
      },
      {
        stability: "prod",
        version: undefined,
        zupassURL: undefined,
        expected: undefined
      },
      {
        stability: "test",
        version: undefined,
        zupassURL: "https://zupass.org",
        expected: undefined
      },
      {
        stability: "prod",
        version: undefined,
        zupassURL: "https://zupass.org",
        expected: undefined
      },
      {
        stability: "test",
        version: "foo",
        zupassURL: undefined,
        expected: "https://unpkg.com/@pcd/proto-pod-gpc-artifacts@foo"
      },
      {
        stability: "prod",
        version: "foo",
        zupassURL: undefined,
        expected: "https://unpkg.com/@pcd/proto-pod-gpc-artifacts@foo"
      },
      {
        stability: "prod",
        version: "foo/bar",
        zupassURL: "https://zupass.org",
        expected: "https://unpkg.com/@pcd/proto-pod-gpc-artifacts@foo/bar"
      }
    ];

    for (const testCase of TEST_CASES) {
      if (testCase.expected !== undefined) {
        expect(
          gpcArtifactDownloadURL(
            "unpkg",
            testCase.stability as GPCArtifactStability,
            testCase.version as GPCArtifactVersion,
            testCase.zupassURL
          )
        ).to.eq(testCase.expected);
      } else {
        expect(() =>
          gpcArtifactDownloadURL(
            "unpkg",
            testCase.stability as GPCArtifactStability,
            testCase.version as GPCArtifactVersion,
            testCase.zupassURL
          )
        ).to.throw(Error);
      }
    }
  });

  it("should throw on missing or invalid source", async function () {
    expect(() =>
      gpcArtifactDownloadURL(
        "wrong" as GPCArtifactSource,
        "prod",
        "foo",
        "https://zupass.org"
      )
    ).to.throw(Error);
    expect(() =>
      gpcArtifactDownloadURL(
        undefined as unknown as GPCArtifactSource,
        "prod",
        "foo",
        "https://zupass.org"
      )
    ).to.throw(Error);
  });
});

// TODO(POD-P2): More detailed feature unit-tests by module:
// TODO(POD-P2): gpcCompile tests using WitnessTester
// TODO(POD-P2): gpcChecks tests for positive/negative cases
// TODO(POD-P2): gpcSerialize tests for positive/negative cases
// TODO(POD-P3): gpcUtil tests
