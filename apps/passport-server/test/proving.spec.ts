import chai from "chai";
import spies from "chai-spies";
import "mocha";
import { step } from "mocha-steps";
import { startApplication } from "../src/application";
import { PCDPass } from "../src/types";
import { sendProveRequest } from "./proving/proving";

chai.use(spies);

describe("semaphore service", function () {
  let application: PCDPass;

  this.beforeAll(async () => {
    console.log("starting application");
    application = await startApplication();
  });

  step("should be able to prove using remote prover", async function () {
    sendProveRequest(application);
  });
});
