import { WitnessTester } from "circomkit";
import "mocha";
import {
  BoundsCheckModuleInputNamesType,
  BoundsCheckModuleOutputNamesType
} from "../src";
import { circomkit } from "./common";

function inInterval(input: bigint, bounds: bigint[]): boolean {
  return bounds[0] <= input && input <= bounds[1];
}

// 'Critical intervals' are those intervals of field elements which are larger
// than `nBits` bits yet still satisfy the constraints of the `InInterval`
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
    throw new TypeError("Invalid bounds");
  }
  const [a, b] = bounds;
  return (
    [
      [1n << BigInt(nBits), (1n << BigInt(nBits)) + a - 1n],
      [
        21888242871839275222246405745257275088548364400416034343698204186575808495617n -
          (1n << BigInt(nBits)) +
          b +
          1n,
        21888242871839275222246405745257275088548364400416034343698204186575808495616n
      ]
    ] as [bigint, bigint][]
  ).filter(([c, d]) => d - c >= 0);
}

// The complement interval of [0, 1 << n[ ∪ critical interval.
function complementInterval(
  bounds: [bigint, bigint],
  nBits: number
): [bigint, bigint] {
  if (bounds.some((bound) => !inInterval(bound, [0n, 1n << BigInt(nBits)]))) {
    throw new TypeError("Invalid bounds");
  }
  const [a, b] = bounds;
  const c = (1n << BigInt(nBits)) + a;
  const d =
    21888242871839275222246405745257275088548364400416034343698204186575808495617n -
    (1n << BigInt(nBits)) +
    b;
  return [c, d];
}

describe("bounds.BoundsCheckModule should work for intervals with 64-bit unsigned integer bounds", function () {
  const sampleIntervals: [bigint, bigint][] = [
    [0n, 0n],
    [0n, 1n << 4n],
    [1n << 5n, 1n << 29n],
    [1n << 4n, 1n << 31n],
    [0n, (1n << 64n) - 1n]
  ];

  const sampleValues = [0n, 1n << 5n, 1n << 16n, 1n << 30n, (1n << 64n) - 1n];

  let circuit: WitnessTester<
    BoundsCheckModuleInputNamesType,
    BoundsCheckModuleOutputNamesType
  >;

  this.beforeAll(async () => {
    circuit = await circomkit.WitnessTester("BoundsCheckModule", {
      file: "bounds",
      template: "BoundsCheckModule",
      params: [64]
    });
  });

  it("should yield expected output for 64-bit unsigned values and bounds", async () => {
    for (const comparisonValue of sampleValues) {
      for (const [minValue, maxValue] of sampleIntervals) {
        await circuit.expectPass(
          { comparisonValue, minValue, maxValue },
          { out: BigInt(+inInterval(comparisonValue, [minValue, maxValue])) }
        );
      }
    }
  });

  it("should yield false for large field elements lying in a critical interval", async () => {
    for (const [minValue, maxValue] of sampleIntervals) {
      for (const comparisonValue of criticalIntervals(
        [minValue, maxValue],
        64
      ).flat()) {
        await circuit.expectPass(
          { comparisonValue, minValue, maxValue },
          { out: 0n }
        );
      }
    }
  });

  it("should fail for other field elements", async () => {
    for (const [minValue, maxValue] of sampleIntervals) {
      const sampleComplementInterval = complementInterval(
        [minValue, maxValue],
        64
      );
      for (const comparisonValue of sampleComplementInterval.concat([
        (sampleComplementInterval[0] + sampleComplementInterval[1]) / 2n
      ])) {
        await circuit.expectFail({
          comparisonValue,
          minValue,
          maxValue
        });
      }
    }
  });
});

describe("bounds.BoundsCheckModule should work for intervals with 128-bit unsigned integer bounds", function () {
  const sampleIntervals: [bigint, bigint][] = [
    [0n, 0n],
    [0n, 1n << 8n],
    [1n << 15n, 1n << 64n],
    [1n << 20n, 1n << 96n],
    [0n, (1n << 128n) - 1n]
  ];

  const sampleValues = [0n, 1n << 5n, 1n << 16n, 1n << 90n, (1n << 128n) - 1n];

  let circuit: WitnessTester<
    BoundsCheckModuleInputNamesType,
    BoundsCheckModuleOutputNamesType
  >;

  this.beforeAll(async () => {
    circuit = await circomkit.WitnessTester("BoundsCheckModule", {
      file: "bounds",
      template: "BoundsCheckModule",
      params: [128]
    });
  });

  it("should yield expected output for 128-bit unsigned values and bounds", async () => {
    for (const comparisonValue of sampleValues) {
      for (const [minValue, maxValue] of sampleIntervals) {
        await circuit.expectPass(
          { comparisonValue, minValue, maxValue },
          { out: BigInt(+inInterval(comparisonValue, [minValue, maxValue])) }
        );
      }
    }
  });

  it("should yield false for large field elements lying in a critical interval", async () => {
    for (const [minValue, maxValue] of sampleIntervals) {
      for (const comparisonValue of criticalIntervals(
        [minValue, maxValue],
        128
      ).flat()) {
        await circuit.expectPass(
          { comparisonValue, minValue, maxValue },
          { out: 0n }
        );
      }
    }
  });

  it("should fail for other field elements", async () => {
    for (const [minValue, maxValue] of sampleIntervals) {
      const sampleComplementInterval = complementInterval(
        [minValue, maxValue],
        128
      );
      for (const comparisonValue of sampleComplementInterval.concat([
        (sampleComplementInterval[0] + sampleComplementInterval[1]) / 2n
      ])) {
        await circuit.expectFail({
          comparisonValue,
          minValue,
          maxValue
        });
      }
    }
  });
});

describe("bounds.BoundsCheckModule should work for intervals with 252-bit unsigned integer bounds", function () {
  const sampleIntervals: [bigint, bigint][] = [
    [0n, 0n],
    [0n, 1n << 97n],
    [1n << 30n, 1n << 100n],
    [1n << 80n, 1n << 220n],
    [0n, (1n << 252n) - 1n]
  ];

  const sampleValues = [
    0n,
    1n << 64n,
    1n << 96n,
    1n << 200n,
    (1n << 128n) - 1n
  ];

  let circuit: WitnessTester<
    BoundsCheckModuleInputNamesType,
    BoundsCheckModuleOutputNamesType
  >;

  this.beforeAll(async () => {
    circuit = await circomkit.WitnessTester("BoundsCheckModule", {
      file: "bounds",
      template: "BoundsCheckModule",
      params: [252]
    });
  });

  it("should yield expected output for 252-bit unsigned values and bounds", async () => {
    for (const comparisonValue of sampleValues) {
      for (const [minValue, maxValue] of sampleIntervals) {
        await circuit.expectPass(
          { comparisonValue, minValue, maxValue },
          { out: BigInt(+inInterval(comparisonValue, [minValue, maxValue])) }
        );
      }
    }
  });

  it("should yield false for large field elements lying in a critical interval", async () => {
    for (const [minValue, maxValue] of sampleIntervals) {
      for (const comparisonValue of criticalIntervals(
        [minValue, maxValue],
        252
      ).flat()) {
        await circuit.expectPass(
          { comparisonValue, minValue, maxValue },
          { out: 0n }
        );
      }
    }
  });

  it("should fail for other field elements", async () => {
    for (const [minValue, maxValue] of sampleIntervals) {
      const sampleComplementInterval = complementInterval(
        [minValue, maxValue],
        252
      );
      for (const comparisonValue of sampleComplementInterval.concat([
        (sampleComplementInterval[0] + sampleComplementInterval[1]) / 2n
      ])) {
        await circuit.expectFail({
          comparisonValue,
          minValue,
          maxValue
        });
      }
    }
  });
});
