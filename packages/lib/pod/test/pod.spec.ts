import { verifySignature } from "@zk-kit/eddsa-poseidon";
import { expect } from "chai";
import JSONBig from "json-bigint";
import "mocha";
import { POD, SavedPOD, unpackPublicKey, unpackSignature } from "../src";
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

      const savedPOD = signedPOD.getDataToSave();

      const stringifier = JSONBig({
        useNativeBigInt: true,
        alwaysParseAsBig: true
      });
      const serialized = stringifier.stringify(savedPOD);
      const deserialized = stringifier.parse(serialized) as SavedPOD;
      const loadedPOD = POD.loadFromData(deserialized);
      expect(loadedPOD.verifySignature()).to.be.true;
      expect(loadedPOD.content.asEntries()).to.deep.eq(sampleEntries);
      expect(loadedPOD.signature).to.eq(signedPOD.signature);
      expect(loadedPOD.signerPublicKey).to.eq(signedPOD.signerPublicKey);
    }
  });
});
