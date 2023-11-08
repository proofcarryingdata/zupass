/* eslint-disable no-restricted-globals */
import { expect } from "chai";
import "mocha";
import { isValidSingleEmoji } from "../src/util/util";

describe("passport-server utility functions", function () {
  this.timeout(15_000);
  it("isValidSingleEmoji", () => {
    expect(isValidSingleEmoji("🐸")).to.be.true;
    expect(isValidSingleEmoji("🦔")).to.be.true;
    expect(isValidSingleEmoji("👍")).to.be.true;
    expect(isValidSingleEmoji("❤️")).to.be.true;
    expect(isValidSingleEmoji("🐀")).to.be.true;
    expect(isValidSingleEmoji("")).to.be.false;
    expect(isValidSingleEmoji("a")).to.be.false;
    expect(isValidSingleEmoji("abc")).to.be.false;
    expect(isValidSingleEmoji("👍👍")).to.be.false;
    expect(isValidSingleEmoji("🦔👍")).to.be.false;
    expect(isValidSingleEmoji("1")).to.be.false;
    expect(isValidSingleEmoji(".")).to.be.false;
    expect(isValidSingleEmoji("*")).to.be.false;
  });
});
