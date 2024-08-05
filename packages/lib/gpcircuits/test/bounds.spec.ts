import { BABY_JUB_PRIME as p } from "@pcd/util";
import { WitnessTester } from "circomkit";
import "mocha";
import {
  BoundsCheckModuleInputNamesType,
  BoundsCheckModuleOutputNamesType
} from "../src/index.js";
import { circomkit } from "./common.js";

function inInterval(input: bigint, bounds: bigint[]): boolean {
  return bounds[0] <= input && input <= bounds[1];
}

// 'Critical intervals' are those intervals of field elements which are larger
// than `nBits` bits yet still satisfy the constraints of the `BoundsCheckModule`
// circuit for given bounds [a,b].  These are the intervals [1 << nBits, 1 <<
// nBits + a - 1] and [p - (1 << nBits) + b + 1, p-1], where p is the field
// modulus. This procedure returns these as an array of closed intervals, where
// empty intervals are omitted.
function criticalIntervals(
  bounds: [bigint, bigint],
  nBits: number
): [bigint, bigint][] {
  if (
    bounds.some((bound) => !inInterval(bound, [0n, (1n << BigInt(nBits)) - 1n]))
  ) {
    throw new RangeError("Invalid bounds");
  }
  const [a, b] = bounds;
  return (
    [
      [1n << BigInt(nBits), (1n << BigInt(nBits)) + a - 1n],
      [p - (1n << BigInt(nBits)) + b + 1n, p - 1n]
    ] as [bigint, bigint][]
  ).filter(([c, d]) => d - c >= 0);
}

// The complement interval of [0, (1 << nBits) - 1] ∪ critical interval.
function complementInterval(
  bounds: [bigint, bigint],
  nBits: number
): [bigint, bigint] {
  if (bounds.some((bound) => !inInterval(bound, [0n, 1n << BigInt(nBits)]))) {
    throw new RangeError("Invalid bounds");
  }
  const [a, b] = bounds;
  const c = (1n << BigInt(nBits)) + a;
  const d = p - (1n << BigInt(nBits)) + b;
  return [c, d];
}

for (const nBits of [32, 64, 96, 128, 252]) {
  describe(
    "bounds.BoundsCheckModule should work for intervals with " +
      nBits +
      "-bit unsigned integer bounds",
    function () {
      const twoToTheNBits = 1n << BigInt(nBits);
      const sampleIntervals: [bigint, bigint][] = [
        [0n, 0n],
        [3n, twoToTheNBits / 5n],
        [twoToTheNBits / 5n - 1n, (2n * twoToTheNBits) / 5n],
        [(2n * twoToTheNBits) / 5n - 5n, (3n * twoToTheNBits) / 5n],
        [(3n * twoToTheNBits) / 5n - 4n, (4n * twoToTheNBits) / 5n],
        [0n, twoToTheNBits - 1n]
      ];

      let circuit: WitnessTester<
        BoundsCheckModuleInputNamesType,
        BoundsCheckModuleOutputNamesType
      >;

      this.beforeAll(async () => {
        circuit = await circomkit.WitnessTester("BoundsCheckModule", {
          file: "bounds",
          template: "BoundsCheckModule",
          params: [nBits]
        });
      });

      it(`should yield expected output for ${nBits}-bit unsigned values and bounds`, async () => {
        const sampleValues = sampleIntervals.flatMap(([a, b]) => [
          a,
          b,
          (a + b) / 2n,
          (2n * a + b) / 3n,
          (a + 2n * b) / 3n,
          (a - 1n + twoToTheNBits) % twoToTheNBits, // Additional term to ensure nonnegativity.
          (a + 1n) % twoToTheNBits,
          (b - 1n + twoToTheNBits) % twoToTheNBits, // Additional term to ensure nonnegativity.
          (b + 1n) % twoToTheNBits
        ]);

        for (const comparisonValue of sampleValues) {
          for (const [minValue, maxValue] of sampleIntervals) {
            await circuit.expectPass(
              { comparisonValue, minValue, maxValue },
              {
                out: BigInt(+inInterval(comparisonValue, [minValue, maxValue]))
              }
            );
          }
        }
      });

      it("should yield false for large field elements lying in a critical interval", async () => {
        for (const [minValue, maxValue] of sampleIntervals) {
          for (const comparisonValue of criticalIntervals(
            [minValue, maxValue],
            nBits
          ).flat()) {
            await circuit.expectPass(
              { comparisonValue, minValue, maxValue },
              { out: 0n }
            );
          }
        }
      });

      it("should fail for elements of the complement interval", async () => {
        for (const [minValue, maxValue] of sampleIntervals) {
          const sampleComplementInterval = complementInterval(
            [minValue, maxValue],
            nBits
          );
          for (const comparisonValue of sampleComplementInterval.concat([
            sampleComplementInterval[0] + 1n,
            (sampleComplementInterval[0] + sampleComplementInterval[1]) / 2n,
            sampleComplementInterval[1] - 1n
          ])) {
            await circuit.expectFail({
              comparisonValue,
              minValue,
              maxValue
            });
          }
        }
      });

      it("should pass for elements just outside of the complement interval", async () => {
        for (const [minValue, maxValue] of sampleIntervals) {
          const sampleComplementInterval = complementInterval(
            [minValue, maxValue],
            nBits
          );
          for (const comparisonValue of [
            (sampleComplementInterval[0] - 1n) % p,
            (sampleComplementInterval[1] + 1n) % p
          ]) {
            await circuit.expectPass({
              comparisonValue,
              minValue,
              maxValue
            });
          }
        }
      });
    }
  );
}
