import { ZuParticipant } from "@pcd/passport-interface";
import chai from "chai";
import spies from "chai-spies";
import "mocha";
import { step } from "mocha-steps";
import { startApplication, stopApplication } from "../src/application";
import { PCDPass } from "../src/types";
import { loginPCDPass } from "./user/loginPCDPass";
import { sync } from "./user/sync";

chai.use(spies);

describe("logging in and syncing", function () {
  let application: PCDPass;
  let user: ZuParticipant;

  this.beforeAll(async () => {
    console.log("starting application");
    application = await startApplication();
  });

  this.afterAll(async () => {
    await stopApplication(application);
  });

  step("should be able to log in", async function () {
    user = await loginPCDPass(application);
  });

  step("user should be able to sync end to end encryption", async function () {
    await sync(application, user);
  });
});
