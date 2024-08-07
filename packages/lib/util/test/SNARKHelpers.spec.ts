import { expect } from "chai";
import "mocha";
import { BABY_JUB_NEGATIVE_ONE, babyJubIsNegativeOne } from "../src";

describe("SNARKHelpers should work", async function () {
  it("BabyJubNegativeOne values should work", function () {
    expect(BABY_JUB_NEGATIVE_ONE).to.eq(
      BigInt(
        "21888242871839275222246405745257275088548364400416034343698204186575808495616"
      )
    );
    expect(babyJubIsNegativeOne("123")).to.eq(false);
    expect(babyJubIsNegativeOne("-1")).to.eq(true);
    expect(
      babyJubIsNegativeOne(
        "21888242871839275222246405745257275088548364400416034343698204186575808495616"
      )
    ).to.eq(true);
    expect(babyJubIsNegativeOne(BABY_JUB_NEGATIVE_ONE.toString())).to.eq(true);
  });
});
