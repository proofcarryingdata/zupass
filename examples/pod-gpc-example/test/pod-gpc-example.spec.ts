import { expect } from "chai";
import "mocha";
import { gpcDemo } from "../src/index.js";
import { podDemo } from "../src/podExample.js";

describe("pod-gpc-example should work", async function () {
  it("POD Demo", async function () {
    expect(await podDemo()).to.be.true;
  });

  it("GPC Demo", async function () {
    expect(await gpcDemo()).to.be.true;
  });
});
