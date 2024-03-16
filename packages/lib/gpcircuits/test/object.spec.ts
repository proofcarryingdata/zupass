import { POD, decodePublicKey, decodeSignature } from "@pcd/pod";
import { WitnessTester } from "circomkit";
import "mocha";
import {
  CircuitSignal,
  ObjectModuleInputNamesType,
  ObjectModuleInputs,
  ObjectModuleOutputNamesType,
  ObjectModuleOutputs
} from "../src";
import { circomkit, privateKey, sampleEntries } from "./common";

describe("object.ObjectModule should work", function () {
  // Circuit compilation sometimes takes more than the default timeout of 2s.
  this.timeout(10000);
  let circuit: WitnessTester<
    ObjectModuleInputNamesType,
    ObjectModuleOutputNamesType
  >;

  function makeTestSignals(): ObjectModuleInputs {
    const pod = POD.sign(sampleEntries, privateKey);

    const pub = decodePublicKey(pod.signerPublicKey);
    const sig = decodeSignature(pod.signature);

    return {
      contentID: pod.contentID,
      signerPubkeyAx: pub[0],
      signerPubkeyAy: pub[1],
      signatureR8x: sig.R8[0],
      signatureR8y: sig.R8[1],
      signatureS: sig.S
    };
  }

  const sampleInput: ObjectModuleInputs = {
    contentID:
      17005389384751689150477223755263230795394391215739848037119233614320186132174n,
    signerPubkeyAx:
      13277427435165878497778222415993513565335242147425444199013288855685581939618n,
    signerPubkeyAy:
      13622229784656158136036771217484571176836296686641868549125388198837476602820n,
    signatureR8x:
      20183615694351426581403612717656961809145364212915566321504869647224668169697n,
    signatureR8y:
      4907567150299446249557373858688207974502679109184225520812830998687846819579n,
    signatureS:
      2528860613850631653848900780557101636842963546124173496429309883686137077146n
  };

  const sampleOutput: ObjectModuleOutputs = {};

  this.beforeAll(async () => {
    circuit = await circomkit.WitnessTester("ObjectModule", {
      file: "object",
      template: "ObjectModule"
    });
  });

  it("should accept a sample object", async () => {
    await circuit.expectPass(sampleInput, sampleOutput);
  });

  it("should accept a dynamic object", async () => {
    await circuit.expectPass(makeTestSignals(), sampleOutput);
  });

  it("should reject corrupted input", async () => {
    for (const inputName in Object.keys(sampleInput)) {
      const badInput = { ...sampleInput };
      (badInput as Record<string, CircuitSignal>)[inputName] = 0xbadn;
      await circuit.expectFail(badInput);
    }
  });
});
