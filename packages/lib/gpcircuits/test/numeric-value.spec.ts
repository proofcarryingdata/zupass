import { POD_INT_MAX, POD_INT_MIN, podValueHash } from "@pcd/pod";
import { WitnessTester } from "circomkit";
import "mocha";
import {
  NumericValueModuleInputNamesType,
  NumericValueModuleOutputNamesType
} from "../src";
import { circomkit } from "./common";

describe("numeric-value.NumericValueModule should work", async function () {
  let circuit: WitnessTester<
    NumericValueModuleInputNamesType,
    NumericValueModuleOutputNamesType
  >;

  this.beforeAll(async () => {
    circuit = await circomkit.WitnessTester("NumericValueModule", {
      file: "numeric-value",
      template: "NumericValueModule",
      params: []
    });
  });

  const sampleValueHashPairs = [
    POD_INT_MIN,
    3n,
    256n,
    (1n << 32n) + 7n,
    POD_INT_MAX
  ].map((value) => [value, podValueHash({ type: "int", value })]);

  it("should accept sample inputs", async () => {
    for (const [value, hash] of sampleValueHashPairs) {
      for (const [i, j] of [
        [0n, 0n],
        [0n, 1n],
        [1n, 0n],
        [1n, 1n]
      ]) {
        const minValue = value === POD_INT_MIN ? value : value - i;
        const maxValue = value === POD_INT_MAX ? value : value + j;
        const sampleInput = {
          isEnabled: 1n,
          numericValue: value,
          extractedValueHash: hash,
          minValue,
          maxValue
        };
        await circuit.expectPass(sampleInput);
      }
    }
  });

  it("should pass when disabled", async () => {
    const sampleInput = {
      isEnabled: 0n,
      numericValue: 0n,
      extractedValueHash: 0n,
      minValue: 0n,
      maxValue: 0n
    };
    await circuit.expectPass(sampleInput);
  });

  it("should reject corrupted input", async () => {
    for (const [value, hash] of sampleValueHashPairs) {
      // Corrupted hash
      let sampleInput = {
        isEnabled: 1n,
        numericValue: value,
        extractedValueHash: hash + 1n,
        minValue: value,
        maxValue: value
      };
      await circuit.expectFail(sampleInput);

      // Corrupted value
      sampleInput = {
        isEnabled: 1n,
        numericValue: value + 1n,
        extractedValueHash: hash,
        minValue: value,
        maxValue: value
      };
      await circuit.expectFail(sampleInput);

      // Improper bounds
      const valuePlusOne = value === POD_INT_MAX ? POD_INT_MIN : value + 1n;
      sampleInput = {
        isEnabled: 1n,
        numericValue: value,
        extractedValueHash: hash,
        minValue: valuePlusOne,
        maxValue: valuePlusOne
      };
      await circuit.expectFail(sampleInput);
    }
  });
});
