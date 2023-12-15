import { PCDCrypto } from "@pcd/passport-crypto";
import { ZupassUserJson } from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { v4 as uuid } from "uuid";
import { randomEmail } from "../src/util";
import { validateAppState } from "../src/validateState";

describe("validateAppState", async function () {
  it("validateState works properly", async function () {
    const identity = new Identity();
    const crypto = await PCDCrypto.newInstance();
    const password = "testpassword123!@#asdf";
    const saltAndEncryptionKey =
      await crypto.generateSaltAndEncryptionKey(password);
    const id = uuid();

    const self: ZupassUserJson = {
      commitment: identity.commitment.toString(),
      email: randomEmail(),
      salt: saltAndEncryptionKey.salt,
      terms_agreed: 1,
      uuid: id
    };
    const pcdPackages = [SemaphoreIdentityPCDPackage];
    const collection = new PCDCollection(pcdPackages);

    validateAppState(self, identity, collection);
  });
});
