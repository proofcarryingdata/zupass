import {
  ProtoPODGPC,
  ProtoPODGPCCircuitDesc,
  gpcArtifactPaths
} from "@pcd/gpcircuits";
import {
  POD,
  PODCryptographicValue,
  PODEdDSAPublicKeyValue,
  PODValue,
  PODValueTuple,
  POD_INT_MAX,
  POD_INT_MIN
} from "@pcd/pod";
import { expect } from "chai";
import "mocha";
import { poseidon2 } from "poseidon-lite/poseidon2";
import { chooseCircuitFamilyForTests } from "../../gpcircuits/scripts/common";
import {
  GPCArtifactSource,
  GPCArtifactStability,
  GPCArtifactVersion,
  GPCBoundConfig,
  GPCProof,
  GPCProofConfig,
  GPCProofEntryConfig,
  GPCProofEntryConfigCommon,
  GPCProofInputs,
  GPCRevealedClaims,
  GPC_ARTIFACTS_NPM_VERSION,
  IdentityProtocol,
  PODEntryIdentifier,
  SEMAPHORE_V3,
  SEMAPHORE_V4,
  gpcCheckProvable as _gpcCheckProvable,
  gpcProve as _gpcProve,
  gpcVerify as _gpcVerify,
  gpcArtifactDownloadURL,
  gpcPostProve,
  gpcPreProve,
  gpcPreVerify
} from "../src";
import { makeCircuitIdentifier, makeWatermarkSignal } from "../src/gpcUtil";
import {
  GPC_TEST_ARTIFACTS_PATH,
  expectAsyncError,
  ownerIdentity,
  ownerIdentityV4,
  privateKey,
  privateKey2,
  sampleEntries,
  sampleEntries2
} from "./common";

// Choose circuit family according to environment variable `GPC_FAMILY_VARIANT`.
const { circuitParamType, testCircuitFamily } = chooseCircuitFamilyForTests();

// Test-specific GPC proof and verification functions
const gpcCheckProvable = (
  proofConfig: GPCProofConfig,
  proofInputs: GPCProofInputs
): { boundConfig: GPCBoundConfig; circuitDesc: ProtoPODGPCCircuitDesc } =>
  _gpcCheckProvable(proofConfig, proofInputs, testCircuitFamily);
const gpcProve = (
  proofConfig: GPCProofConfig,
  proofInputs: GPCProofInputs,
  pathToArtifacts: string
): Promise<{
  proof: GPCProof;
  boundConfig: GPCBoundConfig;
  revealedClaims: GPCRevealedClaims;
}> => _gpcProve(proofConfig, proofInputs, pathToArtifacts, testCircuitFamily);
const gpcVerify = (
  proof: GPCProof,
  boundConfig: GPCBoundConfig,
  revealedClaims: GPCRevealedClaims,
  pathToArtifacts: string
): Promise<boolean> =>
  _gpcVerify(
    proof,
    boundConfig,
    revealedClaims,
    pathToArtifacts,
    testCircuitFamily
  );

describe(`gpc library (Compiled ${circuitParamType} artifacts) should work`, async function () {
  function makeMinimalArgs(
    includeWatermark?: boolean,
    includeList?: boolean,
    includeTuple?: boolean
  ): {
    proofConfig: GPCProofConfig;
    proofInputs: GPCProofInputs;
    expectedRevealedClaims: GPCRevealedClaims;
  } {
    const pod2 = POD.sign(sampleEntries2, privateKey);

    const proofConfig: GPCProofConfig = {
      pods: {
        somePodName: {
          entries: {
            ticketID: {
              isRevealed: true,
              ...(includeList ? { isNotMemberOf: "inadmissibleTickets" } : {})
            }
          },
          contentID: { isRevealed: true }
        }
      },
      ...(includeTuple
        ? {
            tuples: {
              someTupleName: {
                entries: ["somePodName.ticketID", "somePodName.ticketID"],
                ...(includeList ? { isMemberOf: "admissibleTicketPairs" } : {})
              }
            }
          }
        : {})
    };
    const proofInputs: GPCProofInputs = {
      pods: {
        somePodName: pod2
      },
      watermark: includeWatermark ? { type: "int", value: 1337n } : undefined,
      ...(includeList
        ? {
            membershipLists: {
              inadmissibleTickets: [sampleEntries2.attendee, sampleEntries.J],
              ...(includeTuple
                ? {
                    admissibleTicketPairs: [
                      [sampleEntries2.ticketID, sampleEntries2.ticketID]
                    ]
                  }
                : {})
            }
          }
        : {})
    };
    const expectedRevealedClaims: GPCRevealedClaims = {
      pods: {
        somePodName: {
          contentID: pod2.contentID,
          entries: { ticketID: { type: "cryptographic", value: 999n } },
          signerPublicKey: pod2.signerPublicKey
        }
      },
      ...(includeWatermark ? { watermark: { type: "int", value: 1337n } } : {}),
      ...(includeList
        ? {
            membershipLists: {
              inadmissibleTickets: [
                sampleEntries2.ticketID,
                sampleEntries2.ticketID
              ],
              ...(includeTuple
                ? {
                    admissibleTicketPairs: [
                      [sampleEntries2.ticketID, sampleEntries2.ticketID],
                      [sampleEntries2.ticketID, sampleEntries2.ticketID]
                    ]
                  }
                : {})
            }
          }
        : {})
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
      makeCircuitIdentifier(testCircuitFamily[0])
    );
  });

  it("should prove and verify with pre/post and separate proving system", async function () {
    const { proofConfig, proofInputs, expectedRevealedClaims } =
      makeMinimalArgs();

    const {
      boundConfig: orgBoundConfig,
      circuitDesc: pCircuitDesc,
      circuitInputs
    } = gpcPreProve(proofConfig, proofInputs, testCircuitFamily);

    const artifactPaths = gpcArtifactPaths(
      GPC_TEST_ARTIFACTS_PATH,
      pCircuitDesc
    );

    const { proof: orgProof, outputs: pCircuitOutputs } =
      await ProtoPODGPC.prove(
        circuitInputs,
        artifactPaths.wasmPath,
        artifactPaths.pkeyPath
      );

    const { proof, boundConfig, revealedClaims } = gpcPostProve(
      orgProof,
      orgBoundConfig,
      proofInputs,
      pCircuitOutputs
    );

    // There's nothing non-canonical about our input, so boundConfig should
    // only differ by circuit selection.
    const manuallyBoundConfig = {
      ...proofConfig,
      circuitIdentifier: boundConfig.circuitIdentifier
    };
    expect(boundConfig).to.deep.eq(manuallyBoundConfig);

    expect(revealedClaims).to.deep.eq(expectedRevealedClaims);

    const {
      circuitDesc: vCircuitDesc,
      circuitPublicInputs,
      circuitOutputs: vCircuitOutputs
    } = gpcPreVerify(boundConfig, revealedClaims, testCircuitFamily);

    expect(pCircuitDesc).to.deep.eq(vCircuitDesc);
    expect(pCircuitOutputs).to.deep.eq(vCircuitOutputs);

    const isVerified = await ProtoPODGPC.verify(
      gpcArtifactPaths(GPC_TEST_ARTIFACTS_PATH, vCircuitDesc).vkeyPath,
      proof,
      circuitPublicInputs,
      vCircuitOutputs
    );
    expect(isVerified).to.be.true;

    // For this small case, the library should auto-pick the smallest circuit.
    expect(boundConfig.circuitIdentifier).to.eq(
      makeCircuitIdentifier(testCircuitFamily[0])
    );
  });

  it("should prove and verify a minimal case with each circuit in the family", async function () {
    const { proofConfig, proofInputs, expectedRevealedClaims } =
      makeMinimalArgs();
    for (const circuitDesc of testCircuitFamily.slice(1)) {
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

  const pod1 = POD.sign(sampleEntries, privateKey);
  const typicalProofConfig: GPCProofConfig = {
    pods: {
      pod1: {
        entries: {
          A: { isRevealed: true, notEqualsEntry: "pod1.$signerPublicKey" },
          E: {
            isRevealed: false,
            equalsEntry: "pod1.A",
            isMemberOf: "list1"
          },
          owner: { isRevealed: false, isOwnerID: SEMAPHORE_V3 }
        },
        signerPublicKey: {
          isRevealed: false,
          isMemberOf: "admissiblePubKeys"
        }
      }
    }
  };
  const typicalProofInputs: GPCProofInputs = {
    pods: { pod1 },
    owner: {
      semaphoreV3: ownerIdentity,
      externalNullifier: { type: "int", value: 42n }
    },
    membershipLists: {
      list1: [sampleEntries.F, sampleEntries.E],
      admissiblePubKeys: [
        pod1.signerPublicKey,
        "f71b62538fbc40df0d5e5b2034641ae437bdbf06012779590099456cf25b5f8f",
        "755224af31d5b5e47cc6ca8827b8bf9d2ceba48bf439907abaade0a3269d561b",
        "f27205e5ceeaad24025652cc9f6f18cee5897266f8c0aac5b702d48e0dea3585",
        "2af47e1aaf8f0450b9fb2e429042708ec7d173c4ac4329747db1063b78db4e0d"
      ].map(PODEdDSAPublicKeyValue)
    },
    watermark: { type: "int", value: 1337n }
  };
  const expectedRevealedClaimsForTypicalCase: GPCRevealedClaims = {
    pods: {
      pod1: {
        entries: { A: { type: "int", value: 123n } }
      }
    },
    owner: {
      externalNullifier: { type: "int", value: 42n },
      nullifierHashV3: poseidon2([
        makeWatermarkSignal({ type: "int", value: 42n }),
        ownerIdentity.nullifier
      ])
    },
    membershipLists: typicalProofInputs.membershipLists,
    watermark: { type: "int", value: 1337n }
  };

  it("should prove and verify a typical case with Semaphore V3 owner identity", async function () {
    const { isVerified } = await gpcProofTest(
      typicalProofConfig,
      typicalProofInputs,
      expectedRevealedClaimsForTypicalCase
    );
    expect(isVerified).to.be.true;
  });

  it("should prove and verify a typical case with Semaphore V4 owner identity", async function () {
    const typicalProofConfigV4 = {
      pods: {
        pod1: {
          signerPublicKey: typicalProofConfig.pods.pod1.signerPublicKey,
          entries: {
            A: { isRevealed: true },
            E: {
              isRevealed: false,
              equalsEntry: "pod1.A" as PODEntryIdentifier,
              isMemberOf: "list1"
            },
            ownerV4: {
              isRevealed: false,
              isOwnerID: SEMAPHORE_V4 as IdentityProtocol
            }
          }
        }
      }
    };
    const typicalProofInputsV4 = {
      ...typicalProofInputs,
      owner: {
        semaphoreV4: ownerIdentityV4,
        externalNullifier: typicalProofInputs.owner?.externalNullifier
      }
    };

    const expectedRevealedClaimsForTypicalV4Case = {
      ...expectedRevealedClaimsForTypicalCase,
      owner: {
        externalNullifier: { type: "int", value: 42n },
        nullifierHashV4: poseidon2([
          makeWatermarkSignal({ type: "int", value: 42n }),
          ownerIdentityV4.secretScalar
        ])
      }
    } as GPCRevealedClaims;

    const { isVerified } = await gpcProofTest(
      typicalProofConfigV4,
      typicalProofInputsV4,
      expectedRevealedClaimsForTypicalV4Case
    );
    expect(isVerified).to.be.true;
  });

  it("should prove and verify a typical case with both Semaphore V3 and Semaphore V4 owner identities", async function () {
    const typicalProofConfigV3V4 = {
      pods: {
        pod1: {
          signerPublicKey: typicalProofConfig.pods.pod1.signerPublicKey,
          entries: {
            ...typicalProofConfig.pods.pod1.entries,
            ownerV4: {
              isRevealed: false,
              isOwnerID: SEMAPHORE_V4 as IdentityProtocol
            }
          }
        }
      }
    };
    const typicalProofInputsV3V4 = {
      ...typicalProofInputs,
      owner: {
        ...typicalProofInputs.owner,
        semaphoreV4: ownerIdentityV4
      }
    };

    const expectedRevealedClaimsForTypicalV3V4Case = {
      ...expectedRevealedClaimsForTypicalCase,
      owner: {
        ...expectedRevealedClaimsForTypicalCase.owner,
        nullifierHashV4: poseidon2([
          makeWatermarkSignal({ type: "int", value: 42n }),
          ownerIdentityV4.secretScalar
        ])
      }
    } as GPCRevealedClaims;

    const { isVerified } = await gpcProofTest(
      typicalProofConfigV3V4,
      typicalProofInputsV3V4,
      expectedRevealedClaimsForTypicalV3V4Case
    );
    expect(isVerified).to.be.true;
  });

  it("should prove and verify checking (in)equality of non-virtual entries", async function () {
    for (const equalityCheck of [
      { equalsEntry: "pod1.A" },
      { notEqualsEntry: "pod1.owner" }
    ]) {
      const { isVerified } = await gpcProofTest(
        {
          pods: {
            pod1: {
              ...typicalProofConfig.pods.pod1,
              entries: {
                ...typicalProofConfig.pods.pod1.entries,
                E: {
                  isRevealed: false,
                  isMemberOf: "list1",
                  ...equalityCheck
                } as GPCProofEntryConfig
              }
            }
          }
        },
        typicalProofInputs,
        expectedRevealedClaimsForTypicalCase
      );
      expect(isVerified).to.be.true;
    }
  });

  it("should prove and verify checking (in)equality non-virtual to virtual", async function () {
    const pod2 = POD.sign(
      { otherPODID: { type: "cryptographic", value: pod1.contentID } },
      privateKey2
    );
    // Entry (!)= contentID
    for (const equalityCheck of [
      { equalsEntry: "pod1.$contentID" },
      { notEqualsEntry: "pod2.$contentID" }
    ]) {
      const { isVerified } = await gpcProofTest(
        {
          pods: {
            ...typicalProofConfig.pods,
            pod2: {
              entries: {
                otherPODID: {
                  isRevealed: false,
                  ...equalityCheck
                } as GPCProofEntryConfig
              },
              signerPublicKey: { isRevealed: false }
            }
          }
        },
        { ...typicalProofInputs, pods: { pod1, pod2 } },
        expectedRevealedClaimsForTypicalCase
      );
      expect(isVerified).to.be.true;
    }

    // Entry (!)= signer's public key
    for (const equalityCheck of [
      { equalsEntry: "pod1.$signerPublicKey" },
      { notEqualsEntry: "pod2.$signerPublicKey" }
    ]) {
      const { isVerified } = await gpcProofTest(
        {
          pods: {
            pod1: {
              ...typicalProofConfig.pods.pod1,
              entries: {
                ...typicalProofConfig.pods.pod1.entries,
                pubKey: {
                  isRevealed: false,
                  ...equalityCheck
                } as GPCProofEntryConfig
              }
            },
            pod2: {
              entries: {
                otherPODID: {
                  isRevealed: false
                }
              },
              signerPublicKey: { isRevealed: false }
            }
          }
        },
        { ...typicalProofInputs, pods: { pod1, pod2 } },
        expectedRevealedClaimsForTypicalCase
      );
      expect(isVerified).to.be.true;
    }
  });

  it("should prove and verify checking (in)equality virtual to non-virtual", async function () {
    const pod2 = POD.sign(
      { otherPODID: { type: "cryptographic", value: pod1.contentID } },
      privateKey2
    );
    // Content ID (!)= entry
    for (const equalityCheck of [
      { equalsEntry: "pod2.otherPODID" },
      { notEqualsEntry: "pod1.A" }
    ]) {
      const { isVerified } = await gpcProofTest(
        {
          pods: {
            pod1: {
              ...typicalProofConfig.pods.pod1,
              contentID: {
                isRevealed: false,
                ...equalityCheck
              } as GPCProofEntryConfigCommon
            },
            pod2: {
              entries: {
                otherPODID: {
                  isRevealed: false
                }
              },
              signerPublicKey: { isRevealed: false }
            }
          }
        },
        { ...typicalProofInputs, pods: { pod1, pod2 } },
        expectedRevealedClaimsForTypicalCase
      );
      expect(isVerified).to.be.true;
    }

    // Signer's public key (!)= entry
    for (const equalityCheck of [
      { equalsEntry: "pod1.pubKey" },
      { notEqualsEntry: "pod1.A" }
    ]) {
      const { isVerified } = await gpcProofTest(
        {
          pods: {
            pod1: {
              entries: {
                ...typicalProofConfig.pods.pod1.entries,
                pubKey: {
                  isRevealed: false
                }
              },
              signerPublicKey: {
                isRevealed: false,
                isMemberOf: "admissiblePubKeys",
                ...equalityCheck
              } as GPCProofEntryConfigCommon
            }
          }
        },
        typicalProofInputs,
        expectedRevealedClaimsForTypicalCase
      );
      expect(isVerified).to.be.true;
    }
  });

  it("should prove and verify checking (in)equality virtual to virtual", async function () {
    const pod2 = POD.sign(
      { otherPODID: { type: "cryptographic", value: pod1.contentID } },
      privateKey2
    );
    // Signer's public key (!)= signer's public key
    for (const equalityCheck of [
      { equalsEntry: "pod3.$signerPublicKey" },
      { notEqualsEntry: "pod1.$signerPublicKey" }
    ]) {
      const { isVerified } = await gpcProofTest(
        {
          pods: {
            ...typicalProofConfig.pods,
            pod2: {
              entries: { otherPODID: { isRevealed: false } },
              signerPublicKey: {
                isRevealed: false,
                ...equalityCheck
              } as GPCProofEntryConfigCommon
            },
            pod3: {
              entries: { otherPODID: { isRevealed: false } },
              signerPublicKey: {
                isRevealed: false
              }
            }
          }
        },
        { ...typicalProofInputs, pods: { pod1, pod2, pod3: pod2 } },
        expectedRevealedClaimsForTypicalCase
      );
      expect(isVerified).to.be.true;
    }

    // Content ID (!)= content ID
    for (const equalityCheck of [
      { equalsEntry: "pod3.$contentID" },
      { notEqualsEntry: "pod1.$contentID" }
    ]) {
      const { isVerified } = await gpcProofTest(
        {
          pods: {
            pod1: {
              ...typicalProofConfig.pods.pod1
            },
            pod2: {
              entries: {
                otherPODID: {
                  isRevealed: false
                }
              },
              contentID: {
                isRevealed: false,
                ...equalityCheck
              } as GPCProofEntryConfigCommon,
              signerPublicKey: { isRevealed: false }
            },
            pod3: {
              entries: {
                otherPODID: {
                  isRevealed: false
                }
              },
              signerPublicKey: { isRevealed: false }
            }
          }
        },
        { ...typicalProofInputs, pods: { pod1, pod2, pod3: pod2 } },
        expectedRevealedClaimsForTypicalCase
      );
      expect(isVerified).to.be.true;
    }
    // TODO(POD-P∞): Invert Poseidon hash function.
  });

  it("should prove and verify within-bounds checks", async function () {
    const { isVerified } = await gpcProofTest(
      {
        pods: {
          pod1: {
            ...typicalProofConfig.pods.pod1,
            entries: {
              ...typicalProofConfig.pods.pod1.entries,
              G: {
                isRevealed: false,
                inRange: {
                  min: 3n,
                  max: 256n
                }
              }
            }
          }
        }
      },
      typicalProofInputs,
      expectedRevealedClaimsForTypicalCase
    );
    expect(isVerified).to.be.true;
  });

  it("should prove and verify out-of-bounds checks", async function () {
    const { isVerified } = await gpcProofTest(
      {
        pods: {
          pod1: {
            ...typicalProofConfig.pods.pod1,
            entries: {
              ...typicalProofConfig.pods.pod1.entries,
              G: {
                isRevealed: false,
                notInRange: {
                  min: 0n,
                  max: 6n
                }
              }
            }
          }
        }
      },
      typicalProofInputs,
      expectedRevealedClaimsForTypicalCase
    );
    expect(isVerified).to.be.true;
  });

  it("should prove and verify entry inequality checks", async function () {
    const { isVerified } = await gpcProofTest(
      {
        pods: {
          pod1: {
            ...typicalProofConfig.pods.pod1,
            entries: {
              ...typicalProofConfig.pods.pod1.entries,
              A: {
                isRevealed: true,
                inRange: { min: POD_INT_MIN, max: POD_INT_MAX }
              },
              G: {
                isRevealed: false,
                notInRange: {
                  min: 0n,
                  max: 6n
                },
                lessThan: "pod1.A"
              }
            }
          }
        }
      },
      typicalProofInputs,
      expectedRevealedClaimsForTypicalCase
    );
    expect(isVerified).to.be.true;
  });

  it("should prove and verify a complex case", async function () {
    const pod1 = POD.sign(sampleEntries, privateKey);
    const pod2 = POD.sign(sampleEntries2, privateKey2);
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
            attendee: {
              isRevealed: false,
              isOwnerID: SEMAPHORE_V3,
              isMemberOf: "goats"
            }
          },
          signerPublicKey: {
            isRevealed: false
          }
        },
        pod1: {
          entries: {
            A: {
              isRevealed: false,
              inRange: { min: 100n, max: 132n },
              notInRange: { min: 105n, max: 110n },
              greaterThanEq: "pod1.G"
            },
            G: {
              isRevealed: true,
              notInRange: { min: POD_INT_MIN, max: 0n },
              greaterThan: "pod1.K"
            },
            K: { isRevealed: false, inRange: { min: -10n, max: 0n } },
            otherTicketID: { isRevealed: false },
            owner: { isRevealed: false, isOwnerID: SEMAPHORE_V3 }
          },
          signerPublicKey: {
            isRevealed: false
          }
        }
      },
      tuples: {
        tuple1: {
          entries: ["pod1.G", "pod2.ticketID"],
          isNotMemberOf: "list1"
        },
        tuple2: {
          entries: [
            "pod2.ticketID",
            "pod1.otherTicketID",
            "pod1.G",
            "pod1.owner"
          ],
          isMemberOf: "list2"
        },
        pubKeyPair: {
          entries: ["pod1.$signerPublicKey", "pod2.$signerPublicKey"],
          isMemberOf: "admissiblePubKeyPairs"
        }
      },
      uniquePODs: true
    };
    const proofInputs: GPCProofInputs = {
      pods: { pod1, pod2 },
      owner: {
        semaphoreV3: ownerIdentity,
        externalNullifier
      },
      membershipLists: {
        list1: [
          [87, 1],
          [99, 8],
          [8273, 0],
          [0, 0],
          [12387, 3],
          [99999, 66],
          [653, 362374823],
          [29387, 1236478236],
          [1238, 9238374],
          [1, 1],
          [87, 87]
        ].map((pair) => [
          { type: "int", value: BigInt(pair[0]) },
          { type: "cryptographic", value: BigInt(pair[1]) }
        ]) as PODValueTuple[],
        list2: [
          [129384723n, 123746238746n, 1237n, 18239n],
          [1283748973n, 0n, 1n, 2n],
          [9023874n, 8237n, 23674n, 23874n]
        ]
          .map(
            (tuple) =>
              [
                { type: "cryptographic", value: tuple[0] },
                { type: "int", value: tuple[1] },
                { type: "int", value: tuple[2] },
                { type: "cryptographic", value: tuple[3] }
              ] as PODValueTuple
          )
          .concat([
            [
              sampleEntries2.ticketID,
              sampleEntries.otherTicketID,
              sampleEntries.G,
              sampleEntries.owner
            ]
          ]),
        goats: [
          0, 7, 87, 11, 2938, 1923483, 123948, 12839428374, 1234,
          12343487239487, 2, 3
        ]
          .map((value: number) => {
            return {
              type: "cryptographic",
              value: BigInt(value)
            } as PODCryptographicValue;
          })
          .concat([sampleEntries2.attendee]),
        admissiblePubKeyPairs: [
          [pod1.signerPublicKey, pod2.signerPublicKey],
          [
            "f71b62538fbc40df0d5e5b2034641ae437bdbf06012779590099456cf25b5f8f",
            "755224af31d5b5e47cc6ca8827b8bf9d2ceba48bf439907abaade0a3269d561b"
          ],
          [
            "f27205e5ceeaad24025652cc9f6f18cee5897266f8c0aac5b702d48e0dea3585",
            "2af47e1aaf8f0450b9fb2e429042708ec7d173c4ac4329747db1063b78db4e0d"
          ]
        ].map(([key1, key2]) => [
          PODEdDSAPublicKeyValue(key1),
          PODEdDSAPublicKeyValue(key2)
        ])
      },
      watermark
    };
    const expectedRevealedClaims: GPCRevealedClaims = {
      pods: {
        pod1: {
          entries: { G: { type: "int", value: 7n } }
        }
      },
      owner: {
        externalNullifier,
        nullifierHashV3: poseidon2([
          makeWatermarkSignal(externalNullifier),
          ownerIdentity.nullifier
        ])
      },
      membershipLists: proofInputs.membershipLists,
      watermark
    };

    await gpcProofTest(proofConfig, proofInputs, expectedRevealedClaims);
  });

  it("proving should throw on illegal inputs", async function () {
    const { proofConfig, proofInputs } = makeMinimalArgs(true);

    async function doIllegalArgTest(
      proofConfig: GPCProofConfig,
      proofInputs: GPCProofInputs,
      errorType: string,
      errorMessage: string
    ): Promise<void> {
      // Expected error should be thrown by gpcProve.
      await expectAsyncError(
        async () => {
          await gpcProve(proofConfig, proofInputs, GPC_TEST_ARTIFACTS_PATH);
        },
        errorType,
        errorMessage
      );

      // The same error should be seen in gpcCheckProvable.
      // This isn't async, but use expectAsyncError for consistency of args.
      await expectAsyncError(
        async () => {
          gpcCheckProvable(proofConfig, proofInputs);
        },
        errorType,
        errorMessage
      );
    }

    // Config is illegal.
    await doIllegalArgTest(
      {
        ...proofConfig,
        pods: {
          somePodName: { entries: {} }
        }
      },
      proofInputs,
      "TypeError",
      "Must prove at least one entry in object"
    );

    const pod1 = POD.sign(sampleEntries, privateKey);
    await doIllegalArgTest(
      {
        pods: {
          pod1: {
            entries: {
              A: {
                isRevealed: false,
                inRange: { min: POD_INT_MIN, max: POD_INT_MAX },
                greaterThan: "pod2.H"
              }
            }
          },
          pod2: {
            entries: {
              H: { isRevealed: false }
            }
          }
        }
      },
      { pods: { pod1, pod2: pod1 } },
      "Error",
      "Entry pod2.H requires a bounds check to be used in an entry inequality."
    );

    await doIllegalArgTest(
      {
        ...proofConfig,
        tuples: {
          someTupleName: { entries: [] }
        }
      },
      proofInputs,
      "TypeError",
      "Tuple someTupleName specifies invalid tuple configuration. Tuples must have arity at least 2."
    );

    await doIllegalArgTest(
      {
        pods: {
          somePodName: {
            entries: {
              ticketID: {
                isRevealed: true,
                isMemberOf: "specialTickets",
                isNotMemberOf: "inadmissibleTickets"
              }
            }
          }
        }
      },
      {
        ...proofInputs,
        membershipLists: {
          inadmissibleTickets: [sampleEntries2.attendee, sampleEntries.J],
          specialTickets: [sampleEntries2.ticketID]
        }
      },
      "Error",
      "Both membership and non-membership lists are specified in the configuration of somePodName.ticketID."
    );

    // Input is illegal.
    await doIllegalArgTest(
      proofConfig,
      {
        ...proofInputs,
        watermark: { type: "string", value: 123n } as unknown as PODValue
      },
      "TypeError",
      "Invalid value for entry watermark"
    );

    await doIllegalArgTest(
      {
        pods: {
          somePodName: {
            entries: {
              ticketID: {
                isRevealed: true,
                isMemberOf: "admissibleTickets"
              }
            }
          }
        }
      },
      { ...proofInputs, membershipLists: { admissibleTickets: [] } },
      "Error",
      "Membership list admissibleTickets is empty."
    );

    // Config doesn't match input.
    await doIllegalArgTest(
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
      "ReferenceError",
      "Configured POD object wrongPODName not provided in inputs"
    );

    await doIllegalArgTest(
      {
        pods: {
          somePodName: {
            entries: {
              ticketID: {
                isRevealed: true,
                isMemberOf: "admissibleTickets"
              }
            }
          }
        }
      },
      proofInputs,
      "Error",
      'Config and input list mismatch.  Configuration expects lists ["admissibleTickets"].  Input contains [].'
    );

    await doIllegalArgTest(
      proofConfig,
      {
        ...proofInputs,
        membershipLists: {
          admissibleTickets: [sampleEntries2.ticketID, sampleEntries2.ticketID]
        }
      },
      "Error",
      'Config and input list mismatch.  Configuration expects lists [].  Input contains ["admissibleTickets"].'
    );

    await doIllegalArgTest(
      {
        pods: {
          somePodName: {
            entries: {
              ticketID: {
                isRevealed: true,
                isMemberOf: "admissibleTickets"
              }
            }
          }
        }
      },
      {
        ...proofInputs,
        membershipLists: {
          admissibleTickets: [
            [
              sampleEntries2.ticketID,
              sampleEntries.otherTicketID,
              sampleEntries.G
            ]
          ]
        }
      },
      "TypeError",
      'Membership list admissibleTickets in input contains element of width 3 while comparison value with identifier "somePodName.ticketID" has width 1.'
    );

    await doIllegalArgTest(
      {
        pods: {
          somePodName: {
            entries: {
              ticketID: {
                isRevealed: true,
                isNotMemberOf: "inadmissibleTickets"
              }
            }
          }
        }
      },
      {
        ...proofInputs,
        membershipLists: {
          inadmissibleTickets: [
            sampleEntries2.ticketID,
            sampleEntries.otherTicketID,
            sampleEntries.G
          ]
        }
      },
      "Error",
      'Comparison value {"cryptographic":999} corresponding to identifier "somePodName.ticketID" is a member of list "inadmissibleTickets".'
    );

    await doIllegalArgTest(
      {
        ...proofConfig,
        tuples: {
          tuple1: {
            entries: ["somePodName.ticketID", "somePodName.ticketID"],
            isMemberOf: "list1"
          }
        }
      },
      {
        ...proofInputs,
        membershipLists: {
          list1: [
            [sampleEntries2.ticketID, sampleEntries2.ticketID],
            [
              sampleEntries2.ticketID,
              sampleEntries.G,
              sampleEntries.otherTicketID
            ],
            [sampleEntries.otherTicketID, sampleEntries.G]
          ]
        }
      },
      "TypeError",
      "Membership list list1 in input has a type mismatch: It contains an element of width 2 and one of width 3."
    );

    await doIllegalArgTest(
      {
        ...proofConfig,
        tuples: {
          tuple1: {
            entries: ["somePodName.ticketID", "somePodName.ticketID"],
            isMemberOf: "list1"
          }
        }
      },
      {
        ...proofInputs,
        membershipLists: {
          list1: [
            [sampleEntries2.ticketID, sampleEntries2.ticketID],
            [sampleEntries2.ticketID],
            [sampleEntries.otherTicketID, sampleEntries.G]
          ]
        }
      },
      "TypeError",
      "Membership list list1 in input contains an invalid tuple. Tuples must have arity at least 2."
    );

    await doIllegalArgTest(
      {
        ...proofConfig,
        pods: {
          ...proofConfig.pods,
          someOtherPodName: {
            entries: { ticketID: { isRevealed: false } },
            signerPublicKey: { isRevealed: false }
          }
        },
        uniquePODs: true
      },
      {
        ...proofInputs,
        pods: {
          ...proofInputs.pods,
          someOtherPodName: proofInputs.pods.somePodName
        }
      },
      "Error",
      "Proof configuration specifies that the PODs should have unique content IDs, but they don't."
    );
  });

  it("verifying should throw on illegal inputs", async function () {
    // Proof data without lists and tuples
    const { proofConfig, proofInputs } = makeMinimalArgs(true);
    const { proof, boundConfig, revealedClaims } = await gpcProve(
      proofConfig,
      proofInputs,
      GPC_TEST_ARTIFACTS_PATH
    );

    // Proof data with lists and tuples
    const { proofConfig: proofConfig2, proofInputs: proofInputs2 } =
      makeMinimalArgs(true, true, true);
    const {
      proof: proof2,
      boundConfig: boundConfig2,
      revealedClaims: revealedClaims2
    } = await gpcProve(proofConfig2, proofInputs2, GPC_TEST_ARTIFACTS_PATH);

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

    await expectAsyncError(
      async () => {
        await gpcVerify(
          proof,
          {
            ...boundConfig,
            pods: {
              somePodName: {
                entries: {
                  ticketID: {
                    isRevealed: true,
                    isMemberOf: "specialTickets",
                    isNotMemberOf: "inadmissibleTickets"
                  }
                }
              }
            }
          },
          {
            ...revealedClaims,
            membershipLists: {
              inadmissibleTickets: [sampleEntries2.attendee, sampleEntries.J],
              specialTickets: [sampleEntries2.ticketID]
            }
          },
          GPC_TEST_ARTIFACTS_PATH
        );
      },
      "Error",
      "Both membership and non-membership lists are specified in the configuration of somePodName.ticketID."
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

    await expectAsyncError(
      async () => {
        await gpcVerify(
          proof2,
          boundConfig2,
          {
            ...revealedClaims2,
            membershipLists: {
              ...revealedClaims2.membershipLists,
              inadmissibleTickets: []
            }
          },
          GPC_TEST_ARTIFACTS_PATH
        );
      },
      "Error",
      "Membership list inadmissibleTickets is empty."
    );

    await expectAsyncError(
      async () => {
        await gpcVerify(
          proof2,
          boundConfig2,
          {
            ...revealedClaims2,
            membershipLists: {
              admissibleTicketPairs: [
                [sampleEntries2.ticketID, sampleEntries2.ticketID],
                [
                  sampleEntries2.ticketID,
                  sampleEntries.G,
                  sampleEntries.otherTicketID
                ],
                [sampleEntries.otherTicketID, sampleEntries.G]
              ]
            }
          },
          GPC_TEST_ARTIFACTS_PATH
        );
      },
      "TypeError",
      "Membership list admissibleTicketPairs in input has a type mismatch: It contains an element of width 2 and one of width 3."
    );

    await expectAsyncError(
      async () => {
        await gpcVerify(
          proof2,
          boundConfig2,
          {
            ...revealedClaims2,
            membershipLists: {
              admissibleTicketPairs: [
                [sampleEntries2.ticketID, sampleEntries2.ticketID],
                [sampleEntries2.ticketID],
                [sampleEntries.otherTicketID, sampleEntries.G]
              ]
            }
          },
          GPC_TEST_ARTIFACTS_PATH
        );
      },
      "TypeError",
      "Membership list admissibleTicketPairs in input contains an invalid tuple. Tuples must have arity at least 2."
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

    await expectAsyncError(
      async () => {
        await gpcVerify(
          proof,
          boundConfig,
          {
            ...revealedClaims,
            pods: {
              ...revealedClaims.pods,
              wrongPOD: {
                signerPublicKey:
                  "f71b62538fbc40df0d5e5b2034641ae437bdbf06012779590099456cf25b5f8f"
              }
            }
          },
          GPC_TEST_ARTIFACTS_PATH
        );
      },
      "ReferenceError",
      "Revealed claims contain POD(s) not present in the proof configuration. Revealed claims contain PODs somePodName,wrongPOD while the configuration contains PODs somePodName."
    );

    await expectAsyncError(
      async () => {
        await gpcVerify(
          proof2,
          boundConfig2,
          {
            ...revealedClaims2,
            membershipLists: {
              admissibleTicketPairs: (revealedClaims2.membershipLists ?? {})
                .admissibleTicketPairs as PODValueTuple[]
            }
          },
          GPC_TEST_ARTIFACTS_PATH
        );
      },
      "Error",
      'Config and input list mismatch.  Configuration expects lists ["inadmissibleTickets","admissibleTicketPairs"].  Input contains ["admissibleTicketPairs"].'
    );
  });

  it("should not verify tampered args which pass compiler checks", async function () {
    // Proof data without lists and tuples
    const { proofConfig, proofInputs } = makeMinimalArgs(true);
    const { proof, boundConfig, revealedClaims } = await gpcProve(
      proofConfig,
      proofInputs,
      GPC_TEST_ARTIFACTS_PATH
    );

    // Proof data with lists and tuples
    const { proofConfig: proofConfig2, proofInputs: proofInputs2 } =
      makeMinimalArgs(true, true, true);
    const {
      proof: proof2,
      boundConfig: boundConfig2,
      revealedClaims: revealedClaims2
    } = await gpcProve(proofConfig2, proofInputs2, GPC_TEST_ARTIFACTS_PATH);

    // Proof data with a duplicate POD
    const proofConfig3 = {
      ...proofConfig,
      pods: {
        ...proofConfig.pods,
        someOtherPodName: {
          entries: { ticketID: { isRevealed: false } },
          signerPublicKey: { isRevealed: false }
        }
      }
    };
    const proofInputs3 = {
      ...proofInputs,
      pods: {
        ...proofInputs.pods,
        someOtherPodName: proofInputs.pods.somePodName
      }
    };
    const {
      proof: proof3,
      boundConfig: boundConfig3,
      revealedClaims: revealedClaims3
    } = await gpcProve(proofConfig3, proofInputs3, GPC_TEST_ARTIFACTS_PATH);

    // Proof data with bounds checks
    const proofConfig4: GPCProofConfig = {
      pods: {
        pod1: {
          entries: {
            A: {
              isRevealed: false,
              inRange: { min: POD_INT_MIN, max: POD_INT_MAX },
              greaterThan: "pod2.H"
            }
          }
        },
        pod2: {
          entries: {
            H: {
              isRevealed: false,
              inRange: { min: POD_INT_MIN, max: POD_INT_MAX }
            }
          }
        }
      }
    };
    const proofInputs4 = { pods: { pod1, pod2: pod1 } };
    const {
      proof: proof4,
      boundConfig: boundConfig4,
      revealedClaims: revealedClaims4
    } = await gpcProve(proofConfig4, proofInputs4, GPC_TEST_ARTIFACTS_PATH);

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
          nullifierHashV3: 1234n
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
            ...revealedClaims.pods.somePodName,
            entries: {
              ticketID: { type: "cryptographic", value: 111111n }
            }
          }
        }
      },
      GPC_TEST_ARTIFACTS_PATH
    );
    expect(isVerified).to.be.false;

    // Tamper with membership list
    isVerified = await gpcVerify(
      proof2,
      boundConfig2,
      {
        ...revealedClaims2,
        membershipLists: {
          admissibleTicketPairs: (revealedClaims2.membershipLists ?? {})
            .admissibleTicketPairs as PODValueTuple[],
          inadmissibleTickets: [sampleEntries2.ticketID, sampleEntries.owner]
        }
      },
      GPC_TEST_ARTIFACTS_PATH
    );
    expect(isVerified).to.be.false;

    // Tamper with entry inequality
    isVerified = await gpcVerify(
      proof4,
      {
        ...boundConfig4,
        pods: {
          ...boundConfig4.pods,
          pod1: {
            entries: {
              A: {
                isRevealed: false,
                inRange: { min: POD_INT_MIN, max: POD_INT_MAX },
                lessThan: "pod2.H"
              }
            }
          }
        }
      },
      revealedClaims4,
      GPC_TEST_ARTIFACTS_PATH
    );
    expect(isVerified).to.be.false;

    // Tamper with POD uniqueness flag
    isVerified = await gpcVerify(
      proof3,
      { ...boundConfig3, uniquePODs: true },
      revealedClaims3,
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
        expected: `/artifacts/proto-pod-gpc/${GPC_ARTIFACTS_NPM_VERSION}`
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
        expected: "/artifacts/proto-pod-gpc/foo"
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
        expected: `artifacts/proto-pod-gpc/${GPC_ARTIFACTS_NPM_VERSION}`
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
        expected: "artifacts/proto-pod-gpc/foo"
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
        expected: `https://zupass.org/artifacts/proto-pod-gpc/${GPC_ARTIFACTS_NPM_VERSION}`
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
        expected: "https://zupass.org/artifacts/proto-pod-gpc/foo"
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
        expected: `https://unpkg.com/@pcd/proto-pod-gpc-artifacts@${GPC_ARTIFACTS_NPM_VERSION}`
      },
      {
        stability: "prod",
        version: undefined,
        zupassURL: undefined,
        expected: `https://unpkg.com/@pcd/proto-pod-gpc-artifacts@${GPC_ARTIFACTS_NPM_VERSION}`
      },
      {
        stability: "test",
        version: undefined,
        zupassURL: "https://zupass.org",
        expected: `https://unpkg.com/@pcd/proto-pod-gpc-artifacts@${GPC_ARTIFACTS_NPM_VERSION}`
      },
      {
        stability: "prod",
        version: undefined,
        zupassURL: "https://zupass.org",
        expected: `https://unpkg.com/@pcd/proto-pod-gpc-artifacts@${GPC_ARTIFACTS_NPM_VERSION}`
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
