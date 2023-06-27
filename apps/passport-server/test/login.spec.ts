import { ZuParticipant } from "@pcd/passport-interface";
import { expect } from "chai";
import "mocha";
import { step } from "mocha-steps";
import { startApplication } from "../src/application";
import { PCDPass } from "../src/types";
import { login } from "./login";

describe("user functionality", function () {
  let application: PCDPass;
  let user: ZuParticipant;

  this.beforeAll(async () => {
    console.log("starting application");
    application = await startApplication();
  });

  step("should be able to log in", async function () {
    user = await login(application);
  });

  step("user should be able to sync end to end encryption", async function () {
    expect(user).to.not.eq(null);
  });
});
