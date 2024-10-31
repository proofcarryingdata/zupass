import { verifySignature } from "@zk-kit/eddsa-poseidon";
import { expect } from "chai";
import "mocha";
import {
  JSONPOD,
  POD,
  PODName,
  PODValue,
  POD_INT_MAX,
  clonePODEntries,
  decodePublicKey,
  decodeSignature
} from "../src";
import {
  expectedContentID1,
  expectedContentID2,
  expectedPublicKey,
  expectedPublicKeyPoint,
  expectedSignature1,
  expectedSignature2,
  privateKey,
  sampleEntries1,
  sampleEntries2
} from "./common";

describe("POD class should work", async function () {
  it("should sign and verify samples", function () {
    for (const sampleEntries of [sampleEntries1, sampleEntries2]) {
      const pod = POD.sign(sampleEntries, privateKey);
      expect(pod.verifySignature()).to.be.true;

      expect(pod.content.asEntries()).to.deep.eq(sampleEntries);
      expect(pod.contentID).to.not.eq(0);
      expect(pod.signature).to.not.be.empty;
      const unpackedSig = decodeSignature(pod.signature);

      expect(pod.signerPublicKey).to.eq(expectedPublicKey);
      const unpackedPubKey = decodePublicKey(pod.signerPublicKey);
      expect(unpackedPubKey).to.deep.eq(expectedPublicKeyPoint);

      expect(verifySignature(pod.contentID, unpackedSig, unpackedPubKey)).to.be
        .true;
    }
  });

  it("outputs should match saved expected values", function () {
    // This test exists to detect breaking changes in future which could
    // impact the compatibility of saved PODs.  If sample inputs changed, you
    // can simply change the expected outputs.  Otherwise think about why
    // these values changed.
    const pod1 = POD.sign(sampleEntries1, privateKey);
    expect(pod1.signerPublicKey).to.eq(expectedPublicKey);
    expect(pod1.contentID).to.eq(expectedContentID1);
    expect(pod1.signature).to.eq(expectedSignature1);

    const pod2 = POD.sign(sampleEntries2, privateKey);
    expect(pod2.signerPublicKey).to.eq(expectedPublicKey);
    expect(pod2.contentID).to.eq(expectedContentID2);
    expect(pod2.signature).to.eq(expectedSignature2);
  });

  it("should save and load a new pod without signing again", function () {
    for (const sampleEntries of [sampleEntries1, sampleEntries2]) {
      const signedPOD = POD.sign(sampleEntries, privateKey);
      expect(signedPOD.verifySignature()).to.be.true;

      const loadedPOD = POD.load(
        signedPOD.content.asEntries(),
        signedPOD.signature,
        signedPOD.signerPublicKey
      );
      expect(loadedPOD.verifySignature()).to.be.true;
      expect(loadedPOD.content.asEntries()).to.deep.eq(sampleEntries);
      expect(loadedPOD.signature).to.eq(signedPOD.signature);
      expect(loadedPOD.signerPublicKey).to.eq(signedPOD.signerPublicKey);
    }
  });

  it("should load but not verify with an incorrect (but well-formed) signature", function () {
    const signedPOD1 = POD.sign(sampleEntries1, privateKey);
    expect(signedPOD1.verifySignature()).to.be.true;
    const signedPOD2 = POD.sign(sampleEntries2, privateKey);
    expect(signedPOD2.verifySignature()).to.be.true;

    const loadedPOD = POD.load(
      signedPOD1.content.asEntries(),
      signedPOD2.signature, // Signature comes from the other POD
      signedPOD1.signerPublicKey
    );
    expect(loadedPOD.verifySignature()).to.be.false;
    expect(loadedPOD.content.asEntries()).to.deep.eq(sampleEntries1);
    expect(loadedPOD.signature).to.eq(signedPOD2.signature);
    expect(loadedPOD.signerPublicKey).to.eq(signedPOD1.signerPublicKey);
  });

  it("should serialize and deserialize as JSON objects", function () {
    for (const sampleEntries of [sampleEntries1, sampleEntries2]) {
      const signedPOD = POD.sign(sampleEntries, privateKey);
      expect(signedPOD.verifySignature()).to.be.true;

      const serialized = signedPOD.toJSON();
      const deserializedPOD = POD.fromJSON(serialized);
      expect(deserializedPOD.verifySignature()).to.be.true;
      expect(deserializedPOD.content.asEntries()).to.deep.eq(sampleEntries);
      expect(deserializedPOD.signature).to.eq(signedPOD.signature);
      expect(deserializedPOD.signerPublicKey).to.eq(signedPOD.signerPublicKey);
    }
  });

  it("should serialize and deserialize as JSON strings", function () {
    for (const sampleEntries of [sampleEntries1, sampleEntries2]) {
      const signedPOD = POD.sign(sampleEntries, privateKey);
      expect(signedPOD.verifySignature()).to.be.true;

      const serialized = JSON.stringify(signedPOD.toJSON());
      const deserializedPOD = POD.fromJSON(JSON.parse(serialized));
      expect(deserializedPOD.verifySignature()).to.be.true;
      expect(deserializedPOD.content.asEntries()).to.deep.eq(sampleEntries);
      expect(deserializedPOD.signature).to.eq(signedPOD.signature);
      expect(deserializedPOD.signerPublicKey).to.eq(signedPOD.signerPublicKey);
    }
  });

  it("should reject invalid JSON input", function () {
    const goodPOD = POD.sign(sampleEntries1, privateKey);
    const goodJSONPOD = goodPOD.toJSON();
    const badInputs = [
      [{}, TypeError],
      [
        { entries: goodJSONPOD.entries, signature: goodJSONPOD.signature },
        TypeError
      ],
      [
        {
          entries: goodJSONPOD.entries,
          signerPublicKey: goodJSONPOD.signerPublicKey
        },
        TypeError
      ],
      [
        {
          signature: goodJSONPOD.signature,
          signerPublicKey: goodJSONPOD.signerPublicKey
        },
        TypeError
      ],
      [{ ...goodJSONPOD, entries: { "!@#$": "hello" } }, TypeError],
      [{ ...goodJSONPOD, signature: "malformed" }, TypeError],
      [{ ...goodJSONPOD, signerPublicKey: "malformed" }, TypeError],
      [{ ...goodJSONPOD, version: "2" }, TypeError]
    ] as [JSONPOD, ErrorConstructor][];

    for (const [badInput, expectedError] of badInputs) {
      const fn = (): POD => POD.fromJSON(badInput);
      expect(fn).to.throw(expectedError);
    }
  });

  it("should reject invalid entries when signing", function () {
    const testEntries = clonePODEntries(sampleEntries1) as Record<
      PODName,
      PODValue
    >;
    testEntries["badValueName"] = { type: "int", value: POD_INT_MAX + 1n };

    const fn = (): void => {
      POD.sign(testEntries, privateKey);
    };
    expect(fn).to.throw(RangeError, "badValueName");
  });

  it("should reject malformed private key when signing", function () {
    const fn = (): void => {
      POD.sign(sampleEntries1, "password");
    };
    expect(fn).to.throw(
      TypeError,
      "Private key should be 32 bytes, encoded as hex or Base64."
    );
  });

  it("should reject invalid entries when loading", function () {
    const signedPOD = POD.sign(sampleEntries1, privateKey);
    expect(signedPOD.verifySignature()).to.be.true;

    const testEntries = clonePODEntries(sampleEntries1) as Record<
      PODName,
      PODValue
    >;
    testEntries["badValueName"] = { type: "int", value: POD_INT_MAX + 1n };

    const fn = (): void => {
      POD.load(testEntries, signedPOD.signature, signedPOD.signerPublicKey);
    };
    expect(fn).to.throw(RangeError, "badValueName");
  });

  it("should reject malformed signature when loading", function () {
    const signedPOD = POD.sign(sampleEntries1, privateKey);
    expect(signedPOD.verifySignature()).to.be.true;

    const fn = (): void => {
      POD.load(sampleEntries1, "malformed", signedPOD.signerPublicKey);
    };
    expect(fn).to.throw(TypeError);
  });

  it("should reject malformed signature when loading", function () {
    const signedPOD = POD.sign(sampleEntries1, privateKey);
    expect(signedPOD.verifySignature()).to.be.true;

    const fn = (): void => {
      POD.load(sampleEntries1, "malformed", signedPOD.signerPublicKey);
    };
    expect(fn).to.throw(
      TypeError,
      "Signature should be 64 bytes, encoded as hex or Base64."
    );
  });

  it("should reject malformed public key when loading", function () {
    const signedPOD = POD.sign(sampleEntries1, privateKey);
    expect(signedPOD.verifySignature()).to.be.true;

    const fn = (): void => {
      POD.load(sampleEntries1, signedPOD.signature, "malformed");
    };
    expect(fn).to.throw(
      TypeError,
      "Public key should be 32 bytes, encoded as hex or Base64."
    );
  });
});
