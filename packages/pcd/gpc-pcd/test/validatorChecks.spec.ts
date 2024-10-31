import { GPCProofConfig, proofConfigToJSON, SEMAPHORE_V3 } from "@pcd/gpc";
import { POD, POD_INT_MAX, POD_INT_MIN } from "@pcd/pod";
import { PODPCD } from "@pcd/pod-pcd";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { expect } from "chai";
import "mocha";
import { v4 as uuid } from "uuid";
import { FixedPODEntries } from "../src";
import {
  checkPCDType,
  checkPODAgainstPrescribedSignerPublicKeys,
  checkPODEntriesAgainstMembershipLists,
  checkPODEntriesAgainstPrescribedEntries,
  checkPODEntriesAgainstProofConfig,
  checkPrescribedEntriesAgainstProofConfig,
  checkPrescribedSignerPublicKeysAgainstProofConfig
} from "../src/validatorChecks";
import {
  ownerIdentity,
  privateKey,
  sampleEntries0,
  sampleEntries1
} from "./common";

const pod0 = POD.sign(sampleEntries0, privateKey);
const podPCD0 = new PODPCD(uuid(), pod0);

const proofConfig: GPCProofConfig = {
  pods: {
    pod0: {
      entries: {
        A: { isRevealed: true },
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
        },
        eventID: {
          isRevealed: true
        }
      }
    }
  }
};

describe("PCD type check should work", () => {
  it("should pass for a PODPCD.", () => {
    expect(checkPCDType(podPCD0)).to.be.true;
  });

  it("should fail for another type of PCD.", async () => {
    const identityPCD = (await SemaphoreIdentityPCDPackage.prove({
      identityV3: ownerIdentity
    })) as unknown as PODPCD;
    expect(checkPCDType(identityPCD)).to.be.false;
  });
});

describe("POD entry check against proof configuration should work", () => {
  it("should fail for a proof configuration not containing the named POD", () => {
    const proofConfig = {
      pods: {
        pod0: {
          entries: {
            A: { isRevealed: true }
          }
        }
      }
    };
    const params = {
      proofConfig: proofConfigToJSON(proofConfig),
      notFoundMessage: undefined
    };
    expect(
      checkPODEntriesAgainstProofConfig("pod1", podPCD0, proofConfig, params)
    ).to.be.false;
    expect(params.notFoundMessage).to.eq(
      `The proof configuration does not contain this POD.`
    );
  });

  it("should fail for a named POD not containing the proof configuration's entries", () => {
    const proofConfig = {
      pods: {
        pod0: {
          entries: {
            Entry: { isRevealed: true }
          }
        }
      }
    };
    const params = {
      proofConfig: proofConfigToJSON(proofConfig),
      notFoundMessage: undefined
    };
    expect(
      checkPODEntriesAgainstProofConfig("pod0", podPCD0, proofConfig, params)
    ).to.be.false;
    expect(params.notFoundMessage).to.be.undefined;
  });

  it("should pass for a named POD containing a named entry satisfying prescribed bounds", () => {
    for (const boundsCheckConfig of [
      { inRange: { min: 0n, max: POD_INT_MAX } },
      { inRange: { min: POD_INT_MIN, max: 124n } },
      { inRange: { min: 0n, max: 124n } }
    ]) {
      const proofConfig: GPCProofConfig = {
        pods: {
          pod0: {
            entries: {
              A: { isRevealed: true, ...boundsCheckConfig },
              E: {
                isRevealed: false,
                equalsEntry: "pod0.A"
              }
            }
          }
        }
      };
      const params = {
        proofConfig: proofConfigToJSON(proofConfig),
        notFoundMessage: undefined
      };
      expect(
        checkPODEntriesAgainstProofConfig("pod0", podPCD0, proofConfig, params)
      ).to.be.true;
      expect(params.notFoundMessage).to.be.undefined;
    }
  });

  it("should fail for a named POD containing a named entry not satisfying prescribed bounds", () => {
    for (const boundsCheckConfig of [
      { inRange: { min: 124n, max: POD_INT_MAX } },
      { inRange: { min: POD_INT_MIN, max: 122n } },
      { inRange: { min: 0n, max: 122n } },
      { inRange: { min: 124n, max: 256n } }
    ]) {
      const proofConfig: GPCProofConfig = {
        pods: {
          pod0: {
            entries: {
              A: { isRevealed: true, ...boundsCheckConfig },
              E: { isRevealed: false, equalsEntry: "pod0.A" }
            }
          }
        }
      };
      const params = {
        proofConfig: proofConfigToJSON(proofConfig),
        notFoundMessage: undefined
      };
      expect(
        checkPODEntriesAgainstProofConfig("pod0", podPCD0, proofConfig, params)
      ).to.be.false;
      expect(params.notFoundMessage).to.be.undefined;
    }
  });

  it("should fail for a named POD containing a named non-int entry that should satisfy given bounds", () => {
    for (const boundsCheckConfig of [
      { inRange: { min: 0n, max: POD_INT_MAX } },
      { inRange: { min: POD_INT_MIN, max: 124n } },
      { inRange: { min: 0n, max: 124n } }
    ]) {
      const proofConfig: GPCProofConfig = {
        pods: {
          pod0: {
            entries: {
              A: { isRevealed: true },
              E: {
                isRevealed: false,
                equalsEntry: "pod0.A",
                ...boundsCheckConfig
              }
            }
          }
        }
      };
      const params = {
        proofConfig: proofConfigToJSON(proofConfig),
        notFoundMessage: undefined
      };
      expect(
        checkPODEntriesAgainstProofConfig("pod0", podPCD0, proofConfig, params)
      ).to.be.false;
      expect(params.notFoundMessage).to.be.undefined;
    }
  });

  it("should pass for a named POD containing all entries in the proof configuration", () => {
    const proofConfig: GPCProofConfig = {
      pods: {
        pod0: {
          entries: {
            A: { isRevealed: true },
            E: { isRevealed: false, equalsEntry: "pod0.A" }
          }
        }
      }
    };
    const params = {
      proofConfig: proofConfigToJSON(proofConfig),
      notFoundMessage: undefined
    };
    expect(
      checkPODEntriesAgainstProofConfig("pod0", podPCD0, proofConfig, params)
    ).to.be.true;
    expect(params.notFoundMessage).to.be.undefined;
  });
});

describe("POD entry check against membership lists should work", () => {
  it("should pass if there are no membership lists to check", () => {
    expect(
      checkPODEntriesAgainstMembershipLists(
        "pod0",
        podPCD0,
        proofConfig,
        undefined
      )
    ).to.be.true;
  });

  it("should fail if a list membership check fails", () => {
    const membershipLists = {
      admissibleOwners: [sampleEntries0.F, sampleEntries0.C],
      admissibleTickets: [
        sampleEntries0.C,
        sampleEntries0.owner,
        sampleEntries1.ticketID
      ]
    };
    expect(
      checkPODEntriesAgainstMembershipLists(
        "pod0",
        podPCD0,
        proofConfig,
        membershipLists
      )
    ).to.be.false;
  });

  it("should pass if all list membership checks pass", () => {
    const membershipLists = {
      admissibleOwners: [
        sampleEntries0.F,
        sampleEntries0.C,
        sampleEntries0.owner
      ],
      admissibleTickets: [
        sampleEntries0.C,
        sampleEntries0.owner,
        sampleEntries1.ticketID
      ]
    };
    expect(
      checkPODEntriesAgainstMembershipLists(
        "pod0",
        podPCD0,
        proofConfig,
        membershipLists
      )
    ).to.be.true;
  });
});

describe("Prescribed entry check against proof configuration should work", () => {
  it("should pass if there are no prescribed entries", () => {
    const params = { notFoundMessage: undefined };
    expect(
      checkPrescribedEntriesAgainstProofConfig(
        "pod0",
        proofConfig,
        undefined,
        params
      )
    ).to.be.true;
    expect(params.notFoundMessage).to.be.undefined;
  });

  it("should fail if prescribed entries are not in the proof configuration", () => {
    const params = { notFoundMessage: undefined };
    const prescribedEntries: FixedPODEntries = {
      pod0: {
        A: { type: "int", value: 123n },
        someEntry: { type: "cryptographic", value: 8n }
      },
      ticketPOD: {
        eventID: { type: "cryptographic", value: 456n }
      }
    };
    expect(
      checkPrescribedEntriesAgainstProofConfig(
        "pod0",
        proofConfig,
        prescribedEntries,
        params
      )
    ).to.be.false;
    expect(params.notFoundMessage).to.eq(
      "Invalid prescribed entries: Not all entries are present in the proof configuration."
    );
  });

  it("should fail if prescribed entries are not revealed in the proof configuration", () => {
    const params = { notFoundMessage: undefined };
    const prescribedEntries: FixedPODEntries = {
      pod0: {
        A: { type: "int", value: 123n },
        owner: { type: "cryptographic", value: 57n }
      },
      ticketPOD: {
        eventID: { type: "cryptographic", value: 456n }
      }
    };
    expect(
      checkPrescribedEntriesAgainstProofConfig(
        "pod0",
        proofConfig,
        prescribedEntries,
        params
      )
    ).to.be.false;
    expect(params.notFoundMessage).to.eq(
      "Prescribed entry is not revealed in proof configuration!"
    );
  });

  it("should pass if all prescribed entries are revealed entries in the proof configuration", () => {
    const params = { notFoundMessage: undefined };
    const prescribedEntries: FixedPODEntries = {
      pod0: {
        A: { type: "int", value: 123n }
      },
      ticketPOD: {
        eventID: { type: "cryptographic", value: 456n }
      }
    };
    expect(
      checkPrescribedEntriesAgainstProofConfig(
        "pod0",
        proofConfig,
        prescribedEntries,
        params
      )
    ).to.be.true;
    expect(
      checkPrescribedEntriesAgainstProofConfig(
        "ticketPOD",
        proofConfig,
        prescribedEntries,
        params
      )
    ).to.be.true;
    expect(params.notFoundMessage).to.be.undefined;
  });
});

describe("Prescribed signer public key check against proof configuration should work", () => {
  it("should pass if there are no prescribed signer public keys", () => {
    const params = { notFoundMessage: undefined };
    expect(
      checkPrescribedSignerPublicKeysAgainstProofConfig(
        "pod0",
        proofConfig,
        undefined,
        params
      )
    ).to.be.true;
    expect(params.notFoundMessage).to.be.undefined;
  });

  it("should fail if POD corresponding to prescribed signer public key is not in the proof configuration", () => {
    const params = { notFoundMessage: undefined };
    const prescribedSignerPublicKeys = {
      somePOD: "su2CUR47c1us1FwPUN3RNZWzit9nmya2QD60Y/iffxI"
    };

    expect(
      checkPrescribedSignerPublicKeysAgainstProofConfig(
        "somePOD",
        proofConfig,
        prescribedSignerPublicKeys,
        params
      )
    ).to.be.false;
    expect(params.notFoundMessage).to.eq(
      "Invalid prescribed signer public key: Corresponding POD somePOD is not present in the proof configuration."
    );
  });

  it("should fail if prescribed signer public keys are not revealed in the proof configuration", () => {
    const params = { notFoundMessage: undefined };
    const prescribedSignerPublicKeys = {
      pod0: "su2CUR47c1us1FwPUN3RNZWzit9nmya2QD60Y/iffxI"
    };
    const proofConfig: GPCProofConfig = {
      pods: {
        pod0: {
          entries: {
            A: { isRevealed: true },
            E: { isRevealed: false, equalsEntry: "pod0.A" },
            owner: {
              isRevealed: false,
              isOwnerID: SEMAPHORE_V3,
              isMemberOf: "admissibleOwners"
            }
          },
          signerPublicKey: {
            isRevealed: false,
            isMemberOf: "someKeyList" // Not strictly necessary for this test,
            // but it is worth keeping in mind that
            // this key should be constrained in some
            // sense!
          }
        }
      }
    };
    expect(
      checkPrescribedSignerPublicKeysAgainstProofConfig(
        "pod0",
        proofConfig,
        prescribedSignerPublicKeys,
        params
      )
    ).to.be.false;
    expect(params.notFoundMessage).to.eq(
      "Prescribed signer's public key is not revealed in proof configuration!"
    );
  });

  it("should pass if all prescribed signer public keys are revealed in the proof configuration", () => {
    const params = { notFoundMessage: undefined };
    const prescribedSignerPublicKeys = {
      pod0: "su2CUR47c1us1FwPUN3RNZWzit9nmya2QD60Y/iffxI",
      ticketPOD: "xDP3ppa3qjpSJO+zmTuvDM2eku7O4MKaP2yCCKnoHZ4"
    };
    expect(
      checkPrescribedSignerPublicKeysAgainstProofConfig(
        "pod0",
        proofConfig,
        prescribedSignerPublicKeys,
        params
      )
    ).to.be.true;
    expect(
      checkPrescribedSignerPublicKeysAgainstProofConfig(
        "ticketPOD",
        proofConfig,
        prescribedSignerPublicKeys,
        params
      )
    ).to.be.true;
    expect(params.notFoundMessage).to.be.undefined;
  });
});

describe("POD entry check against prescribed entries should work", () => {
  it("should pass if there are no prescribed entries", () => {
    expect(
      checkPODEntriesAgainstPrescribedEntries(
        "pod0",
        podPCD0.pod.content.asEntries(),
        undefined
      )
    ).to.be.true;
  });

  it("should fail if a POD entry disagrees with a prescribed entry", () => {
    expect(
      checkPODEntriesAgainstPrescribedEntries(
        "pod0",
        podPCD0.pod.content.asEntries(),
        {
          pod0: { A: { type: "int", value: 132n } }
        }
      )
    ).to.be.false;
  });

  it("should pass if the POD entries agree with the prescribed entries", () => {
    expect(
      checkPODEntriesAgainstPrescribedEntries(
        "pod0",
        podPCD0.pod.content.asEntries(),
        {
          pod0: { A: { type: "int", value: 123n } }
        }
      )
    ).to.be.true;
  });
});

describe("POD check against prescribed signers' public keys should work", () => {
  it("should pass if there are no prescribed signers' public keys", () => {
    const params = { notFoundMessage: undefined };
    expect(
      checkPODAgainstPrescribedSignerPublicKeys(
        "pod0",
        podPCD0.pod.signerPublicKey,
        undefined,
        params
      )
    ).to.be.true;
    expect(params.notFoundMessage).to.be.undefined;
  });

  it("should fail if a POD's signer's public key disagrees with a prescribed public key", () => {
    const params = { notFoundMessage: undefined };
    const prescribedSignerPublicKeys = {
      pod0: "su2CUR47c1us1FwPUN3RNZWzit9nmya2QD60Y/iffxI"
    };
    expect(
      checkPODAgainstPrescribedSignerPublicKeys(
        "pod0",
        podPCD0.pod.signerPublicKey,
        prescribedSignerPublicKeys,
        params
      )
    ).to.be.false;
    expect(params.notFoundMessage).to.be.undefined;
  });

  it("should fail if the prescribed public key has the wrong format", () => {
    const params = { notFoundMessage: undefined };
    const prescribedSignerPublicKeys = {
      pod0: "Not a key"
    };
    expect(
      checkPODAgainstPrescribedSignerPublicKeys(
        "pod0",
        podPCD0.pod.signerPublicKey,
        prescribedSignerPublicKeys,
        params
      )
    ).to.be.false;
    expect(params.notFoundMessage).to.be.eq(
      "Public key should be 32 bytes, encoded as hex or Base64."
    );
  });

  it("should pass if the POD's signer's public key agrees with the prescribed public key", () => {
    const params = { notFoundMessage: undefined };
    const prescribedSignerPublicKeys = {
      pod0: "xDP3ppa3qjpSJO+zmTuvDM2eku7O4MKaP2yCCKnoHZ4"
    };
    expect(
      checkPODAgainstPrescribedSignerPublicKeys(
        "pod0",
        podPCD0.pod.signerPublicKey,
        prescribedSignerPublicKeys,
        params
      )
    ).to.be.true;
    expect(params.notFoundMessage).to.be.undefined;
  });
});
