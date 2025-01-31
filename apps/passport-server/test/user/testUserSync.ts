import {
  EncryptedPacket,
  HexString,
  passportDecrypt,
  passportEncrypt,
  PCDCrypto
} from "@pcd/passport-crypto";
import {
  requestChangeBlobKey,
  requestEncryptedStorage,
  requestUploadEncryptedStorage,
  User
} from "@pcd/passport-interface";
import { expect } from "chai";
import { randomBytes } from "crypto";
import "mocha";
import { v4 as uuid } from "uuid";
import { Zupass } from "../../src/types";

async function fetchAndCheckStorage(
  application: Zupass,
  encryptionKey: HexString,
  expectedRevision: string | undefined,
  expectedPlaintextData: object
): Promise<void> {
  // Fetch storage
  const fetchResult1 = await requestEncryptedStorage(
    application.expressContext.localEndpoint,
    encryptionKey
  );
  expect(fetchResult1.success).to.eq(true);
  expect(fetchResult1.value?.revision).to.eq(expectedRevision);

  if (!fetchResult1.value?.encryptedBlob) {
    throw new Error("expected value from loading e2ee");
  }

  // Decrypt storage
  const decryptedData1: string = await passportDecrypt(
    JSON.parse(fetchResult1.value.encryptedBlob) as EncryptedPacket,
    encryptionKey
  );
  expect(JSON.parse(decryptedData1)).to.deep.eq(expectedPlaintextData);
}

export async function testUserSyncNoRev(application: Zupass): Promise<void> {
  const crypto = await PCDCrypto.newInstance();
  const encryptionKey = await crypto.generateRandomKey();

  const plaintextData1 = {
    test: "test",
    one: 1
  };

  const encryptedData1 = await passportEncrypt(
    JSON.stringify(plaintextData1),
    encryptionKey
  );

  // Storage shouldn't exist yet.
  const initialLoadResult = await requestEncryptedStorage(
    application.expressContext.localEndpoint,
    encryptionKey
  );
  expect(initialLoadResult.success).to.eq(false);
  expect(initialLoadResult.error?.name).to.eq("NotFound");

  // Create storage
  const uploadResult1 = await requestUploadEncryptedStorage(
    application.expressContext.localEndpoint,
    encryptionKey,
    encryptedData1
  );
  expect(uploadResult1.error).to.eq(undefined);
  expect(uploadResult1.success).to.eq(true);
  expect(uploadResult1.value).to.not.be.undefined;
  expect(uploadResult1.value?.revision).to.not.be.undefined;
  const rev1 = uploadResult1.value?.revision;

  await fetchAndCheckStorage(application, encryptionKey, rev1, plaintextData1);

  const plaintextData2 = {
    test: "test",
    two: 2
  };

  const encryptedData2 = await passportEncrypt(
    JSON.stringify(plaintextData2),
    encryptionKey
  );

  // Update storage
  const uploadResult2 = await requestUploadEncryptedStorage(
    application.expressContext.localEndpoint,
    encryptionKey,
    encryptedData2
  );
  expect(uploadResult2.error).to.eq(undefined);
  expect(uploadResult2.success).to.eq(true);
  expect(uploadResult2.value).to.not.be.undefined;
  expect(uploadResult2.value?.revision).to.not.be.undefined;
  const rev2 = uploadResult2.value?.revision;
  expect(rev2).to.not.eq(rev1);

  await fetchAndCheckStorage(application, encryptionKey, rev2, plaintextData2);
}

export async function testUserSyncWithRev(application: Zupass): Promise<void> {
  const crypto = await PCDCrypto.newInstance();
  const encryptionKey = await crypto.generateRandomKey();

  const plaintextData1 = {
    test: "test",
    one: 1
  };

  const encryptedData1 = await passportEncrypt(
    JSON.stringify(plaintextData1),
    encryptionKey
  );

  // Storage shouldn't exist yet.
  const initialLoadResult = await requestEncryptedStorage(
    application.expressContext.localEndpoint,
    encryptionKey,
    "0"
  );
  expect(initialLoadResult.success).to.eq(false);
  expect(initialLoadResult.error?.name).to.eq("NotFound");

  // Attempting update with rev will still result in NotFound, not a conflict.
  const notfoundUploadResult = await requestUploadEncryptedStorage(
    application.expressContext.localEndpoint,
    encryptionKey,
    encryptedData1,
    "0"
  );
  expect(notfoundUploadResult.value).to.eq(undefined);
  expect(notfoundUploadResult.success).to.eq(false);
  expect(notfoundUploadResult.error?.name).to.eq("NotFound");

  // Create storage with no rev (required for first write)
  const uploadResult1 = await requestUploadEncryptedStorage(
    application.expressContext.localEndpoint,
    encryptionKey,
    encryptedData1,
    undefined /* knownRevision */
  );
  expect(uploadResult1.error).to.eq(undefined);
  expect(uploadResult1.success).to.eq(true);
  expect(uploadResult1.value).to.not.be.undefined;
  expect(uploadResult1.value?.revision).to.not.be.undefined;
  const rev1 = uploadResult1.value?.revision;

  await fetchAndCheckStorage(application, encryptionKey, rev1, plaintextData1);

  // Fetch with knownRevision should result in empty download
  const fetchKnown1 = await requestEncryptedStorage(
    application.expressContext.localEndpoint,
    encryptionKey,
    rev1
  );
  expect(fetchKnown1.success).to.eq(true);
  expect(fetchKnown1.value?.revision).to.eq(rev1);
  expect(fetchKnown1.value?.encryptedBlob).to.be.undefined;

  const plaintextData2 = {
    test: "test",
    two: 2
  };

  const encryptedData2 = await passportEncrypt(
    JSON.stringify(plaintextData2),
    encryptionKey
  );

  // Update storage with rev
  const uploadResult2 = await requestUploadEncryptedStorage(
    application.expressContext.localEndpoint,
    encryptionKey,
    encryptedData2,
    rev1
  );
  expect(uploadResult2.error).to.eq(undefined);
  expect(uploadResult2.success).to.eq(true);
  expect(uploadResult2.value).to.not.be.undefined;
  expect(uploadResult2.value?.revision).to.not.be.undefined;
  const rev2 = uploadResult2.value?.revision;
  expect(rev2).to.not.eq(rev1);

  await fetchAndCheckStorage(application, encryptionKey, rev2, plaintextData2);

  const plaintextData3 = {
    test: "test",
    three: 3
  };

  const encryptedData3 = await passportEncrypt(
    JSON.stringify(plaintextData3),
    encryptionKey
  );

  // Attempt update with earlier rev, receiving conflict with no changes
  const conflictResult1 = await requestUploadEncryptedStorage(
    application.expressContext.localEndpoint,
    encryptionKey,
    encryptedData3,
    rev1
  );
  expect(conflictResult1.success).to.eq(false);
  expect(conflictResult1.value).to.be.undefined;
  expect(conflictResult1.error?.name).to.eq("Conflict");

  await fetchAndCheckStorage(application, encryptionKey, rev2, plaintextData2);

  // Attempt update with proper rev, which should work after conflict
  const uploadResult3 = await requestUploadEncryptedStorage(
    application.expressContext.localEndpoint,
    encryptionKey,
    encryptedData3,
    rev2
  );
  expect(uploadResult3.error).to.eq(undefined);
  expect(uploadResult3.success).to.eq(true);
  expect(uploadResult3.value).to.not.be.undefined;
  expect(uploadResult3.value?.revision).to.not.be.undefined;
  const rev3 = uploadResult3.value?.revision;
  expect(rev3).to.not.eq(rev2);
  expect(rev3).to.not.eq(rev1);

  await fetchAndCheckStorage(application, encryptionKey, rev3, plaintextData3);
}

export async function testUserSyncKeyChangeNoRev(
  application: Zupass,
  user: User
): Promise<void> {
  if (!user.salt) {
    throw new Error("user requires salt for this test");
  }

  const crypto = await PCDCrypto.newInstance();
  const encryptionKey1 = await crypto.generateRandomKey();

  const encryptionKey2 = await crypto.generateRandomKey();
  const newSalt = randomBytes(32).toString("hex");

  const plaintextData1 = {
    test: "test",
    one: 1
  };

  const encryptedData1 = await passportEncrypt(
    JSON.stringify(plaintextData1),
    encryptionKey1
  );

  const rekeyedEncryptedData = await passportEncrypt(
    JSON.stringify(plaintextData1),
    encryptionKey2
  );

  // Attempt key change on nonexistant storage.
  const noKeyResult = await requestChangeBlobKey(
    application.expressContext.localEndpoint,
    encryptionKey1,
    encryptionKey2,
    user.uuid,
    newSalt,
    rekeyedEncryptedData
  );
  expect(noKeyResult.success).to.eq(false);
  expect(noKeyResult.value).to.be.undefined;
  expect(noKeyResult.error?.name).to.eq("PasswordIncorrect");

  // Create storage
  const uploadResult1 = await requestUploadEncryptedStorage(
    application.expressContext.localEndpoint,
    encryptionKey1,
    encryptedData1
  );
  expect(uploadResult1.error).to.eq(undefined);
  expect(uploadResult1.success).to.eq(true);
  expect(uploadResult1.value).to.not.be.undefined;
  expect(uploadResult1.value?.revision).to.not.be.undefined;
  const rev1 = uploadResult1.value?.revision;

  await fetchAndCheckStorage(application, encryptionKey1, rev1, plaintextData1);

  // Attempt key change on nonexistant user.
  const noUserResult = await requestChangeBlobKey(
    application.expressContext.localEndpoint,
    encryptionKey1,
    encryptionKey2,
    uuid(),
    newSalt,
    rekeyedEncryptedData
  );
  expect(noUserResult.success).to.eq(false);
  expect(noUserResult.value).to.be.undefined;
  expect(noUserResult.error?.name).to.eq("UserNotFound");

  // Attempt key change with unchanged salt
  const noSaltResult = await requestChangeBlobKey(
    application.expressContext.localEndpoint,
    encryptionKey1,
    encryptionKey2,
    user.uuid,
    user.salt,
    rekeyedEncryptedData
  );
  expect(noSaltResult.success).to.eq(false);
  expect(noSaltResult.value).to.be.undefined;
  expect(noSaltResult.error?.name).to.eq("RequiresNewSalt");

  // Successful key change.
  const rekeyResult1 = await requestChangeBlobKey(
    application.expressContext.localEndpoint,
    encryptionKey1,
    encryptionKey2,
    user.uuid,
    newSalt,
    rekeyedEncryptedData
  );
  expect(rekeyResult1.success).to.eq(true);
  expect(rekeyResult1.error).to.be.undefined;
  expect(rekeyResult1.value?.revision).to.not.be.undefined;
  expect(rekeyResult1.value?.revision).to.not.eq(rev1);
  const rev2 = rekeyResult1.value?.revision;

  // Update salt in user object.
  user.salt = newSalt;

  await fetchAndCheckStorage(application, encryptionKey2, rev2, plaintextData1);

  // Storage shouldn't exist anymore under old key.
  const oldKeyLoadResult = await requestEncryptedStorage(
    application.expressContext.localEndpoint,
    encryptionKey1
  );
  expect(oldKeyLoadResult.success).to.eq(false);
  expect(oldKeyLoadResult.error?.name).to.eq("NotFound");
}

export async function testUserSyncKeyChangeWithRev(
  application: Zupass,
  user: User
): Promise<void> {
  if (!user.salt) {
    throw new Error("user requires salt for this test");
  }

  const crypto = await PCDCrypto.newInstance();
  const encryptionKey1 = await crypto.generateRandomKey();

  const encryptionKey2 = await crypto.generateRandomKey();
  const newSalt = randomBytes(32).toString("hex");

  const plaintextData1 = {
    test: "test",
    one: 1
  };

  const encryptedData1 = await passportEncrypt(
    JSON.stringify(plaintextData1),
    encryptionKey1
  );

  const plaintextData2 = {
    test: "test",
    two: 2
  };

  const encryptedData2 = await passportEncrypt(
    JSON.stringify(plaintextData2),
    encryptionKey1
  );

  const rekeyedEncryptedData = await passportEncrypt(
    JSON.stringify(plaintextData2),
    encryptionKey2
  );

  // Attempt key change on nonexistant storage.
  const noKeyResult = await requestChangeBlobKey(
    application.expressContext.localEndpoint,
    encryptionKey1,
    encryptionKey2,
    user.uuid,
    newSalt,
    rekeyedEncryptedData,
    "0"
  );
  expect(noKeyResult.success).to.eq(false);
  expect(noKeyResult.value).to.be.undefined;
  expect(noKeyResult.error?.name).to.eq("PasswordIncorrect");

  // Create storage (no rev for initial creation)
  const uploadResult1 = await requestUploadEncryptedStorage(
    application.expressContext.localEndpoint,
    encryptionKey1,
    encryptedData1
  );
  expect(uploadResult1.error).to.eq(undefined);
  expect(uploadResult1.success).to.eq(true);
  expect(uploadResult1.value).to.not.be.undefined;
  expect(uploadResult1.value?.revision).to.not.be.undefined;
  const rev1 = uploadResult1.value?.revision;

  await fetchAndCheckStorage(application, encryptionKey1, rev1, plaintextData1);

  // Update storage with rev to create rev2
  const uploadResult2 = await requestUploadEncryptedStorage(
    application.expressContext.localEndpoint,
    encryptionKey1,
    encryptedData2,
    rev1
  );
  expect(uploadResult2.error).to.eq(undefined);
  expect(uploadResult2.success).to.eq(true);
  expect(uploadResult2.value).to.not.be.undefined;
  expect(uploadResult2.value?.revision).to.not.be.undefined;
  const rev2 = uploadResult2.value?.revision;
  expect(rev2).to.not.eq(rev1);

  await fetchAndCheckStorage(application, encryptionKey1, rev2, plaintextData2);

  // Attempt key change on previous rev.
  const conflictResult = await requestChangeBlobKey(
    application.expressContext.localEndpoint,
    encryptionKey1,
    encryptionKey2,
    user.uuid,
    newSalt,
    rekeyedEncryptedData,
    rev1
  );
  expect(conflictResult.success).to.eq(false);
  expect(conflictResult.value).to.be.undefined;
  expect(conflictResult.error?.name).to.eq("Conflict");

  // Attempt key change on nonexistant user.
  const noUserResult = await requestChangeBlobKey(
    application.expressContext.localEndpoint,
    encryptionKey1,
    encryptionKey2,
    uuid(),
    newSalt,
    rekeyedEncryptedData,
    rev2
  );
  expect(noUserResult.success).to.eq(false);
  expect(noUserResult.value).to.be.undefined;
  expect(noUserResult.error?.name).to.eq("UserNotFound");

  // Attempt key change with unchanged salt
  const noSaltResult = await requestChangeBlobKey(
    application.expressContext.localEndpoint,
    encryptionKey1,
    encryptionKey2,
    user.uuid,
    user.salt,
    rekeyedEncryptedData,
    rev2
  );
  expect(noSaltResult.success).to.eq(false);
  expect(noSaltResult.value).to.be.undefined;
  expect(noSaltResult.error?.name).to.eq("RequiresNewSalt");

  // Successful key change.
  const rekeyResult1 = await requestChangeBlobKey(
    application.expressContext.localEndpoint,
    encryptionKey1,
    encryptionKey2,
    user.uuid,
    newSalt,
    rekeyedEncryptedData,
    rev2
  );
  expect(rekeyResult1.success).to.eq(true);
  expect(rekeyResult1.error).to.be.undefined;
  expect(rekeyResult1.value?.revision).to.not.be.undefined;
  expect(rekeyResult1.value?.revision).to.not.eq(rev1);
  const rev3 = rekeyResult1.value?.revision;

  await fetchAndCheckStorage(application, encryptionKey2, rev3, plaintextData2);

  // Storage shouldn't exist anymore under old key.
  const oldKeyLoadResult = await requestEncryptedStorage(
    application.expressContext.localEndpoint,
    encryptionKey1
  );
  expect(oldKeyLoadResult.success).to.eq(false);
  expect(oldKeyLoadResult.error?.name).to.eq("NotFound");
}
