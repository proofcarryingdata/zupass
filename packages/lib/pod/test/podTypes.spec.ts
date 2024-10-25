import { BABY_JUB_PRIME } from "@pcd/util";
import { r } from "@zk-kit/baby-jubjub";
import { expect } from "chai";
import "mocha";
import {
  POD_CRYPTOGRAPHIC_MAX,
  POD_DATE_MAX,
  POD_DATE_MIN,
  POD_INT_MAX,
  POD_INT_MIN,
  PODNull
} from "../src/podTypes";

describe("POD type values should be correct", () => {
  it("should have the correct BabyJubjubR constant", () => {
    expect(POD_CRYPTOGRAPHIC_MAX + 1n).to.equal(r);
    expect(POD_CRYPTOGRAPHIC_MAX + 1n).to.equal(BABY_JUB_PRIME);
  });

  it("date range should fit inside int range", () => {
    expect(BigInt(POD_DATE_MIN.getTime()) > POD_INT_MIN).to.be.true;
    expect(BigInt(POD_DATE_MAX.getTime()) < POD_INT_MAX).to.be.true;
  });

  it("PODNull should be well-formed", () => {
    expect(PODNull.type).to.eq("null");
    expect(PODNull.value).to.be.null;
  });
});
