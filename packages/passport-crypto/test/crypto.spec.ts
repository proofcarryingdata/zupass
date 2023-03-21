import { PCDCollection } from "@pcd/pcd-collection";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { Identity } from "@semaphore-protocol/identity";
import assert from "assert";
import { decryptStorage, encryptStorage } from "../src/endToEndEncryption";
import { PCDCrypto } from "../src/passportCrypto";

describe("passport crypto", function () {
  it("should work", async function () {
    const testToken = "abcdefg";
    const pcdCrypto = await PCDCrypto.newInstance();
    const identityPCD = await SemaphoreIdentityPCDPackage.prove({
      identity: new Identity(),
    });
    const packages = [SemaphoreIdentityPCDPackage];
    const sourcePCDs = new PCDCollection(packages, [identityPCD]);
    const encryptionKey = pcdCrypto.generateRandomKey(256);
    const encrypted = await encryptStorage(
      sourcePCDs,
      testToken,
      encryptionKey
    );
    const destinationPCDs = new PCDCollection(packages, []);
    const decrypted = await decryptStorage(encrypted, encryptionKey);
    await destinationPCDs.deserializeAllAndAdd(decrypted.pcds);

    assert.equal(destinationPCDs.getAll().length, 1);
    assert.equal(decrypted.serverToken, testToken);
  });
});
