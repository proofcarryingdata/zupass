/* eslint-disable no-restricted-globals */
import { expect } from "chai";
import "mocha";
import { startApplication, stopApplication } from "../src/application";
import { ServerMode, Zupass } from "../src/types";
import { overrideEnvironment, testingEnv } from "./util/env";

describe("web server functionality", function () {
  let application: Zupass;

  this.beforeAll(async function () {
    await overrideEnvironment(testingEnv);
    application = await startApplication(ServerMode.UNIFIED);
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
