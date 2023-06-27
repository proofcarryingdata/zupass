import {
  PendingPCDStatus,
  ProveRequest,
  StatusResponse,
} from "@pcd/passport-interface";
import chai, { expect } from "chai";
import spies from "chai-spies";
import "mocha";
import { step } from "mocha-steps";
import { startApplication, stopApplication } from "../src/application";
import { PCDPass } from "../src/types";
import { submitAndWaitForPendingPCD } from "./proving/proving";

chai.use(spies);

describe.only("semaphore service", function () {
  this.timeout(0);

  let application: PCDPass;

  this.beforeAll(async () => {
    console.log("starting application");
    application = await startApplication();
  });

  this.afterAll(async () => {
    await stopApplication(application);
  });

  step("should be able to prove using remote prover", async function () {
    const proveRequest: ProveRequest = {
      args: {},
      pcdType: "",
    };

    await submitAndWaitForPendingPCD(application, proveRequest, async (r) => {
      const settledStatusResponse = r.body as StatusResponse;
      expect(settledStatusResponse.status).to.eq(PendingPCDStatus.ERROR);
    });
  });
});
