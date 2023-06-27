import "mocha";
import { startApplication } from "../src/application";
import { PCDPass } from "../src/types";

describe("this is a placeholder test", function () {
  let application: PCDPass;

  this.beforeAll(async () => {
    console.log("starting application");
    application = await startApplication();
  });

  it("should pass", async function () {});
});
