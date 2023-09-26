import {
  passportDecrypt,
  passportEncrypt,
  PCDCrypto
} from "@pcd/passport-crypto";
import {
  requestEncryptedStorage,
  requestUploadEncryptedStorage
} from "@pcd/passport-interface";
import { expect } from "chai";
import "chai-spies";
import "mocha";
import { PCDpass } from "../../src/types";

export async function testUserSync(application: PCDpass): Promise<void> {
  const crypto = await PCDCrypto.newInstance();
  const encryptionKey = await crypto.generateRandomKey();

  const plaintextData = {
    test: "test",
    one: 1
  };

  const encryptedData = await passportEncrypt(
    JSON.stringify(plaintextData),
    encryptionKey
  );

  const uploadResult = await requestUploadEncryptedStorage(
    application.expressContext.localEndpoint,
    encryptionKey,
    encryptedData
  );

  expect(uploadResult.error).to.eq(undefined);
  expect(uploadResult.success).to.eq(true);

  const secondLoadResult = await requestEncryptedStorage(
    application.expressContext.localEndpoint,
    encryptionKey
  );

  if (secondLoadResult.value == null) {
    throw new Error("expected to be able to load e2ee");
  }

  const decrypted: string = await passportDecrypt(
    secondLoadResult.value,
    encryptionKey
  );

  expect(JSON.parse(decrypted)).to.deep.eq(plaintextData);
}
