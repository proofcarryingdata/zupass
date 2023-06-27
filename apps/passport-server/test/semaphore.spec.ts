import { ZuParticipant } from "@pcd/passport-interface";
import chai, { expect } from "chai";
import spies from "chai-spies";
import "mocha";
import { step } from "mocha-steps";
import { stopApplication } from "../src/application";
import { PCDPass } from "../src/types";
import { startTestingApp } from "./startTestingApplication";
import { loginPCDPass } from "./user/loginPCDPass";

chai.use(spies);

describe("semaphore service", function () {
  let application: PCDPass;
  let user: ZuParticipant;

  this.beforeAll(async () => {
    console.log("starting application");
    application = await startTestingApp();
  });

  this.afterAll(async () => {
    await stopApplication(application);
  });

  step("should be able to log in", async function () {
    user = await loginPCDPass(application);
  });

  step("semaphore service should now be aware of the user", async function () {
    const { semaphoreService } = application.globalServices;
    const genericGroup = semaphoreService.groupGeneric();
    expect(genericGroup.group.indexOf(user.commitment)).to.be.above(0);
  });
});
