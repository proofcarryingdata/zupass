import "mocha";
import { demo } from "../src/podExample";

describe("pod-example should work", async function () {
  it("pod-example should do something", async function () {
    await demo();
  });
});
