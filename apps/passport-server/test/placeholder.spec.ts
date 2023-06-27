import { Identity } from "@semaphore-protocol/identity";
import "mocha";
import httpMocks from "node-mocks-http";
import { startApplication } from "../src/application";
import { PCDPass } from "../src/types";

describe("this is a placeholder test", function () {
  let application: PCDPass;

  this.beforeAll(async () => {
    console.log("starting application");
    application = await startApplication();
  });

  it("should pass", async function () {
    const { userService } = application.globalServices;

    const testEmail = "test@test.com";
    const identity = new Identity();
    const commitment = identity.commitment.toString();

    const response = httpMocks.createResponse();

    await userService.handleSendPcdPassEmail(
      testEmail,
      commitment,
      true,
      response
    );
  });
});
