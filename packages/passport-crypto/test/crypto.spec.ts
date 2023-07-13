import assert from "assert";
import { passportDecrypt, passportEncrypt } from "../src/endToEndEncryption";
import { PCDCrypto } from "../src/passportCrypto";

describe("Passport encryption", function () {
  it("Encryption and decryption works properly", async function () {
    const testUser = {
      commitment: "a",
      email: "b",
      name: "c",
      role: "e",
      uuid: "g",
    };
    const pcdCrypto = await PCDCrypto.newInstance();
    const encryptionKey = pcdCrypto.generateRandomKey(256);
    const sourcePCDs = [{ id: 1 }];
    const encrypted = await passportEncrypt(
      JSON.stringify({
        pcds: sourcePCDs,
        self: testUser,
      }),
      encryptionKey
    );
    const decrypted = await passportDecrypt(encrypted, encryptionKey);
    const destinationPCDs = decrypted.pcds as Array<{ id: number }>;
    assert.equal(destinationPCDs.length, 1);
    assert.equal(destinationPCDs[0].id, sourcePCDs[0].id);
    assert.deepEqual(decrypted.self, testUser);
  });
});
