import { expect } from "chai";
import "mocha";
import { startApplication, stopApplication } from "../src/application";
import { PCDpass } from "../src/types";
import { overrideEnvironment, zuzaluTestingEnv } from "./util/env";

describe("web server functionality", function () {
  this.timeout(15_000);

  let application: PCDpass;

  this.beforeAll(async function () {
    await overrideEnvironment(zuzaluTestingEnv);
    application = await startApplication();
  });

  this.afterAll(async function () {
    await stopApplication(application);
  });

  it("should return a 404 response for requests to routes that don't exist", async function () {
    const response = await fetch(
      `${application.expressContext.localEndpoint}/abcdefg12345678`
    );
    expect(response.status).to.eq(404);
  });

  it("should not return 404 for routes that do exist", async function () {
    const response = await fetch(
      `${application.expressContext.localEndpoint}/`
    );
    expect(response.status).to.eq(200);
  });

  it("should respond with uptime", async function () {
    const response = await fetch(
      `${application.expressContext.localEndpoint}/status/uptime`
    );
    expect(response.status).to.eq(200);
  });
});
