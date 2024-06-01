import { ArgumentTypeName } from "@pcd/pcd-types";
import { POD, PODEntries } from "@pcd/pod";
import { BABY_JUB_NEGATIVE_ONE } from "@pcd/util";
import { expect } from "chai";
import "mocha";
import { PODPCD, PODPCDPackage, prove } from "../src";

// Key borrowed from https://github.com/iden3/circomlibjs/blob/4f094c5be05c1f0210924a3ab204d8fd8da69f49/test/eddsa.js#L103
export const privateKey = "AAECAwQFBgcICQABAgMEBQYHCAkAAQIDBAUGBwgJAAE"; // hex 0001020304050607080900010203040506070809000102030405060708090001

export const expectedPublicKey = "xDP3ppa3qjpSJO-zmTuvDM2eku7O4MKaP2yCCKnoHZ4";

export const sampleEntries = {
  E: { type: "cryptographic", value: 123n },
  F: { type: "cryptographic", value: BABY_JUB_NEGATIVE_ONE },
  C: { type: "string", value: "hello" },
  D: { type: "string", value: "foobar" },
  A: { type: "int", value: 123n },
  B: { type: "int", value: 321n },
  G: { type: "int", value: 7n },
  H: { type: "int", value: 8n },
  I: { type: "int", value: 9n },
  J: { type: "int", value: 10n }
} satisfies PODEntries;

describe("PODPCD Package", async function () {
  // Note: The @pcd/pod package has its own unit tests, so we're not trying
  // to duplicate that level of coverage here.  This suite should cover
  // behavior specific to the @pcd/pod-pcd packge.
  const pod = POD.sign(sampleEntries, privateKey);

  async function makePCD(id: string | undefined): Promise<PODPCD> {
    const pcd = await prove({
      entries: {
        value: sampleEntries,
        argumentType: ArgumentTypeName.Object
      },
      privateKey: {
        value: privateKey,
        argumentType: ArgumentTypeName.String
      },
      id: {
        value: id,
        argumentType: ArgumentTypeName.String
      }
    });
    return pcd;
  }

  it("should be created from POD object", function () {
    const pcd = new PODPCD("placeholder-id", pod);
    expect(pcd.id).to.eq("placeholder-id");
    expect(pcd.claim.entries).to.deep.eq(pod.content.asEntries());
    expect(pcd.claim.signerPublicKey).to.eq(expectedPublicKey);
    expect(pcd.proof.signature).to.eq(pod.signature);
  });

  it("should prove and verify with new ID", async function () {
    const pcd = await PODPCDPackage.prove({
      entries: {
        value: sampleEntries,
        argumentType: ArgumentTypeName.Object
      },
      privateKey: {
        value: privateKey,
        argumentType: ArgumentTypeName.String
      },
      id: {
        value: undefined,
        argumentType: ArgumentTypeName.String
      }
    });
    expect(await PODPCDPackage.verify(pcd)).to.be.true;
    expect(pcd.id).to.not.be.empty;
    expect(pcd.claim.entries).to.deep.eq(pod.content.asEntries());
    expect(pcd.claim.signerPublicKey).to.eq(expectedPublicKey);
    expect(pcd.proof.signature).to.eq(pod.signature);
  });

  it("should prove and verify with specified ID", async function () {
    const pcd = await PODPCDPackage.prove({
      entries: {
        value: sampleEntries,
        argumentType: ArgumentTypeName.Object
      },
      privateKey: {
        value: privateKey,
        argumentType: ArgumentTypeName.String
      },
      id: {
        value: "placeholder-id",
        argumentType: ArgumentTypeName.String
      }
    });
    expect(await PODPCDPackage.verify(pcd)).to.be.true;
    expect(pcd.id).to.eq("placeholder-id");
    expect(pcd.claim.entries).to.deep.eq(pod.content.asEntries());
    expect(pcd.claim.signerPublicKey).to.eq(expectedPublicKey);
    expect(pcd.proof.signature).to.eq(pod.signature);
  });

  it("should be possible to serialize and deserialize the pcd", async function () {
    const initialPCD = await makePCD("placeholder-id");
    const serialized = await PODPCDPackage.serialize(initialPCD);
    const deserialized = await PODPCDPackage.deserialize(serialized.pcd);
    expect(await PODPCDPackage.verify(deserialized)).to.be.true;
    expect(deserialized.id).to.eq("placeholder-id");
    expect(deserialized.claim.entries).to.deep.eq(pod.content.asEntries());
    expect(deserialized.claim.signerPublicKey).to.eq(expectedPublicKey);
    expect(deserialized.proof.signature).to.eq(pod.signature);
  });

  it("getDisplayOptions should work", async function () {
    const pcd = await makePCD("placeholder-id");
    if (PODPCDPackage.getDisplayOptions === undefined) {
      throw new Error("Missing getDisplayOptions");
    }
    const displayOptions = PODPCDPackage.getDisplayOptions(pcd);
    expect(displayOptions.header).to.not.be.empty;
    expect(displayOptions.displayName).to.not.be.empty;
  });
});
