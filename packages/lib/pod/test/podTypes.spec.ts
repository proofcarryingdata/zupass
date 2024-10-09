import { BABY_JUB_PRIME } from "@pcd/util";
import { r } from "@zk-kit/baby-jubjub";
import { expect } from "chai";
import "mocha";
import { POD_CRYPTOGRAPHIC_MAX } from "../src/podTypes";

describe("POD type values should be correct", () => {
  it("should have the correct BabyJubjubR constant", () => {
    expect(POD_CRYPTOGRAPHIC_MAX + 1n).to.equal(r);
    expect(POD_CRYPTOGRAPHIC_MAX + 1n).to.equal(BABY_JUB_PRIME);
  });
});
