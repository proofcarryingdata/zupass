import { expect } from "chai";
import "mocha";
import { ClosedInterval, GPCProofEntryBoundsCheckConfig } from "../src";
import {
  gpcProofEntryBoundsCheckConfigFromJSON,
  gpcProofEntryBoundsCheckConfigToJSON
} from "../src/gpcValibot";
import * as ValibotClosedInterval from "../src/valibot/closedInterval";

// TODO(artwyman): Note the two different forms of import above and calling
// below.  Is the ValibotClosedInterval form cleaner?

describe("gpcValibot conversions should work", () => {
  it("ClosedInterval conversion", () => {
    const tsIn = { min: 123n, max: 456n } as unknown as ClosedInterval;

    const jsOut = ValibotClosedInterval.toJSON(tsIn);
    const tsOut = ValibotClosedInterval.fromJSON(jsOut);
    expect(tsOut).to.deep.equals(tsIn);
    const jsOut2 = ValibotClosedInterval.toJSON(tsOut);
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
