import { BABY_JUB_PRIME as p } from "@pcd/util";
import { WitnessTester } from "circomkit";
import "mocha";
import {
  EntryInequalityModuleInputNamesType,
  EntryInequalityModuleOutputNamesType
} from "../src";
import { circomkit } from "./common";

for (const nBits of [32, 64, 96, 128, 252]) {
  describe(
    "entry-inequality.EntryInequalityModule should work as expected", async function () { 
      let circuit: WitnessTester<
        EntryInequalityModuleInputNamesType,
      EntryInequalityModuleOutputNamesType
      >;

      this.beforeAll(async () => {
        circuit = await circomkit.WitnessTester("EntryInequalityModule", {
          file: "entry-inequality",
          template: "EntryInequalityModule",
          params: [nBits]
        });
      });

      it("should work for " +
        nBits +
        "-bit unsigned integer values",
         async () => {
           const twoToTheNBits = 1n << BigInt(nBits);
           const sampleValues: [bigint, bigint][] = [
             [0n, 0n],
             [2n,3n],
             [3n,2n],
             [3n, twoToTheNBits / 5n],
             [twoToTheNBits / 5n - 1n, (2n * twoToTheNBits) / 5n],
             [(2n * twoToTheNBits) / 5n - 5n, (3n * twoToTheNBits) / 5n],
             [0n, twoToTheNBits - 1n],
             [twoToTheNBits - 2n, twoToTheNBits - 1n],
             [twoToTheNBits - 1n, twoToTheNBits - 2n],
             [twoToTheNBits - 1n, twoToTheNBits - 1n]
           ];

           for(const [value,otherValue] of sampleValues) {
             await circuit.expectPass({ value, otherValue }, {out: BigInt(value < otherValue)});
           }
         });
    }
  );
}
