import { expect } from "chai";
import "mocha";
import { babyJubIsNegativeOne, babyJubNegativeOne } from "../src";

describe("SNARKHelpers should work", async function () {
  it("BabyJubNegativeOne values should work", function () {
    expect(babyJubNegativeOne).to.eq(
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
    expect(babyJubIsNegativeOne(babyJubNegativeOne.toString())).to.eq(true);
  });
});
