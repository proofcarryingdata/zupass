import { expect } from "chai";
import "mocha";
import { gpcDemo } from "../src";
import { podDemo } from "../src/podExample";

describe("pod-gpc-example should work", async function () {
  it("POD Demo", async function () {
    expect(await podDemo()).to.be.true;
  });

  it("GPC Demo", async function () {
    expect(await gpcDemo()).to.be.true;
  });
});
