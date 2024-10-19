import {
  GPCProofConfig,
  SEMAPHORE_V3,
  gpcBindConfig,
  podMembershipListsToJSON,
  proofConfigToJSON
} from "@pcd/gpc";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { POD, PODEdDSAPublicKeyValue, POD_INT_MAX } from "@pcd/pod";
import { PODPCD, PODPCDPackage } from "@pcd/pod-pcd";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { expect } from "chai";
import "mocha";
import path from "path";
import { v4 as uuid } from "uuid";
import {
  GPCPCDArgs,
  GPCPCDPackage,
  fixedPODEntriesToJSON,
  getProveDisplayOptions
} from "../src";
import {
  ownerIdentity,
  privateKey,
  privateKey2,
  sampleEntries0,
  sampleEntries1
} from "./common";

export const GPC_TEST_ARTIFACTS_PATH = path.join(
  __dirname,
  "../../../lib/gpcircuits/artifacts/test"
);

export const GPC_NPM_ARTIFACTS_PATH = path.join(
  __dirname,
  "../../../../node_modules/@pcd/proto-pod-gpc-artifacts"
);

describe("GPCPCD should work", async function () {
  async function runGPCPCDTest(artifactsPath: string): Promise<void> {
    GPCPCDPackage.init?.({ zkArtifactPath: artifactsPath });

    const proofConfig: GPCProofConfig = {
      pods: {
        pod0: {
          entries: {
            A: { isRevealed: true, inRange: { min: 100n, max: 256n } },
            E: { isRevealed: false, equalsEntry: "pod0.A" },
            owner: {
              isRevealed: false,
              isOwnerID: SEMAPHORE_V3,
              isMemberOf: "admissibleOwners"
            }
          }
        },
        ticketPOD: {
          entries: {
            ticketID: {
              isRevealed: false,
              isMemberOf: "admissibleTickets"
            }
          },
          signerPublicKey: {
            isRevealed: false,
            isMemberOf: "admissibleTicketIssuers"
          }
        }
      },
      tuples: {
        pair: { entries: ["pod0.A", "pod0.E"], isMemberOf: "admissiblePairs" }
      }
    };

    const pod0 = POD.sign(sampleEntries0, privateKey);
    const podPCD0 = new PODPCD(uuid(), pod0);

    const ticketPOD = POD.sign(sampleEntries1, privateKey2);
    const ticketPODPCD = new PODPCD(uuid(), ticketPOD);

    const identityPCD = await SemaphoreIdentityPCDPackage.prove({
      identityV3: ownerIdentity
    });

    const proveArgs: GPCPCDArgs = {
      proofConfig: {
        argumentType: ArgumentTypeName.Object,
        value: proofConfigToJSON(proofConfig)
      },
      pods: {
        value: {
          pod0: {
            value: await PODPCDPackage.serialize(podPCD0),
            argumentType: ArgumentTypeName.PCD
          },
          ticketPOD: {
            value: await PODPCDPackage.serialize(ticketPODPCD),
            argumentType: ArgumentTypeName.PCD
          }
        },
        argumentType: ArgumentTypeName.RecordContainer
      },
      identity: {
        value: await SemaphoreIdentityPCDPackage.serialize(identityPCD),
        argumentType: ArgumentTypeName.PCD
      },
      externalNullifier: {
        value: "some external nullifier",
        argumentType: ArgumentTypeName.Object
      },
      watermark: {
        value: { cryptographic: 12345 },
        argumentType: ArgumentTypeName.Object
      },
      membershipLists: {
        value: podMembershipListsToJSON({
          admissibleOwners: [
            sampleEntries0.F,
            sampleEntries0.C,
            sampleEntries0.owner
          ],
          admissiblePairs: [
            [sampleEntries0.D, sampleEntries0.B],
            [sampleEntries0.A, sampleEntries0.E],
            [sampleEntries0.owner, sampleEntries0.I],
            [sampleEntries0.J, sampleEntries0.H]
          ],
          admissibleTickets: [
            sampleEntries0.C,
            sampleEntries0.owner,
            sampleEntries1.ticketID
          ],
          admissibleTicketIssuers: [
            ticketPOD.signerPublicKey,
            "f71b62538fbc40df0d5e5b2034641ae437bdbf06012779590099456cf25b5f8f",
            "755224af31d5b5e47cc6ca8827b8bf9d2ceba48bf439907abaade0a3269d561b"
          ].map(PODEdDSAPublicKeyValue)
        }),
        argumentType: ArgumentTypeName.Object
      },
      id: {
        argumentType: ArgumentTypeName.String,
        value: uuid()
      }
    };
    const gpcPCD = await GPCPCDPackage.prove(proveArgs);
    expect(gpcPCD.claim.config).to.deep.eq(
      gpcBindConfig(proofConfig).boundConfig
    );
    expect(gpcPCD.claim.revealed.pods.pod0.signerPublicKey).to.eq(
      pod0.signerPublicKey
    );
    expect(gpcPCD.claim.revealed.pods.pod0.entries?.A?.value).to.eq(123n);
    expect(gpcPCD.claim.revealed.pods.ticketPOD).to.be.undefined;
    expect(gpcPCD.claim.revealed.owner?.externalNullifier).to.not.be.undefined;
    expect(gpcPCD.claim.revealed.owner?.nullifierHashV3).to.not.be.undefined;
    expect(gpcPCD.claim.revealed.watermark?.value).to.eq(12345n);
    expect(gpcPCD.claim.config.circuitIdentifier).to.eq(
      "proto-pod-gpc_3o-10e-8md-4nv-2ei-4x20l-5x3t-1ov3-1ov4"
    );

    expect(await GPCPCDPackage.verify(gpcPCD)).to.be.true;

    const serialized = await GPCPCDPackage.serialize(gpcPCD);
    const deserialized = await GPCPCDPackage.deserialize(serialized.pcd);
    expect(await GPCPCDPackage.verify(deserialized)).to.be.true;
  }

  it("GPCPCD should prove and verify with test artifacts", async function () {
    // Confirms that the code in the repo is compatible with circuit
    // artifacts built from circuits in the repo.
    await runGPCPCDTest(GPC_TEST_ARTIFACTS_PATH);
  });

  it("GPCPCD should prove and verify with NPM artifacts", async function () {
    // Confirms that the code in the repo is compatible with circuit
    // artifacts released on NPM.
    await runGPCPCDTest(GPC_NPM_ARTIFACTS_PATH);
  });
});

describe("GPCPCD input POD validator should work", () => {
  const pod0 = POD.sign(sampleEntries0, privateKey);
  const podPCD0 = new PODPCD(uuid(), pod0);

  const ticketPOD = POD.sign(sampleEntries1, privateKey);
  const ticketPODPCD = new PODPCD(uuid(), ticketPOD);

  const jsonProofConfig = proofConfigToJSON({
    pods: {
      pod0: {
        entries: {
          A: { isRevealed: true, inRange: { min: 100n, max: POD_INT_MAX } },
          H: { isRevealed: true },
          E: { isRevealed: false, equalsEntry: "pod0.A" },
          owner: {
            isRevealed: false,
            isOwnerID: SEMAPHORE_V3,
            isMemberOf: "admissibleOwners"
          }
        }
      },
      ticketPOD: {
        entries: {
          eventID: {
            isRevealed: true
          },
          ticketID: {
            isRevealed: false,
            isMemberOf: "admissibleTickets"
          }
        }
      }
    },
    tuples: {
      pair: { entries: ["pod0.A", "pod0.E"], isMemberOf: "admissiblePairs" }
    }
  });

  const unserialisedMembershipLists = {
    admissibleOwners: [
      sampleEntries0.F,
      sampleEntries0.C,
      sampleEntries0.owner
    ],
    admissiblePairs: [
      [sampleEntries0.D, sampleEntries0.B],
      [sampleEntries0.A, sampleEntries0.E],
      [sampleEntries0.owner, sampleEntries0.I],
      [sampleEntries0.J, sampleEntries0.H]
    ],
    admissibleTickets: [
      sampleEntries0.C,
      sampleEntries0.owner,
      sampleEntries1.ticketID
    ]
  };

  const membershipLists = podMembershipListsToJSON(unserialisedMembershipLists);

  const defaultArgs = getProveDisplayOptions().defaultArgs;

  if (defaultArgs === undefined) {
    throw new ReferenceError("Default arguments are undefined.");
  }

  const validateInputPOD = defaultArgs.pods.validate;

  if (validateInputPOD === undefined) {
    throw new ReferenceError("Input POD validator is undefined.");
  }

  it("Should validate an input POD given no parameters", () => {
    expect(validateInputPOD("pod0", podPCD0, undefined)).to.be.true;
  });

  it("Should validate an input POD given no proof configuration", () => {
    expect(validateInputPOD("pod0", podPCD0, {})).to.be.true;
  });

  it("Should validate input PODs containing entries in a given proof configuration", () => {
    const params = { proofConfig: jsonProofConfig };
    expect(validateInputPOD("pod0", podPCD0, params)).to.be.true;
    expect(validateInputPOD("ticketPOD", ticketPODPCD, params)).to.be.true;
  });

  it("Should validate input PODs with prescribed entries", () => {
    const prescribedEntries = fixedPODEntriesToJSON({
      pod0: {
        A: { type: "int", value: 123n },
        H: { type: "cryptographic", value: 8n }
      },
      ticketPOD: {
        eventID: { type: "cryptographic", value: 456n }
      }
    });
    const params = { proofConfig: jsonProofConfig, prescribedEntries };
    expect(validateInputPOD("pod0", podPCD0, params)).to.be.true;
    expect(validateInputPOD("ticketPOD", ticketPODPCD, params)).to.be.true;
  });

  it("Should validate input PODs with prescribed entry bounds", () => {
    const params = {
      proofConfig: proofConfigToJSON({
        pods: {
          pod0: {
            entries: {
              A: { isRevealed: false, inRange: { min: 100n, max: 256n } },
              H: { isRevealed: false, inRange: { min: 3n, max: POD_INT_MAX } }
            }
          },
          ticketPOD: {
            entries: {
              eventID: {
                isRevealed: true
              },
              ticketID: {
                isRevealed: false,
                isMemberOf: "admissibleTickets"
              }
            }
          }
        }
      })
    };
    expect(validateInputPOD("pod0", podPCD0, params)).to.be.true;
    expect(validateInputPOD("ticketPOD", ticketPODPCD, params)).to.be.true;
  });

  it("Should validate input PODs with prescribed signers' public keys", () => {
    const prescribedSignerPublicKeys = {
      pod0: "xDP3ppa3qjpSJO+zmTuvDM2eku7O4MKaP2yCCKnoHZ4",
      ticketPOD: "xDP3ppa3qjpSJO+zmTuvDM2eku7O4MKaP2yCCKnoHZ4"
    };
    const params = { proofConfig: jsonProofConfig, prescribedSignerPublicKeys };
    expect(validateInputPOD("pod0", podPCD0, params)).to.be.true;
    expect(validateInputPOD("ticketPOD", ticketPODPCD, params)).to.be.true;
  });

  it("Should validate input PODs with entries lying in membership lists", () => {
    const params = { proofConfig: jsonProofConfig, membershipLists };
    expect(validateInputPOD("pod0", podPCD0, params)).to.be.true;
    expect(validateInputPOD("ticketPOD", ticketPODPCD, params)).to.be.true;
  });

  it("Should validate input PODs with prescribed entries, signers' public keys and list membership requirements", () => {
    const prescribedEntries = fixedPODEntriesToJSON({
      pod0: {
        A: { type: "int", value: 123n },
        H: { type: "cryptographic", value: 8n }
      },
      ticketPOD: {
        eventID: { type: "cryptographic", value: 456n }
      }
    });
    const prescribedSignerPublicKeys = {
      pod0: "xDP3ppa3qjpSJO+zmTuvDM2eku7O4MKaP2yCCKnoHZ4",
      ticketPOD: "xDP3ppa3qjpSJO+zmTuvDM2eku7O4MKaP2yCCKnoHZ4"
    };
    const params = {
      proofConfig: jsonProofConfig,
      membershipLists,
      prescribedEntries,
      prescribedSignerPublicKeys
    };
    expect(validateInputPOD("pod0", podPCD0, params)).to.be.true;
    expect(validateInputPOD("ticketPOD", ticketPODPCD, params)).to.be.true;
  });

  it("Should not validate an input POD lacking entries in a given proof configuration", () => {
    const proofConfig = proofConfigToJSON({
      pods: {
        pod0: {
          entries: {
            A: { isRevealed: true },
            Example: { isRevealed: false, equalsEntry: "pod0.A" },
            owner: {
              isRevealed: false,
              isOwnerID: SEMAPHORE_V3,
              isMemberOf: "admissibleOwners"
            }
          }
        },
        ticketPOD: {
          entries: {
            ticketID: {
              isRevealed: false,
              isMemberOf: "admissibleTickets"
            }
          }
        }
      },
      tuples: {
        pair: {
          entries: ["pod0.A", "pod0.Example"],
          isMemberOf: "admissiblePairs"
        }
      }
    });
    expect(validateInputPOD("pod0", podPCD0, { proofConfig })).to.be.false;
    expect(validateInputPOD("ticketPOD", ticketPODPCD, { proofConfig })).to.be
      .true;
  });

  it("Should not validate an input POD violating a list membership requirement", () => {
    const membershipLists = podMembershipListsToJSON({
      ...unserialisedMembershipLists,
      admissibleOwners: [sampleEntries0.C, sampleEntries0.A]
    });
    const params = { proofConfig: jsonProofConfig, membershipLists };
    expect(validateInputPOD("pod0", podPCD0, params)).to.be.false;
  });

  it("Should not validate an input POD violating a prescribed entry value", () => {
    const prescribedEntries = fixedPODEntriesToJSON({
      pod0: {
        A: { type: "int", value: 0n },
        H: { type: "cryptographic", value: 8n }
      },
      ticketPOD: {
        eventID: { type: "cryptographic", value: 456n }
      }
    });
    const params = { proofConfig: jsonProofConfig, prescribedEntries };
    expect(validateInputPOD("pod0", podPCD0, params)).to.be.false;
    expect(validateInputPOD("ticketPOD", ticketPODPCD, params)).to.be.true;
  });

  it("Should not validate input PODs violating prescribed bounds", () => {
    const params = {
      proofConfig: proofConfigToJSON({
        pods: {
          pod0: {
            entries: {
              A: { isRevealed: false, inRange: { min: 200n, max: 256n } },
              H: { isRevealed: false, inRange: { min: 3n, max: POD_INT_MAX } }
            }
          },
          ticketPOD: {
            entries: {
              eventID: {
                isRevealed: true,
                inRange: { min: 8n, max: POD_INT_MAX }
              },
              ticketID: {
                isRevealed: false,
                isMemberOf: "admissibleTickets"
              }
            }
          }
        }
      })
    };
    expect(validateInputPOD("pod0", podPCD0, params)).to.be.false;
    expect(validateInputPOD("ticketPOD", ticketPODPCD, params)).to.be.false;
  });

  it("Should not validate an input POD violating a prescribed signer's public key", () => {
    const prescribedSignerPublicKeys = {
      pod0: "xDP3ppa3qjpSJO+zmTuvDM2eku7O4MKaP2yCCKnoHZ4",
      ticketPOD: "su2CUR47c1us1FwPUN3RNZWzit9nmya2QD60Y/iffxI"
    };
    const params = { proofConfig: jsonProofConfig, prescribedSignerPublicKeys };
    expect(validateInputPOD("pod0", podPCD0, params)).to.be.true;
    expect(validateInputPOD("ticketPOD", ticketPODPCD, params)).to.be.false;
  });
});
