import { WitnessTester } from "circomkit";
import "mocha";
import {
  GlobalModuleInputNamesType,
  GlobalModuleOutputNamesType
} from "../src";
import { circomkit } from "./common";

describe("global.GlobalModule should work", function () {
  // Circuit compilation sometimes takes more than the default timeout of 2s.
  this.timeout(10000);
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
