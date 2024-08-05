import { expect } from "chai";
import "mocha";
import { flattenObject } from "../src/index.js";

describe("various utils functions should work", async function () {
  it("flattenObject should work", function () {
    const obj = { a: "b", c: "d", e: { f: "g", h: "i" }, j: [], k: {} };

    expect(flattenObject(obj)).to.deep.eq([
      ["a", "b"],
      ["c", "d"],
      ["e.f", "g"],
      ["e.h", "i"]
    ]);
  });
});
