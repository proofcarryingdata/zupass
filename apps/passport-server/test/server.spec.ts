import { expect } from "chai";
import "mocha";
import { startApplication, stopApplication } from "../src/application";
import { PCDpass } from "../src/types";
import { makeGetRequest } from "./requests/makeRequest";
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
    const response = await makeGetRequest(application, "/abcdefg12345678");
    expect(response.status).to.eq(404);
  });

  it("should not return 404 for routes that do exist", async function () {
    const response = await makeGetRequest(application, "/");
    expect(response.status).to.eq(200);
  });

  it("should respond with uptime", async function () {
    const response = await makeGetRequest(application, "/status/uptime");
    expect(response.status).to.eq(200);
  });
});
