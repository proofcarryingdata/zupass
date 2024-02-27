import {
  generatePODMerkleProof,
  isPODNumericValue,
  podNameHash,
  podValueHash,
  signPOD
} from "@pcd/pod";
import { BABY_JUB_NEGATIVE_ONE } from "@pcd/util";
import { expect } from "chai";
import { WitnessTester } from "circomkit";
import "mocha";
import {
  CircuitSignal,
  EntryConstraintModuleInputNamesType,
  EntryConstraintModuleOutputNamesType,
  EntryModuleInputNamesType,
  EntryModuleInputs,
  EntryModuleOutputNamesType,
  EntryModuleOutputs
} from "../src";
import { circomkit, privateKey, sampleEntries } from "./common";

describe("entry.EntryModule should work", function () {
  // Circuit compilation sometimes takes more than the default timeout of 2s.
  this.timeout(10000);
  let circuit: WitnessTester<
    EntryModuleInputNamesType,
    EntryModuleOutputNamesType
  >;
  const MERKLE_MAX_DEPTH = 10;

  function makeTestSignals(
    entryName: string,
    merkleDepth: number,
    isValueHashRevealed: boolean,
    isValueEnabled: boolean
  ): {
    inputs: EntryModuleInputs;
    outputs: EntryModuleOutputs;
  } {
    const { podMap, merkleTree } = signPOD(sampleEntries, privateKey);

    const podValue = podMap.get(entryName);
    if (!podValue) {
      throw new Error(`Missing entry for ${entryName}!`);
    }

    let valueSignal = 0n;
    if (isValueEnabled && isPODNumericValue(podValue)) {
      if (typeof podValue.value !== "bigint") {
        throw new Error(`Unhandled POD value type ${podValue.type}!`);
      }
      valueSignal = podValue.value;
    }

    const merkleProof = generatePODMerkleProof(podMap, merkleTree, entryName);
    const circuitSiblings = Array<bigint>(merkleDepth).fill(0n, 0, merkleDepth);
    for (let i = 0; i < merkleProof.siblings.length; i++) {
      circuitSiblings[i] = merkleProof.siblings[i];
    }

    return {
      inputs: {
        objectContentID: merkleTree.root,
        nameHash: podNameHash(entryName),
        isValueHashRevealed: isValueHashRevealed ? 1n : 0n,
        proofDepth: BigInt(merkleProof.siblings.length),
        proofIndex: BigInt(merkleProof.index),
        proofSiblings: circuitSiblings,
        value: valueSignal,
        isValueEnabled: isValueEnabled ? 1n : 0n
      },
      outputs: {
        revealedValueHash: isValueHashRevealed
          ? podValueHash(podValue)
          : BABY_JUB_NEGATIVE_ONE
      }
    };
  }

  const sampleInput: EntryModuleInputs = {
    objectContentID:
      17005389384751689150477223755263230795394391215739848037119233614320186132174n,
    nameHash:
      151251200029686127063327095456320040687905427497336635391695211041155747807n, // "A"
    isValueHashRevealed: 1n,
    proofDepth: 5n,
    proofIndex: 0n,
    proofSiblings: [
      9904028930859697121695025471312564917337032846528014134060777877259199866166n,
      3061484723492332507965148030160360459221544214848710312076669786481227696312n,
      1034918093316386824116250922167450510848513309806370785803679707656130099343n,
      20475413377085571620289409878669769516139450175144623943620753505391660085353n,
      7007943877879558410284399887032121565251848089920956518084084556491129737612n,
      0n,
      0n,
      0n,
      0n,
      0n
    ],
    value: 123n,
    isValueEnabled: 1n
  };

  const sampleOutput: EntryModuleOutputs = {
    revealedValueHash:
      9904028930859697121695025471312564917337032846528014134060777877259199866166n
  };

  this.beforeAll(async () => {
    circuit = await circomkit.WitnessTester("EntryModule", {
      file: "entry",
      template: "EntryModule",
      params: [MERKLE_MAX_DEPTH]
    });
  });

  it("should accept a sample input", async () => {
    await circuit.expectPass(sampleInput, sampleOutput);
  });

  it("should accept dynamic inputs with different configuration", async () => {
    let { inputs, outputs } = makeTestSignals(
      "A",
      MERKLE_MAX_DEPTH,
      true, // isValueHashRevealed
      true // isValueHashEnabled
    );
    await circuit.expectPass(inputs, outputs);

    ({ inputs, outputs } = makeTestSignals(
      "A",
      MERKLE_MAX_DEPTH,
      false, // isValueHashRevealed
      true // isValueHashEnabled
    ));
    await circuit.expectPass(inputs, outputs);

    ({ inputs, outputs } = makeTestSignals(
      "A",
      MERKLE_MAX_DEPTH,
      true, // isValueHashRevealed
      false // isValueHashEnabled
    ));
    await circuit.expectPass(inputs, outputs);

    ({ inputs, outputs } = makeTestSignals(
      "A",
      MERKLE_MAX_DEPTH,
      false, // isValueHashRevealed
      false // isValueHashEnabled
    ));
    await circuit.expectPass(inputs, outputs);
  });

  it("should accept dynamic inputs with different entries", async () => {
    for (const entryName of Object.keys(sampleEntries)) {
      const { inputs, outputs } = makeTestSignals(
        entryName,
        MERKLE_MAX_DEPTH,
        false, // isValueHashRevealed
        false // isValueHashEnabled
      );
      await circuit.expectPass(inputs, outputs);
    }
  });

  it("should accept with different depth parameters", async () => {
    for (const merkleDepth of [5, 15]) {
      const { inputs, outputs } = makeTestSignals(
        "A",
        merkleDepth,
        true, // isValueHashRevealed
        true // isValueHashEnabled
      );
      const altCircuit = await circomkit.WitnessTester("EntryModule", {
        file: "entry",
        template: "EntryModule",
        params: [merkleDepth]
      });
      await altCircuit.expectPass(inputs, outputs);
    }
  });

  it("should reject corrupted input (including non-boolean flags)", async () => {
    for (const inputName of Object.keys(sampleInput)) {
      // Siblings array is tested separately below.
      if (inputName === "proofSiblings") {
        continue;
      }

      const badInput = { ...sampleInput };
      (badInput as Record<string, CircuitSignal | CircuitSignal[]>)[inputName] =
        0xbadn;

      if (inputName === "isValueHashRevealed") {
        // isValueHashRevealed isn't directly constrained by this circuit, but
        // will cause the wrong output.
        const badOutput = await circuit.compute(badInput, [
          "revealedValueHash"
        ]);
        expect(badOutput.revealedValueHash).to.not.eq(
          sampleOutput.revealedValueHash
        );
      } else if (inputName === "isValueEnabled") {
        // isValueEnabled isn't directly constrained by the circuit, and
        // actually works fine with any value other than 0 treated as true.
        await circuit.expectPass(badInput, sampleOutput);
      } else {
        await circuit.expectFail(badInput);
      }
    }

    // Siblings only matter up to the proofDepth, after which they are ignored.
    for (
      let sibIndex = 0;
      sibIndex < sampleInput.proofSiblings.length;
      sibIndex++
    ) {
      const badSibs = [...sampleInput.proofSiblings];
      badSibs[sibIndex] = 0xbadn;
      const badInput = { ...sampleInput, proofSiblings: badSibs };
      if (sibIndex < BigInt(sampleInput.proofDepth)) {
        await circuit.expectFail(badInput);
      } else {
        await circuit.expectPass(badInput, sampleOutput);
      }
    }
  });
});

describe("entry.EntryConstraintModule should work", function () {
  // Circuit compilation sometimes takes more than the default timeout of 2s.
  this.timeout(10000);
  let circuit: WitnessTester<
    EntryConstraintModuleInputNamesType,
    EntryConstraintModuleOutputNamesType
  >;
  const MAX_ENTRIES = 10;

  function makeValueHashes(length: number): bigint[] {
    const valueHashes = [];
    for (let i = 0; i < length; i++) {
      valueHashes.push(podValueHash({ type: "int", value: BigInt(i) }));
    }
    return valueHashes;
  }

  this.beforeAll(async () => {
    circuit = await circomkit.WitnessTester("EntryConstraintModule", {
      file: "entry",
      template: "EntryConstraintModule",
      params: [MAX_ENTRIES]
    });
  });

  it("should accept or reject based on index", async () => {
    const valueHashes = makeValueHashes(MAX_ENTRIES);
    for (let i = 0; i < valueHashes.length; i++) {
      await circuit.expectPass(
        {
          valueHash: valueHashes[i],
          entryValueHashes: valueHashes,
          equalToOtherEntryByIndex: i
        },
        {}
      );
      await circuit.expectFail({
        valueHash: valueHashes[i],
        entryValueHashes: valueHashes,
        equalToOtherEntryByIndex: (i + 1) % valueHashes.length
      });
    }
  });

  it("should accept a different size", async () => {
    const valueHashes = makeValueHashes(3);
    const altCircuit = await circomkit.WitnessTester("EntryConstraintModule", {
      file: "entry",
      template: "EntryConstraintModule",
      params: [valueHashes.length]
    });
    for (let i = 0; i < valueHashes.length; i++) {
      await altCircuit.expectPass(
        {
          valueHash: valueHashes[i],
          entryValueHashes: valueHashes,
          equalToOtherEntryByIndex: i
        },
        {}
      );
      await altCircuit.expectFail({
        valueHash: valueHashes[i],
        entryValueHashes: valueHashes,
        equalToOtherEntryByIndex: (i + 1) % valueHashes.length
      });
    }
  });

  it("should reject index out of range", async () => {
    const valueHashes = makeValueHashes(MAX_ENTRIES);
    await circuit.expectFail({
      valueHash: valueHashes[0],
      entryValueHashes: valueHashes,
      equalToOtherEntryByIndex: -1
    });
    await circuit.expectFail({
      valueHash: valueHashes[0],
      entryValueHashes: valueHashes,
      equalToOtherEntryByIndex: valueHashes.length
    });
  });
});
