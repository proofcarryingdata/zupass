/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { Identity } from "@semaphore-protocol/identity";
import "mocha";
import { RSAPCDArgs } from "../src/RSAPCD";

describe("RSA signature PCD should work", function () {
  this.timeout(1000 * 30);

  // sets up shared Semaphore args across test cases
  let args: RSAPCDArgs;

  this.beforeAll(async function () {
    const identity = new Identity();
    const identityPCD = await SemaphoreIdentityPCDPackage.serialize(
      await SemaphoreIdentityPCDPackage.prove({ identity })
    );

    args = {};
  });
});
