import { expect } from "chai";
import "mocha";
import { POD, unpackPublicKey, unpackSignature, verifySignature } from "../src";
import {
  expectedPublicKey,
  expectedPublicKeyPoint,
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
      const unpackedSig = unpackSignature(pod.signature);

      expect(pod.signerPublicKey).to.eq(expectedPublicKey);
      const unpackedPubKey = unpackPublicKey(pod.signerPublicKey);
      expect(unpackedPubKey).to.deep.eq(expectedPublicKeyPoint);

      expect(verifySignature(pod.contentID, unpackedSig, unpackedPubKey)).to.be
        .true;
    }
  });

  it("should save and load without signing", function () {
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

  it("should serialize and deserialize", function () {
    for (const sampleEntries of [sampleEntries1, sampleEntries2]) {
      const signedPOD = POD.sign(sampleEntries, privateKey);
      expect(signedPOD.verifySignature()).to.be.true;

      const serialized = signedPOD.serialize();
      const deserializedPOD = POD.deserialize(serialized);
      expect(deserializedPOD.verifySignature()).to.be.true;
      expect(deserializedPOD.content.asEntries()).to.deep.eq(sampleEntries);
      expect(deserializedPOD.signature).to.eq(signedPOD.signature);
      expect(deserializedPOD.signerPublicKey).to.eq(signedPOD.signerPublicKey);
    }
  });

  // TODO(artwyman): Test malformed inputs
  // TODO(artwyman): Test immutability - try to mutate returned values
});
