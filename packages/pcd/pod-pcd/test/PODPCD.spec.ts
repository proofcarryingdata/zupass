import { ArgumentTypeName } from "@pcd/pcd-types";
import { POD, PODEntries, podEntriesToJSON } from "@pcd/pod";
import { BABY_JUB_NEGATIVE_ONE } from "@pcd/util";
import { expect } from "chai";
import "mocha";
import { PODPCD, PODPCDPackage, PODPCDTypeName, prove } from "../src";

// Key borrowed from https://github.com/iden3/circomlibjs/blob/4f094c5be05c1f0210924a3ab204d8fd8da69f49/test/eddsa.js#L103
export const privateKey = "AAECAwQFBgcICQABAgMEBQYHCAkAAQIDBAUGBwgJAAE"; // hex 0001020304050607080900010203040506070809000102030405060708090001

export const expectedPublicKey = "xDP3ppa3qjpSJO+zmTuvDM2eku7O4MKaP2yCCKnoHZ4";

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
        value: podEntriesToJSON(sampleEntries),
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
        value: podEntriesToJSON(sampleEntries),
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
        value: podEntriesToJSON(sampleEntries),
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

describe("PODPCD backward compatibility", async function () {
  const COMPATIBILITY_TEST_ENTRIES: PODEntries = {
    s1: { type: "string", value: "hello there" },
    _s2: { type: "string", value: "!@#$%%%^&" },
    I1: { type: "int", value: 1n },
    _2I: { type: "int", value: -123n },
    bigI1: { type: "int", value: BigInt(Number.MAX_SAFE_INTEGER) },
    bigI2: { type: "int", value: BigInt(Number.MIN_SAFE_INTEGER) },
    c1: { type: "cryptographic", value: 123n },
    c2: {
      type: "cryptographic",
      value:
        0x1234567890abcdef_1234567890abcdef_1234567890abcdef_1234567890abcdefn
    },
    pk1: {
      type: "eddsa_pubkey",
      value: "xDP3ppa3qjpSJO+zmTuvDM2eku7O4MKaP2yCCKnoHZ4"
    }
  };
  const COMPAT_TEST_CONTENT_ID =
    0x1cfe0e0ab2cedc9ba6656f72836bbd2052d5c7193b1da85248c131420c1dad1an;
  const COMPAT_TEST_PCD_ID = "8209fd10-667d-4524-a855-acc51ce795f3";

  async function makeCompatTestPCD(): Promise<PODPCD> {
    const pcd = await prove({
      entries: {
        value: podEntriesToJSON(COMPATIBILITY_TEST_ENTRIES),
        argumentType: ArgumentTypeName.Object
      },
      privateKey: {
        value: privateKey,
        argumentType: ArgumentTypeName.String
      },
      id: {
        value: COMPAT_TEST_PCD_ID,
        argumentType: ArgumentTypeName.String
      }
    });
    expect(pcd.id).to.eq(COMPAT_TEST_PCD_ID);
    expect(pcd.pod.contentID).to.eq(COMPAT_TEST_CONTENT_ID);
    expect(pcd.pod.content.asEntries()).to.deep.eq(COMPATIBILITY_TEST_ENTRIES);
    return pcd;
  }

  it("test data should work with the latest code", async function () {
    const testPCD = await makeCompatTestPCD();
    const serialized = await PODPCDPackage.serialize(testPCD);
    const deserialized = await PODPCDPackage.deserialize(serialized.pcd);
    expect(await PODPCDPackage.verify(deserialized)).to.be.true;
    expect(deserialized.id).to.eq(COMPAT_TEST_PCD_ID);
    expect(deserialized.claim).to.deep.eq(testPCD.claim);
    expect(deserialized.proof).to.deep.eq(testPCD.proof);
  });

  it("should properly deserialize a PCD in the json-bigint format", async function () {
    const testPCD = await makeCompatTestPCD();

    // Serialized when the JSON format was added to serialize()
    const FIXED_JSON_PCD =
      '{"type":"pod-pcd","pcd":"{\\"id\\":\\"8209fd10-667d-4524-a855-acc51ce795f3\\",\\"jsonPOD\\":{\\"entries\\":{\\"I1\\":1,\\"_2I\\":-123,\\"_s2\\":\\"!@#$%%%^&\\",\\"bigI1\\":9007199254740991,\\"bigI2\\":-9007199254740991,\\"c1\\":{\\"cryptographic\\":123},\\"c2\\":{\\"cryptographic\\":\\"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef\\"},\\"pk1\\":{\\"eddsa_pubkey\\":\\"xDP3ppa3qjpSJO+zmTuvDM2eku7O4MKaP2yCCKnoHZ4\\"},\\"s1\\":\\"hello there\\"},\\"signature\\":\\"XeD51Okc6YfUH8P/zmbUQJRN16PqF41scbKOsMFyFC7oVclWQV+kd29iU6gmRhLAIg0xYf/iKsb5GE4YaPWzBA\\",\\"signerPublicKey\\":\\"xDP3ppa3qjpSJO+zmTuvDM2eku7O4MKaP2yCCKnoHZ4\\"}}"}';
    const serialized = JSON.parse(FIXED_JSON_PCD);
    expect(serialized.type).eq(PODPCDTypeName);

    const deserialized = await PODPCDPackage.deserialize(serialized.pcd);
    expect(await PODPCDPackage.verify(deserialized)).to.be.true;
    expect(deserialized.id).to.eq(COMPAT_TEST_PCD_ID);
    expect(deserialized.claim).to.deep.eq(testPCD.claim);
    expect(deserialized.proof).to.deep.eq(testPCD.proof);
  });

  it("should properly deserialize a PCD in the json-bigint format", async function () {
    const testPCD = await makeCompatTestPCD();

    // Serialized before the json-bigint format was removed from serialize()
    const LEGACY_JSON_BIGINT_PCD =
      '{"type":"pod-pcd","pcd":"{\\"id\\":\\"8209fd10-667d-4524-a855-acc51ce795f3\\",\\"claim\\":{\\"entries\\":{\\"I1\\":{\\"type\\":\\"int\\",\\"value\\":1},\\"_2I\\":{\\"type\\":\\"int\\",\\"value\\":-123},\\"_s2\\":{\\"type\\":\\"string\\",\\"value\\":\\"!@#$%%%^&\\"},\\"bigI1\\":{\\"type\\":\\"int\\",\\"value\\":9007199254740991},\\"bigI2\\":{\\"type\\":\\"int\\",\\"value\\":-9007199254740991},\\"c1\\":{\\"type\\":\\"cryptographic\\",\\"value\\":123},\\"c2\\":{\\"type\\":\\"cryptographic\\",\\"value\\":8234104122482341265491137074636836252947884782870784360943022469005013929455},\\"pk1\\":{\\"type\\":\\"eddsa_pubkey\\",\\"value\\":\\"xDP3ppa3qjpSJO+zmTuvDM2eku7O4MKaP2yCCKnoHZ4\\"},\\"s1\\":{\\"type\\":\\"string\\",\\"value\\":\\"hello there\\"}},\\"signerPublicKey\\":\\"xDP3ppa3qjpSJO+zmTuvDM2eku7O4MKaP2yCCKnoHZ4\\"},\\"proof\\":{\\"signature\\":\\"XeD51Okc6YfUH8P/zmbUQJRN16PqF41scbKOsMFyFC7oVclWQV+kd29iU6gmRhLAIg0xYf/iKsb5GE4YaPWzBA\\"}}"}';
    const serialized = JSON.parse(LEGACY_JSON_BIGINT_PCD);
    expect(serialized.type).eq(PODPCDTypeName);

    const deserialized = await PODPCDPackage.deserialize(serialized.pcd);
    expect(await PODPCDPackage.verify(deserialized)).to.be.true;
    expect(deserialized.id).to.eq(COMPAT_TEST_PCD_ID);
    expect(deserialized.claim).to.deep.eq(testPCD.claim);
    expect(deserialized.proof).to.deep.eq(testPCD.proof);
  });
});
