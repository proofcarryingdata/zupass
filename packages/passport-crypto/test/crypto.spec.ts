import { PCDCollection } from "@pcd/pcd-collection";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { Identity } from "@semaphore-protocol/identity";
import assert from "assert";
import { decryptStorage, encryptStorage } from "../src/endToEndEncryption";
import { PCDCrypto } from "../src/passport-crypto";

describe("passport crypto", function () {
  it("should work", async function () {
    const pcdCrypto = await PCDCrypto.newInstance();

    const identityPCD = await SemaphoreIdentityPCDPackage.prove({
      identity: new Identity(),
    });
    const packages = [SemaphoreIdentityPCDPackage];
    const source = new PCDCollection(packages, [identityPCD]);
    const destination = new PCDCollection(packages, []);
    const encryptionKey = pcdCrypto.generateRandomKey(256);
    const encrypted = await encryptStorage(source, encryptionKey);
    await decryptStorage(encrypted, destination, encryptionKey);

    console.log("destination", destination);
    console.log("all", destination.getAll());

    assert.equal(destination.getAll().length, 1);
  });
});
