import { POD, decodePublicKey } from "@pcd/pod";
import { BABY_JUB_NEGATIVE_ONE } from "@pcd/util";
import { WitnessTester } from "circomkit";
import "mocha";
import { poseidon2 } from "poseidon-lite";
import {
  CircuitSignal,
  VirtualEntryModuleInputNamesType,
  VirtualEntryModuleInputs,
  VirtualEntryModuleOutputNamesType,
  VirtualEntryModuleOutputs,
  array2Bits,
  padArray
} from "../src/index.js";
import { circomkit, privateKey, privateKey2, sampleEntries } from "./common.js";

describe("Virtual entry module should work", function () {
  // Circuit compilation sometimes takes more than the default timeout of 2s.
  let circuit: WitnessTester<
    VirtualEntryModuleInputNamesType,
    VirtualEntryModuleOutputNamesType
  >;

  function makeTestSignals(
    paramMaxObjects: number,
    isValueHashRevealedBits: CircuitSignal[]
  ): {
    inputs: VirtualEntryModuleInputs;
    outputs: VirtualEntryModuleOutputs;
  } {
    const paddedRevealedBits = padArray(
      isValueHashRevealedBits,
      paramMaxObjects,
      0n
    );

    const pod0 = POD.sign(sampleEntries, privateKey);
    const pod1 = POD.sign(sampleEntries, privateKey2);

    const pub0 = decodePublicKey(pod0.signerPublicKey);
    const pub1 = decodePublicKey(pod1.signerPublicKey);

    const pub_x = [pub0[0], pub1[0]].slice(0, paramMaxObjects);
    const pub_y = [pub0[1], pub1[1]].slice(0, paramMaxObjects);

    const pubHashes = [pub0, pub1].slice(0, paramMaxObjects).map(poseidon2);
    const paddedPubHashes = padArray(pubHashes, paramMaxObjects, pubHashes[0]);

    return {
      inputs: {
        isValueHashRevealed: array2Bits(paddedRevealedBits),
        objectSignerPubkeyAx: padArray(pub_x, paramMaxObjects, pub_x[0]),
        objectSignerPubkeyAy: padArray(pub_y, paramMaxObjects, pub_y[0])
      },
      outputs: {
        valueHashes: paddedPubHashes,
        revealedValueHash: paddedPubHashes.map((hash, i) =>
          paddedRevealedBits[i] === 1n ? hash : BABY_JUB_NEGATIVE_ONE
        )
      }
    };
  }

  const sampleInput: VirtualEntryModuleInputs = {
    isValueHashRevealed: 22n,
    objectSignerPubkeyAx: [
      13277427435165878497778222415993513565335242147425444199013288855685581939618n,
      12512819142096328672745574748268841190683864664801826114110182444939815508133n,
      13277427435165878497778222415993513565335242147425444199013288855685581939618n,
      13277427435165878497778222415993513565335242147425444199013288855685581939618n,
      13277427435165878497778222415993513565335242147425444199013288855685581939618n
    ],
    objectSignerPubkeyAy: [
      13622229784656158136036771217484571176836296686641868549125388198837476602820n,
      13076926918448785155412042385132024413480177434239776354704095450497712564228n,
      13622229784656158136036771217484571176836296686641868549125388198837476602820n,
      13622229784656158136036771217484571176836296686641868549125388198837476602820n,
      13622229784656158136036771217484571176836296686641868549125388198837476602820n
    ]
  };

  const sampleOutput: VirtualEntryModuleOutputs = {
    valueHashes: [
      8093821485214269328389004542394237209037452657522929891144731833981969398000n,
      1192297809908180610286326005182698364174835035041287169682595389877239200469n,
      8093821485214269328389004542394237209037452657522929891144731833981969398000n,
      8093821485214269328389004542394237209037452657522929891144731833981969398000n,
      8093821485214269328389004542394237209037452657522929891144731833981969398000n
    ],
    revealedValueHash: [
      21888242871839275222246405745257275088548364400416034343698204186575808495616n,
      1192297809908180610286326005182698364174835035041287169682595389877239200469n,
      8093821485214269328389004542394237209037452657522929891144731833981969398000n,
      21888242871839275222246405745257275088548364400416034343698204186575808495616n,
      8093821485214269328389004542394237209037452657522929891144731833981969398000n
    ]
  };

  it("should accept a sample object", async () => {
    circuit = await circomkit.WitnessTester("VirtualEntryModule", {
      file: "virtual-entry",
      template: "VirtualEntryModule",
      params: [5]
    });

    await circuit.expectPass(sampleInput, sampleOutput);
  });

  it("should accept a dynamic object", async () => {
    for (const paramMaxObjects of [1, 2, 3, 4, 5]) {
      circuit = await circomkit.WitnessTester("VirtualEntryModule", {
        file: "virtual-entry",
        template: "VirtualEntryModule",
        params: [paramMaxObjects]
      });

      // This procedure recursively generates all tuples of arity `length`
      // containing elements from `[0n, 1n]`.
      const bitComboGenerator = (
        length: number,
        elements: bigint[] = []
      ): bigint[][] =>
        length === 0
          ? [elements]
          : [0n, 1n].flatMap((b: bigint) =>
              bitComboGenerator(length - 1, elements.concat([b]))
            );

      const revealedBitCombos = bitComboGenerator(paramMaxObjects);

      for (const revealedBits of revealedBitCombos) {
        const { inputs, outputs } = makeTestSignals(
          paramMaxObjects,
          revealedBits
        );
        await circuit.expectPass(inputs, outputs);
      }
    }
  });
});
