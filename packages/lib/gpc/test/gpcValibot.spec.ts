import { expect } from "chai";
import "mocha";
import { ClosedInterval, GPCProofEntryBoundsCheckConfig } from "../src";
import {
  gpcClosedIntervalFromJSON,
  gpcClosedIntervalToJSON,
  gpcProofEntryBoundsCheckConfigFromJSON,
  gpcProofEntryBoundsCheckConfigToJSON
} from "../src/gpcValibot";

describe("gpcValibot conversions should work", () => {
  it("ClosedInterval conversion", () => {
    const tsIn = { min: 123n, max: 456n } as unknown as ClosedInterval;

    const jsOut = gpcClosedIntervalToJSON(tsIn);
    const tsOut = gpcClosedIntervalFromJSON(jsOut);
    expect(tsOut).to.deep.equals(tsIn);
    const jsOut2 = gpcClosedIntervalToJSON(tsOut);
    expect(jsOut2).to.deep.equals(jsOut);
  });

  it("GPCProofEntryBoundsCheckConfig conversion", () => {
    const tsIn = {
      inRange: { min: 123n, max: 456n }
    } as unknown as GPCProofEntryBoundsCheckConfig;

    const jsOut = gpcProofEntryBoundsCheckConfigToJSON(tsIn);
    const tsOut = gpcProofEntryBoundsCheckConfigFromJSON(jsOut);
    expect(tsOut).to.deep.equals(tsIn);
    const jsOut2 = gpcProofEntryBoundsCheckConfigToJSON(tsOut);
    expect(jsOut2).to.deep.equals(jsOut);
  });
});
