/* eslint-disable no-restricted-globals */
import { expect } from "chai";
import "mocha";
import { isValidEmoji } from "../src/util/util";

describe("passport-server utility functions", function () {
  this.timeout(30_000);
  it("isValidEmoji", () => {
    expect(isValidEmoji("🐸")).to.be.true;
    expect(isValidEmoji("🦔")).to.be.true;
    expect(isValidEmoji("👍")).to.be.true;
    expect(isValidEmoji("❤️")).to.be.true;
    expect(isValidEmoji("🐀")).to.be.true;
    expect(isValidEmoji("🦔👍")).to.be.true;
    expect(isValidEmoji("")).to.be.false;
    expect(isValidEmoji("a")).to.be.false;
    expect(isValidEmoji("abc")).to.be.false;
    expect(isValidEmoji("👍👍👍")).to.be.false;
    expect(isValidEmoji("1")).to.be.false;
    expect(isValidEmoji(".")).to.be.false;
    expect(isValidEmoji("*")).to.be.false;
  });
});
