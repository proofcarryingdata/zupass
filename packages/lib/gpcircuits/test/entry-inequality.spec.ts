import { WitnessTester } from "circomkit";
import "mocha";
import {
  EntryInequalityModuleInputNamesType,
  EntryInequalityModuleOutputNamesType
} from "../src";
import { circomkit } from "./common";

describe("entry-inequality.EntryInequalityModule should work as expected", async function () {
  let circuit: WitnessTester<
    EntryInequalityModuleInputNamesType,
    EntryInequalityModuleOutputNamesType
  >;
  for (const nBits of [32, 64, 96, 128, 252]) {
    this.beforeAll(async () => {
      circuit = await circomkit.WitnessTester("EntryInequalityModule", {
        file: "entry-inequality",
        template: "EntryInequalityModule",
        params: [nBits]
      });
    });

    it("should work for " + nBits + "-bit signed integer values", async () => {
      const twoToTheNBitsMinusOne = 1n << BigInt(nBits - 1);
      const sampleValues: [bigint, bigint][] = [
        [-twoToTheNBitsMinusOne, twoToTheNBitsMinusOne - 1n],
        [-twoToTheNBitsMinusOne, -twoToTheNBitsMinusOne + 1n]
      ].concat(
        [
          [0n, 0n],
          [2n, 3n],
          [3n, 2n],
          [3n, twoToTheNBitsMinusOne / 5n],
          [3n, -twoToTheNBitsMinusOne / 5n],
          [twoToTheNBitsMinusOne / 5n - 1n, (2n * twoToTheNBitsMinusOne) / 5n],
          [
            (2n * twoToTheNBitsMinusOne) / 5n - 5n,
            (3n * twoToTheNBitsMinusOne) / 5n
          ],
          [0n, twoToTheNBitsMinusOne - 1n],
          [twoToTheNBitsMinusOne - 2n, twoToTheNBitsMinusOne - 1n],
          [twoToTheNBitsMinusOne - 1n, twoToTheNBitsMinusOne - 2n],
          [twoToTheNBitsMinusOne - 1n, twoToTheNBitsMinusOne - 1n]
        ].flatMap(([a, b]) => [
          [a, b],
          [-a, b],
          [a, -b],
          [-a, -b]
        ])
      ) as [bigint, bigint][];

      for (const [value, otherValue] of sampleValues) {
        await circuit.expectPass(
          { value, otherValue },
          { isLessThan: BigInt(value < otherValue) }
        );
      }
    });
  }
});
