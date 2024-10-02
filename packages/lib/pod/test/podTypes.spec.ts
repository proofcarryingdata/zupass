import { r } from "@zk-kit/baby-jubjub";
import { expect } from "chai";
import "mocha";
import { BabyJubjubR } from "../src/podTypes";

describe("POD type values should be correct", () => {
  it("should have the correct BabyJubjubR constant", () => {
    expect(BabyJubjubR).to.equal(r);
  });
});
