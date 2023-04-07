import { PCDCollection } from "@pcd/pcd-collection";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { Identity } from "@semaphore-protocol/identity";
import assert from "assert";
import { passportDecrypt, passportEncrypt } from "../src/endToEndEncryption";
import { PCDCrypto } from "../src/passportCrypto";

describe("Passport encryption", function () {
  it("Encryption and decryption works properly", async function () {
    const testParticipant = {
      commitment: "a",
      email: "b",
      name: "c",
      residence: "d",
      role: "e",
      uuid: "g",
    };
    const pcdCrypto = await PCDCrypto.newInstance();
    const identityPCD = await SemaphoreIdentityPCDPackage.prove({
      identity: new Identity(),
    });
    const packages = [SemaphoreIdentityPCDPackage];
    const sourcePCDs = new PCDCollection(packages, [identityPCD]);
    const encryptionKey = pcdCrypto.generateRandomKey(256);
    const encrypted = await passportEncrypt(
      JSON.stringify({
        pcds: await sourcePCDs.serializeAll(),
        self: testParticipant,
      }),
      encryptionKey
    );
    const destinationPCDs = new PCDCollection(packages, []);
    const decrypted = await passportDecrypt(encrypted, encryptionKey);
    await destinationPCDs.deserializeAllAndAdd(decrypted.pcds);

    assert.equal(destinationPCDs.getAll().length, 1);
    assert.equal(destinationPCDs.getAll()[0].id, sourcePCDs.getAll()[0].id);
    assert.deepEqual(decrypted.self, testParticipant);
  });
});
