import { BABY_JUB_NEGATIVE_ONE } from "@pcd/util";
import { WitnessTester } from "circomkit";
import "mocha";
import { circomkit } from "./common";

describe("gpc-util.ValueOrNegativeOne should work", function () {
  // Circuit compilation sometimes takes more than the default timeout of 2s.
  let circuit: WitnessTester<["value", "shouldRevealValue"], ["out"]>;

  this.beforeAll(async () => {
    circuit = await circomkit.WitnessTester("ValueOrNegativeOne", {
      file: "gpc-util",
      template: "ValueOrNegativeOne"
    });
  });

  it("should reveal a value", async () => {
    await circuit.expectPass(
      { value: 12345n, shouldRevealValue: 1 },
      { out: 12345n }
    );
  });

  it("should hide a value", async () => {
    await circuit.expectPass(
      { value: 12345n, shouldRevealValue: 0 },
      { out: BABY_JUB_NEGATIVE_ONE }
    );
  });
});

describe("gpc-util.InputSelector should work", function () {
  let circuit: WitnessTester<["inputs", "selectedIndex"], ["out"]>;

  const N_INPUTS = 10;

  this.beforeAll(async () => {
    circuit = await circomkit.WitnessTester("InputSelector", {
      file: "gpc-util",
      template: "InputSelector",
      params: [N_INPUTS]
    });
  });

  it("should select each value", async () => {
    const inputs = [];
    for (let i = 0; i < N_INPUTS; i++) {
      inputs.push(i);
    }
    for (let i = 0; i < N_INPUTS; i++) {
      await circuit.expectPass(
        { inputs: inputs, selectedIndex: i },
        { out: i }
      );
    }
  });

  it("should reject out-of-range values", async () => {
    await circuit.expectFail({
      inputs: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      selectedIndex: -1
    });
    await circuit.expectFail({
      inputs: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      selectedIndex: 10
    });
  });
});
