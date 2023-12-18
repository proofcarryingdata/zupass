import { PCDCrypto } from "@pcd/passport-crypto";
import { ZupassUserJson } from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import { v4 as uuid } from "uuid";
import { randomEmail } from "../src/util";
import { validateAppState } from "../src/validateState";

describe("validateAppState", async function () {
  const crypto = await PCDCrypto.newInstance();
  const pcdPackages = [SemaphoreIdentityPCDPackage];

  it("validateState returns no errors on valid logged out state", async function () {
    const errors = validateAppState("test", undefined, undefined, undefined);
    expect(errors.errors.length).to.eq(0);
    expect(errors.userUUID).to.eq(undefined);
  });

  it("validateState returns no errors on valid logged in state", async function () {
    const identity = new Identity();
    const saltAndEncryptionKey = await crypto.generateSaltAndEncryptionKey(
      "testpassword123!@#asdf"
    );
    const self: ZupassUserJson = {
      commitment: identity.commitment.toString(),
      email: randomEmail(),
      salt: saltAndEncryptionKey.salt,
      terms_agreed: 1,
      uuid: uuid()
    };
    const pcds = new PCDCollection(pcdPackages);
    pcds.add(
      await SemaphoreIdentityPCDPackage.prove({
        identity
      })
    );
    const errors = validateAppState("test", self, identity, pcds);
    expect(errors.errors.length).to.eq(0);
    expect(errors.userUUID).to.eq(self.uuid);
  });

  it("validateState returns errors for situation where the pcd collection is empty", async function () {
    const identity = new Identity();
    const saltAndEncryptionKey = await crypto.generateSaltAndEncryptionKey(
      "testpassword123!@#asdf"
    );
    const self: ZupassUserJson = {
      commitment: identity.commitment.toString(),
      email: randomEmail(),
      salt: saltAndEncryptionKey.salt,
      terms_agreed: 1,
      uuid: uuid()
    };
    const pcds = new PCDCollection(pcdPackages);
    // deliberately create empty pcd collection
    const errors = validateAppState("test", self, identity, pcds);
    expect(errors.errors).to.deep.eq([
      "'pcds' contains no pcds",
      "'pcds' field in app state does not contain an identity PCD"
    ]);
    expect(errors.userUUID).to.eq(self.uuid);
  });
});
