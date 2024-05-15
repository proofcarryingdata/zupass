import "mocha";
import { gpcDemo } from "../src";
import { podDemo } from "../src/podExample";

describe("pod-example should work", async function () {
  it("POD Demo", async function () {
    await podDemo();
  });

  it("GPC Demo", async function () {
    await gpcDemo();
  });
});
