import { PendingPCD, ProveRequest } from "@pcd/passport-interface";
import chai, { expect } from "chai";
import spies from "chai-spies";
import "mocha";
import { step } from "mocha-steps";
import { startApplication, stopApplication } from "../src/application";
import { PCDPass } from "../src/types";
import { sendProveRequest } from "./proving/proving";

chai.use(spies);

describe.only("semaphore service", function () {
  this.timeout(0);

  let application: PCDPass;

  this.beforeAll(async () => {
    console.log("starting application");
    application = await startApplication();
  });

  step("should be able to prove using remote prover", async function () {
    const proveRequest: ProveRequest = {
      args: {},
      pcdType: "",
    };

    await sendProveRequest(application, proveRequest, async (r) => {
      const response = r.body as PendingPCD;
      expect(response).to.haveOwnProperty("pcdType");
      expect(response).to.haveOwnProperty("hash");
      expect(response).to.haveOwnProperty("status");
      expect(r.statusCode).to.eq(200);
    });
  });

  this.afterAll(async () => {
    await stopApplication(application);
  });
});
