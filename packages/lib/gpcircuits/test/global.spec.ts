import { WitnessTester } from "circomkit";
import "mocha";
import {
  GlobalModuleInputNamesType,
  GlobalModuleOutputNamesType
} from "../src/index.js";
import { circomkit } from "./common.js";

describe("global.GlobalModule should work", function () {
  // Circuit compilation sometimes takes more than the default timeout of 2s.
  let circuit: WitnessTester<
    GlobalModuleInputNamesType,
    GlobalModuleOutputNamesType
  >;

  this.beforeAll(async () => {
    circuit = await circomkit.WitnessTester("GlobalModule", {
      file: "global",
      template: "GlobalModule"
    });
  });

  it("should accept a watermark", async () => {
    await circuit.expectPass({ watermark: 0xfeedfacen }, {});
  });
});
