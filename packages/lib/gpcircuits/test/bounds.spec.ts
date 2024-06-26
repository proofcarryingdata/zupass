import { WitnessTester } from "circomkit";
import "mocha";
import {
  BoundsCheckModuleInputNamesType,
  BoundsCheckModuleOutputNamesType,
  InIntervalInputNamesType,
  InIntervalOutputNamesType,
  padArray
} from "../src";
import { circomkit } from "./common";

function inInterval(input: bigint, bounds: bigint[]): boolean {
  return bounds[0] <= input && input <= bounds[1];
}

// 'Critical intervals' are those intervals of field elements which are larger
// than 64 bits yet still satisfy the constraints of the `InInterval` circuit for given bounds [a,b].
// These are the intervals [1 << 64, 1 << 64 + a[ and ]p - 1 << 64 + b, p[, where p is the field modulus. This procedure returns these as an array of closed intervals, where empty intervals are omitted.
function criticalIntervals(bounds: [bigint, bigint]): [bigint, bigint][] {
  if (bounds.some((bound) => !inInterval(bound, [0n, 1n << 64n]))) {
    throw new TypeError("Invalid bounds");
  }
  const [a, b] = bounds;
  return (
    [
      [1n << 64n, (1n << 64n) + a - 1n],
      [
        21888242871839275222246405745257275088548364400416034343698204186575808495617n -
          (1n << 64n) +
          b +
          1n,
        21888242871839275222246405745257275088548364400416034343698204186575808495616n
      ]
    ] as [bigint, bigint][]
  ).filter(([c, d]) => d - c >= 0);
}

// The complement interval of [0, 1 << n[ ∪ critical interval.
function complementInterval(bounds: [bigint, bigint]): [bigint, bigint] {
  if (bounds.some((bound) => !inInterval(bound, [0n, 1n << 64n]))) {
    throw new TypeError("Invalid bounds");
  }
  const [a, b] = bounds;
  const c = (1n << 64n) + a;
  const d =
    21888242871839275222246405745257275088548364400416034343698204186575808495617n -
    (1n << 64n) +
    b;
  return [c, d];
}

const sampleIntervals: [bigint, bigint][] = [
  [0n, 0n],
  [0n, 1n << 4n],
  [1n << 5n, 1n << 29n],
  [1n << 4n, 1n << 31n],
  [0n, (1n << 64n) - 1n]
];

const sampleValues = [0n, 1n << 5n, 1n << 16n, 1n << 30n, (1n << 64n) - 1n];

describe("bounds.InInterval should work for intervals [a,b] of 64-bit unsigned integers", function () {
  let circuit: WitnessTester<
    InIntervalInputNamesType,
    InIntervalOutputNamesType
  >;

  this.beforeAll(async () => {
    circuit = await circomkit.WitnessTester("InInterval", {
      file: "bounds",
      template: "InInterval",
      params: [64]
    });
  });

  it("should yield expected output for 64-bit unsigned values and bounds", async () => {
    for (const sampleValue of sampleValues) {
      for (const sampleInterval of sampleIntervals) {
        await circuit.expectPass(
          { in: sampleValue, bounds: sampleInterval },
          { out: BigInt(+inInterval(sampleValue, sampleInterval)) }
        );
      }
    }
  });

  it("should yield false for large field elements lying in a critical interval", async () => {
    for (const [a, b] of sampleIntervals) {
      for (const sampleValue of criticalIntervals([a, b]).flat()) {
        await circuit.expectPass(
          { in: sampleValue, bounds: [a, b] },
          { out: 0n }
        );
      }
    }
  });

  it("should fail for other field elements", async () => {
    for (const [a, b] of sampleIntervals) {
      const c = (1n << 64n) + a;
      const d =
        21888242871839275222246405745257275088548364400416034343698204186575808495617n -
        (1n << 64n) +
        b;
      for (const sampleValue of [c, (c + d) / 2n, d]) {
        await circuit.expectFail({ in: sampleValue, bounds: [a, b] });
      }
    }
  });
});

describe("bounds.BoundsCheckModule should work", function () {
  const circuit = async (
    maxBoundsChecks: number
  ): Promise<
    WitnessTester<
      BoundsCheckModuleInputNamesType,
      BoundsCheckModuleOutputNamesType
    >
  > =>
    await circomkit.WitnessTester("BoundsCheckModule", {
      file: "bounds",
      template: "BoundsCheckModule",
      params: [maxBoundsChecks]
    });

  const samplePassValues = [0n, 15n, 1n << 7n, 1n << 30n, 1n << 63n];

  it("should pass for 64-bit unsigned values within 64-bit unsigned integer bounds", async () => {
    for (
      let maxBoundsChecks = 0;
      maxBoundsChecks < sampleIntervals.length;
      maxBoundsChecks++
    ) {
      const truncatedSamplePassValues = samplePassValues.slice(
        0,
        maxBoundsChecks
      );
      const truncatedSampleIntervals = sampleIntervals.slice(
        0,
        maxBoundsChecks
      );

      // Without padding
      await (
        await circuit(maxBoundsChecks)
      ).expectPass(
        {
          comparisonValues: truncatedSamplePassValues,
          bounds: truncatedSampleIntervals
        },
        {}
      );

      // With padding
      await (
        await circuit(samplePassValues.length)
      ).expectPass(
        {
          comparisonValues: padArray(
            truncatedSamplePassValues,
            samplePassValues.length,
            0n
          ),
          bounds: padArray(truncatedSampleIntervals, samplePassValues.length, [
            0n,
            0n
          ])
        },
        {}
      );
    }
  });

  it("should fail for 64-bit unsigned values lying outside of 64-bit unsigned integer bounds", async () => {
    for (const sampleFailValues of [
      [1n, 15n, 1n << 7n, 1n << 30n, 1n << 63n],
      [0n, 20n, 1n << 20n],
      [1n, 15n, 1n << 7n, 1n << 32n]
    ]) {
      const maxBoundsChecks = sampleFailValues.length;
      await (
        await circuit(maxBoundsChecks)
      ).expectFail({
        comparisonValues: sampleFailValues,
        bounds: sampleIntervals.slice(0, maxBoundsChecks)
      });
    }
  });

  it("should fail for other field elements", async () => {
    // Test with padding for clarity
    for (const sampleInterval of sampleIntervals) {
      for (const sampleValue of criticalIntervals(sampleInterval)
        .flat()
        .concat(complementInterval(sampleInterval))) {
        for (
          let maxBoundsChecks = 1;
          maxBoundsChecks < sampleInterval.length;
          maxBoundsChecks++
        ) {
          await (
            await circuit(maxBoundsChecks)
          ).expectFail({
            comparisonValues: padArray([sampleValue], maxBoundsChecks, 0n),
            bounds: padArray([sampleInterval], maxBoundsChecks, [0n, 0n])
          });
        }
      }
    }
  });
});
