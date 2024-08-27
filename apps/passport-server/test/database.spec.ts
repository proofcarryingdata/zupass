import {
  EdDSAPublicKey,
  getEdDSAPublicKey,
  isEqualEdDSAPublicKey,
  newEdDSAPrivateKey
} from "@pcd/eddsa-pcd";
import {
  KnownPublicKeyType,
  KnownTicketGroup,
  LATEST_PRIVACY_NOTICE,
  ZuzaluUserRole
} from "@pcd/passport-interface";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import { randomUUID } from "crypto";
import "mocha";
import { step } from "mocha-steps";
import { Pool } from "postgres-pool";
import {
  KnownTicketTypeWithKey,
  PoapEvent,
  ZuzaluPretixTicket
} from "../src/database/models";
import { getDB } from "../src/database/postgresPool";
import {
  CacheEntry,
  deleteExpiredCacheEntries,
  getCacheSize,
  getCacheValue,
  setCacheValue
} from "../src/database/queries/cache";
import {
  fetchEncryptedStorage,
  rekeyEncryptedStorage,
  setEncryptedStorage,
  updateEncryptedStorage
} from "../src/database/queries/e2ee";
import {
  fetchEmailToken,
  insertEmailToken
} from "../src/database/queries/emailToken";
import {
  deleteKnownTicketType,
  fetchKnownTicketByEventAndProductId,
  fetchKnownTicketTypesByGroup,
  setKnownPublicKey,
  setKnownTicketType
} from "../src/database/queries/knownTicketTypes";
import {
  claimNewPoapUrl,
  getExistingClaimUrlByTicketId,
  insertNewPoapUrl
} from "../src/database/queries/poap";
import { upsertUser } from "../src/database/queries/saveUser";
import {
  deleteUserByEmail,
  fetchUserByEmail,
  fetchUserByV3Commitment
} from "../src/database/queries/users";
import { deleteZuzaluTicket } from "../src/database/queries/zuzalu_pretix_tickets/deleteZuzaluUser";
import {
  fetchAllUsersWithZuzaluTickets,
  fetchAllZuzaluPretixTickets
} from "../src/database/queries/zuzalu_pretix_tickets/fetchZuzaluUser";
import { insertZuzaluPretixTicket } from "../src/database/queries/zuzalu_pretix_tickets/insertZuzaluPretixTicket";
import { updateZuzaluPretixTicket } from "../src/database/queries/zuzalu_pretix_tickets/updateZuzaluPretixTicket";
import { sqlQuery } from "../src/database/sqlQuery";
import { randomEmailToken } from "../src/util/util";
import { overrideEnvironment, testingEnv } from "./util/env";
import { expectToExist, randomEmail } from "./util/util";

describe("database reads and writes", function () {
  let db: Pool;
  let testTicket: ZuzaluPretixTicket;
  let otherRole: ZuzaluUserRole;

  this.beforeAll(async () => {
    await overrideEnvironment(testingEnv);
    db = await getDB();
  });

  this.afterAll(async () => {
    await db.end();
  });

  step("database should initialize", async function () {
    expect(db).to.not.eq(null);
  });

  step("email tokens should work as expected", async function () {
    const testEmail = randomEmail();
    const testToken = randomEmailToken();
    await insertEmailToken(db, { email: testEmail, token: testToken });
    const insertedToken = await fetchEmailToken(db, testEmail);
    expect(insertedToken).to.eq(testToken);

    const newToken = randomEmailToken();
    await insertEmailToken(db, { email: testEmail, token: newToken });
    const newInsertedToken = await fetchEmailToken(db, testEmail);
    expect(newToken).to.eq(newInsertedToken);
  });

  step("inserting and reading a zuzalu ticket should work", async function () {
    testTicket = {
      email: randomEmail(),
      name: "bob shmob",
      order_id: "ASD12",
      role: ZuzaluUserRole.Organizer,
      visitor_date_ranges: null
    };
    otherRole = ZuzaluUserRole.Visitor;

    await insertZuzaluPretixTicket(db, testTicket);

    const allZuzaluUsers = await fetchAllZuzaluPretixTickets(db);
    const insertedUser = allZuzaluUsers.find(
      (u) => u.email === testTicket.email
    );
    if (!insertedUser) {
      throw new Error("user didn't insert properly");
    }

    expect(insertedUser.email).to.eq(testTicket.email);
    expect(insertedUser.name).to.eq(testTicket.name);
    expect(insertedUser.order_id).to.eq(testTicket.order_id);
    expect(insertedUser.role).to.eq(testTicket.role);
    expect(insertedUser.visitor_date_ranges).to.deep.eq(
      testTicket.visitor_date_ranges
    );
  });

  step(
    "adding a commitment corresponding to a zuzalu ticket " +
      "should signify that that zuzalu user is logged in",
    async function () {
      const newIdentity = new Identity();
      const newCommitment = newIdentity.commitment.toString();
      const newUuid = await upsertUser(db, {
        uuid: randomUUID(),
        emails: [testTicket.email],
        commitment: newCommitment,
        terms_agreed: LATEST_PRIVACY_NOTICE,
        extra_issuance: false
      });

      let allZuzaluUsers = await fetchAllUsersWithZuzaluTickets(db);
      const loggedinUser = allZuzaluUsers.find((u) => u.uuid === newUuid);
      if (!loggedinUser) {
        throw new Error("user didn't insert properly");
      }
      const ticket = loggedinUser.zuzaluTickets[0];
      expect(loggedinUser.zuzaluTickets.length).to.eq(1);
      expectToExist(ticket);

      expect(loggedinUser).to.not.eq(null);
      expect(ticket.email).to.eq(testTicket.email);
      expect(ticket.name).to.eq(testTicket.name);
      expect(ticket.order_id).to.eq(testTicket.order_id);
      expect(ticket.role).to.eq(testTicket.role);
      expect(ticket.visitor_date_ranges).to.deep.eq(
        testTicket.visitor_date_ranges
      );
      expect(loggedinUser.uuid).to.eq(newUuid);
      expect(loggedinUser.commitment).to.eq(newCommitment);

      allZuzaluUsers = await fetchAllUsersWithZuzaluTickets(db);
      expect(allZuzaluUsers).to.deep.eq([loggedinUser]);
    }
  );

  step("updating a zuzalu ticket should work", async function () {
    const update: ZuzaluPretixTicket = {
      order_id: testTicket.order_id,
      name: testTicket.name,
      email: testTicket.email,
      role: otherRole,
      visitor_date_ranges: [
        { date_from: new Date().toString(), date_to: new Date().toString() }
      ]
    };

    await updateZuzaluPretixTicket(db, update);

    const allZuzaluUsers = await fetchAllUsersWithZuzaluTickets(db);
    const updatedUser = allZuzaluUsers.find((u) =>
      u.emails.includes(update.email)
    );
    if (!updatedUser) {
      throw new Error("not able to get user for email");
    }
    const updatedTicket = updatedUser.zuzaluTickets[0];
    expect(updatedUser.zuzaluTickets.length).to.eq(1);
    expectToExist(updatedTicket);
    expect(updatedTicket.email).to.eq(testTicket.email);
    expect(updatedTicket.role).to.eq(update.role);
    expect(updatedTicket.visitor_date_ranges).to.deep.eq(
      update.visitor_date_ranges
    );
    expect(update.role).to.not.eq(testTicket.role);
  });

  step("deleting a logged in zuzalu ticket should work", async function () {
    let allZuzaluUsers = await fetchAllUsersWithZuzaluTickets(db);
    let user = allZuzaluUsers.find((u) => u.emails.includes(testTicket.email));
    if (!user) {
      throw new Error("expected there to be a logged in user");
    }
    await deleteZuzaluTicket(db, testTicket.email);

    allZuzaluUsers = await fetchAllUsersWithZuzaluTickets(db);
    user = allZuzaluUsers.find((u) => u.emails.includes(testTicket.email));

    expect(user).to.eq(undefined);
  });

  step("deleting a non logged in user should work", async function () {
    await insertZuzaluPretixTicket(db, testTicket);
    let allZuzaluTickets = await fetchAllZuzaluPretixTickets(db);
    expect(
      allZuzaluTickets.find((t) => t.email === testTicket.email)
    ).to.not.eq(undefined);
    await deleteZuzaluTicket(db, testTicket.email);
    allZuzaluTickets = await fetchAllZuzaluPretixTickets(db);
    expect(allZuzaluTickets.find((t) => t.email === testTicket.email)).to.eq(
      undefined
    );
  });

  step("e2ee should work", async function () {
    const key = "key";
    const initialStorage = await fetchEncryptedStorage(db, key);
    expect(initialStorage).to.be.undefined;

    const value = "value";
    await setEncryptedStorage(db, key, value);
    const insertedStorage = await fetchEncryptedStorage(db, key);
    if (!insertedStorage) {
      throw new Error("expected to be able to fetch a e2ee blob");
    }
    expect(insertedStorage.blob_key).to.eq(key);
    expect(insertedStorage.encrypted_blob).to.eq(value);
    expect(insertedStorage.revision).to.eq("1");

    const updatedValue = "value2";
    expect(value).to.not.eq(updatedValue);
    await setEncryptedStorage(db, key, updatedValue);
    const updatedStorage = await fetchEncryptedStorage(db, key);
    if (!updatedStorage) {
      throw new Error("expected to be able to fetch updated e2ee blog");
    }
    expect(updatedStorage.blob_key).to.eq(key);
    expect(updatedStorage.encrypted_blob).to.eq(updatedValue);
    expect(updatedStorage.revision).to.eq("2");

    // Storing an empty string is valid, and not treated as deletion.
    const emptyValue = "";
    expect(updatedValue).to.not.eq(emptyValue);
    await setEncryptedStorage(db, key, emptyValue);
    const emptyStorage = await fetchEncryptedStorage(db, key);
    if (!emptyStorage) {
      throw new Error("expected to be able to fetch updated e2ee blog");
    }
    expect(emptyStorage.blob_key).to.eq(key);
    expect(emptyStorage.encrypted_blob).to.eq(emptyValue);
    expect(emptyStorage.revision).to.eq("3");
  });

  step("e2ee update conflict detection should work", async function () {
    const key = "ckey1";
    const initialStorage = await fetchEncryptedStorage(db, key);
    expect(initialStorage).to.be.undefined;

    // Can't use "update" to set initial state.
    const value1 = "value1";
    const missingResult = await updateEncryptedStorage(db, key, value1, "0");
    expect(missingResult.status).to.eq("missing");
    expect(missingResult.revision).to.be.undefined;

    // Use "set" to create rev1.
    const rev1 = await setEncryptedStorage(db, key, value1);
    expect(rev1).to.eq("1");
    const insertedStorage = await fetchEncryptedStorage(db, key);
    if (!insertedStorage) {
      throw new Error("expected to be able to fetch a e2ee blob");
    }
    expect(insertedStorage.blob_key).to.eq(key);
    expect(insertedStorage.encrypted_blob).to.eq(value1);
    expect(insertedStorage.revision).to.eq("1");

    // Can update to rev2.
    const value2 = "value2";
    const updateResult2 = await updateEncryptedStorage(db, key, value2, rev1);
    expect(updateResult2.status).to.eq("updated");
    expect(updateResult2.revision).to.eq("2");
    const storage2 = await fetchEncryptedStorage(db, key);
    if (!storage2) {
      throw new Error("expected to be able to fetch a e2ee blob");
    }
    expect(storage2.blob_key).to.eq(key);
    expect(storage2.encrypted_blob).to.eq(value2);
    expect(storage2.revision).to.eq("2");
    const rev2 = storage2.revision;

    // Updating based on rev1 is a conflict, leaving storage unchanged.
    const value3 = "value3";
    const conflictResult = await updateEncryptedStorage(db, key, value3, rev1);
    expect(conflictResult.status).to.eq("conflict");
    expect(conflictResult.revision).to.eq("2");
    const conflictStorage = await fetchEncryptedStorage(db, key);
    if (!conflictStorage) {
      throw new Error("expected to be able to fetch a e2ee blob");
    }
    expect(conflictStorage.blob_key).to.eq(key);
    expect(conflictStorage.encrypted_blob).to.eq(value2);
    expect(conflictStorage.revision).to.eq("2");

    // Updating based on rev2 can succeed regardless of the previous conflict.
    const updateResult3 = await updateEncryptedStorage(db, key, value2, rev2);
    expect(updateResult3.status).to.eq("updated");
    expect(updateResult3.revision).to.eq("3");
    const storage3 = await fetchEncryptedStorage(db, key);
    if (!storage3) {
      throw new Error("expected to be able to fetch a e2ee blob");
    }
    expect(storage3.blob_key).to.eq(key);
    expect(storage3.encrypted_blob).to.eq(value2);
    expect(storage3.revision).to.eq("3");
  });

  step("e2ee rekeying should work", async function () {
    const key1 = "key1";
    const value1 = "value1";
    const salt1 = "1234";

    const email = "e2ee-rekey-user@test.com";
    const commitment = new Identity().commitment.toString();
    const uuid = await upsertUser(db, {
      uuid: randomUUID(),
      commitment,
      emails: [email],
      salt: salt1,
      terms_agreed: LATEST_PRIVACY_NOTICE,
      extra_issuance: false
    });
    if (!uuid) {
      throw new Error("expected to be able to insert a commitment");
    }

    await setEncryptedStorage(db, key1, value1);
    const storage1 = await fetchEncryptedStorage(db, key1);
    if (!storage1) {
      throw new Error("expected to be able to fetch 1st e2ee blob");
    }
    expect(storage1.blob_key).to.eq(key1);
    expect(storage1.encrypted_blob).to.eq(value1);
    expect(storage1.revision).to.eq("1");

    const key2 = "key2";
    const value2 = "value2";
    const salt2 = "5678";

    const rekeyResult = await rekeyEncryptedStorage(
      db,
      key1,
      key2,
      uuid,
      salt2,
      value2
    );
    expect(rekeyResult.status).to.eq("updated");
    expect(rekeyResult.revision).to.eq("2");
    const storage2 = await fetchEncryptedStorage(db, key2);
    if (!storage2) {
      throw new Error("expected to be able to fetch 2nd e2ee blob");
    }
    expect(storage2.blob_key).to.eq(key2);
    expect(storage2.encrypted_blob).to.eq(value2);
    expect(storage2.revision).to.eq("2");
    const storageMissing = await fetchEncryptedStorage(db, key1);
    if (storageMissing) {
      throw new Error("expected 1st e2ee blob to be gone");
    }

    // We can't rekey again because key doesn't match.
    const rekeyResult2 = await rekeyEncryptedStorage(
      db,
      key1,
      key2,
      uuid,
      salt2,
      value2
    );
    expect(rekeyResult2.status).to.eq("missing");
    expect(rekeyResult2.revision).to.be.undefined;
  });

  step("e2ee rekeying should work with knownRevision", async function () {
    const key1 = "rkey1";
    const value1 = "value1";
    const value2 = "value2";
    const salt1 = "1234";

    const email = "e2ee-rekey-user@test.com";
    const existingUser = await fetchUserByEmail(db, email);
    expectToExist(existingUser);
    const commitment = new Identity().commitment.toString();
    const uuid = await upsertUser(db, {
      commitment,
      uuid: existingUser.uuid,
      emails: existingUser.emails,
      salt: salt1,
      terms_agreed: LATEST_PRIVACY_NOTICE,
      extra_issuance: false
    });
    if (!uuid) {
      throw new Error("expected to be able to insert a commitment");
    }

    // Set storage rev1
    const rev1 = await setEncryptedStorage(db, key1, value1);
    expect(rev1).to.eq("1");
    const storage1 = await fetchEncryptedStorage(db, key1);
    if (!storage1) {
      throw new Error("expected to be able to fetch 1st e2ee blob");
    }
    expect(storage1.blob_key).to.eq(key1);
    expect(storage1.encrypted_blob).to.eq(value1);
    expect(storage1.revision).to.eq("1");

    // Set storage rev2
    const rev2 = await setEncryptedStorage(db, key1, value2);
    expect(rev2).to.eq("2");
    const storage2 = await fetchEncryptedStorage(db, key1);
    if (!storage2) {
      throw new Error("expected to be able to fetch 1st e2ee blob");
    }
    expect(storage2.blob_key).to.eq(key1);
    expect(storage2.encrypted_blob).to.eq(value2);
    expect(storage2.revision).to.eq("2");

    const key2 = "rkey2";
    const value3 = "value3";
    const salt2 = "5678";

    // Attempt to rekey based on rev1, causing conflict without changing rev
    const rekeyResult1 = await rekeyEncryptedStorage(
      db,
      key1,
      key2,
      uuid,
      salt2,
      value3,
      rev1
    );
    expect(rekeyResult1.status).to.eq("conflict");
    expect(rekeyResult1.revision).to.eq("2");

    // Rekey successfully based on rev2
    const rekeyResult2 = await rekeyEncryptedStorage(
      db,
      key1,
      key2,
      uuid,
      salt2,
      value3,
      rev2
    );
    expect(rekeyResult2.status).to.eq("updated");
    expect(rekeyResult2.revision).to.eq("3");
    const rev3 = rekeyResult2.revision;
    const storageRekeyed = await fetchEncryptedStorage(db, key2);
    if (!storageRekeyed) {
      throw new Error("expected to be able to fetch 2nd e2ee blob");
    }
    expect(storageRekeyed.blob_key).to.eq(key2);
    expect(storageRekeyed.encrypted_blob).to.eq(value3);
    expect(storageRekeyed.revision).to.eq("3");
    const storageMissing = await fetchEncryptedStorage(db, key1);
    if (storageMissing) {
      throw new Error("expected 1st e2ee blob to be gone");
    }

    // We can't rekey again because key doesn't match.
    const rekeyResult3 = await rekeyEncryptedStorage(
      db,
      key1,
      key2,
      uuid,
      salt2,
      value2,
      rev3
    );
    expect(rekeyResult3.status).to.eq("missing");
    expect(rekeyResult3.revision).to.be.undefined;
  });

  step("zupass user representation should work", async function () {
    const email = "zupassuser@test.com";
    const commitment = new Identity().commitment.toString();
    const uuid = await upsertUser(db, {
      commitment,
      uuid: randomUUID(),
      emails: [email],
      terms_agreed: LATEST_PRIVACY_NOTICE,
      extra_issuance: false
    });
    if (!uuid) {
      throw new Error("expected to be able to insert a commitment");
    }
    const insertedCommitment = await fetchUserByEmail(db, email);
    if (!insertedCommitment) {
      throw new Error("expected to be able to fetch an inserted commitment");
    }
    expect(insertedCommitment.commitment).to.eq(commitment);
    expect(insertedCommitment.emails).to.deep.eq([email]);
    expect(insertedCommitment.uuid).to.eq(uuid);

    expect(await fetchUserByV3Commitment(db, commitment)).to.deep.eq(
      insertedCommitment
    );

    await deleteUserByEmail(db, email);
    const deletedCommitment = await fetchUserByEmail(db, email);
    expect(deletedCommitment).to.eq(null);
  });

  step("should be able to interact with the cache", async function () {
    // insert a bunch of old entries
    const oldEntries: CacheEntry[] = [];
    for (let i = 0; i < 20; i++) {
      oldEntries.push(await setCacheValue(db, "i_" + i, i + ""));
    }
    await sqlQuery(
      db,
      `
    update cache
      set time_created = NOW() - interval '5 days',
      time_updated = NOW() - interval '5 days'
    `
    );

    // old entries inserted, let's insert some 'new' ones
    await setCacheValue(db, "key", "value");
    const firstEntry = await getCacheValue(db, "key");
    expect(firstEntry?.cache_value).to.eq("value");
    await setCacheValue(db, "key", "value2");
    const editedFirstEntry = await getCacheValue(db, "key");
    expect(editedFirstEntry?.cache_value).to.eq("value2");
    expect(editedFirstEntry?.time_created?.getTime()).to.eq(
      firstEntry?.time_created?.getTime()
    );

    await setCacheValue(db, "spongebob", "squarepants");
    const spongebob = await getCacheValue(db, "spongebob");
    expect(spongebob?.cache_value).to.eq("squarepants");

    // age nothing out
    const beforeFirstAgeOut = await getCacheSize(db);
    expect(beforeFirstAgeOut).to.eq(22);
    const firstDeleteCount = await deleteExpiredCacheEntries(db, 10, 22);
    expect(firstDeleteCount).to.eq(0);
    const afterFirstAgeOut = await getCacheSize(db);
    expect(afterFirstAgeOut).to.eq(beforeFirstAgeOut);

    // age entries older than 10 days or entries that are not one of the 20
    // most recently added entries
    const beforeSecondAgeOut = await getCacheSize(db);
    const secondDeleteCount = await deleteExpiredCacheEntries(db, 10, 20);
    expect(secondDeleteCount).to.eq(2);
    const afterSecondAgeOut = await getCacheSize(db);
    expect(afterSecondAgeOut).to.eq(beforeSecondAgeOut - 2);

    // age entries older than 3 days or entries that are not one of the 20
    // most recently added entries
    const beforeThirdAgeOut = await getCacheSize(db);
    const thirdDeleteCount = await deleteExpiredCacheEntries(db, 3, 20);
    expect(thirdDeleteCount).to.eq(18);
    const afterThirdAgeOut = await getCacheSize(db);
    expect(afterThirdAgeOut).to.eq(beforeThirdAgeOut - 18);
  });

  const testPublicKeyName = "Zupass Test";
  const eddsaPubKeyPromise = getEdDSAPublicKey(
    testingEnv.SERVER_EDDSA_PRIVATE_KEY as string
  );

  step("should be able to insert known public keys", async function () {
    const eddsaPubKey = await eddsaPubKeyPromise;

    await setKnownPublicKey(
      db,
      testPublicKeyName,
      KnownPublicKeyType.EdDSA,
      JSON.stringify(eddsaPubKey)
    );

    const inserted = (
      await sqlQuery(
        db,
        `select * from known_public_keys where public_key_name = $1`,
        [testPublicKeyName]
      )
    ).rows[0];
    expect(inserted.public_key_name).to.eq(testPublicKeyName);
    expect(inserted.public_key_type).to.eq(KnownPublicKeyType.EdDSA);
    expect(JSON.parse(inserted.public_key)).to.deep.eq(eddsaPubKey);
    expect(isEqualEdDSAPublicKey(JSON.parse(inserted.public_key), eddsaPubKey))
      .to.be.true;
  });

  step("should be able to replace known public keys", async function () {
    const eddsaPubKey = await eddsaPubKeyPromise;
    const dummyEddsaPubKey = await getEdDSAPublicKey(newEdDSAPrivateKey());

    // Replace the public key with a different one, but use the same name
    // and type
    await setKnownPublicKey(
      db,
      testPublicKeyName,
      KnownPublicKeyType.EdDSA,
      JSON.stringify(dummyEddsaPubKey)
    );

    let result = await sqlQuery(
      db,
      `select * from known_public_keys where public_key_name = $1`,
      [testPublicKeyName]
    );
    let publicKeyInDB = result.rows[0];

    // There should still only be one key with the used name
    expect(result.rowCount).to.eq(1);
    expect(publicKeyInDB.public_key_name).to.eq(testPublicKeyName);
    expect(publicKeyInDB.public_key_type).to.eq(KnownPublicKeyType.EdDSA);
    expect(JSON.parse(publicKeyInDB.public_key)).to.deep.eq(dummyEddsaPubKey);
    expect(
      isEqualEdDSAPublicKey(
        JSON.parse(publicKeyInDB.public_key),
        dummyEddsaPubKey
      )
    ).to.be.true;

    // Restore the original public key
    await setKnownPublicKey(
      db,
      testPublicKeyName,
      KnownPublicKeyType.EdDSA,
      JSON.stringify(eddsaPubKey)
    );

    result = await sqlQuery(
      db,
      `select * from known_public_keys where public_key_name = $1`,
      [testPublicKeyName]
    );
    publicKeyInDB = result.rows[0];

    // There should still only be one key with the used name
    expect(result.rowCount).to.eq(1);
    expect(publicKeyInDB.public_key_name).to.eq(testPublicKeyName);
    expect(publicKeyInDB.public_key_type).to.eq(KnownPublicKeyType.EdDSA);
    expect(JSON.parse(publicKeyInDB.public_key)).to.deep.eq(eddsaPubKey);
    expect(
      isEqualEdDSAPublicKey(JSON.parse(publicKeyInDB.public_key), eddsaPubKey)
    ).to.be.true;
  });

  const knownEventId = randomUUID();
  const knownProductId = randomUUID();
  const ticketTypeIdentifier = "ZUCONNECT_TEST";

  step("should be able to insert known ticket type", async function () {
    const eddsaPubKey = await eddsaPubKeyPromise;

    await setKnownTicketType(
      db,
      ticketTypeIdentifier,
      knownEventId,
      knownProductId,
      testPublicKeyName,
      KnownPublicKeyType.EdDSA,
      KnownTicketGroup.Zuconnect23,
      "ZuConnect '23"
    );

    const knownTicketType = (await fetchKnownTicketByEventAndProductId(
      db,
      knownEventId,
      knownProductId
    )) as KnownTicketTypeWithKey;

    expect(knownTicketType.event_id).to.eq(knownEventId);
    expect(knownTicketType.product_id).to.eq(knownProductId);
    expect(knownTicketType.known_public_key_name).to.eq(testPublicKeyName);
    expect(knownTicketType.known_public_key_type).to.eq(
      KnownPublicKeyType.EdDSA
    );
    expect(JSON.parse(knownTicketType.public_key)).to.deep.eq(eddsaPubKey);
    expect(
      isEqualEdDSAPublicKey(
        JSON.parse(knownTicketType.public_key) as EdDSAPublicKey,
        eddsaPubKey
      )
    );
  });

  step("should be able to replace known ticket type", async function () {
    const eddsaPubKey = await eddsaPubKeyPromise;
    const newProductId = randomUUID(),
      newEventId = randomUUID();

    // Change the ticket type created in the previous test
    await setKnownTicketType(
      db,
      ticketTypeIdentifier,
      newEventId,
      newProductId,
      testPublicKeyName,
      KnownPublicKeyType.EdDSA,
      KnownTicketGroup.Zuconnect23,
      "ZuConnect '23"
    );

    let knownTicketType = await fetchKnownTicketByEventAndProductId(
      db,
      knownEventId,
      knownProductId
    );

    expect(knownTicketType).to.be.null;

    const changedTicketType = (await fetchKnownTicketByEventAndProductId(
      db,
      newEventId,
      newProductId
    )) as KnownTicketTypeWithKey;

    expect(changedTicketType.event_id).to.eq(newEventId);
    expect(changedTicketType.product_id).to.eq(newProductId);
    expect(changedTicketType.known_public_key_name).to.eq(testPublicKeyName);
    expect(changedTicketType.known_public_key_type).to.eq(
      KnownPublicKeyType.EdDSA
    );
    expect(JSON.parse(changedTicketType.public_key)).to.deep.eq(eddsaPubKey);
    expect(
      isEqualEdDSAPublicKey(
        JSON.parse(changedTicketType.public_key) as EdDSAPublicKey,
        eddsaPubKey
      )
    );

    // Restore the ticket type to the original value
    await setKnownTicketType(
      db,
      ticketTypeIdentifier,
      knownEventId,
      knownProductId,
      testPublicKeyName,
      KnownPublicKeyType.EdDSA,
      KnownTicketGroup.Zuconnect23,
      "ZuConnect '23"
    );

    knownTicketType = (await fetchKnownTicketByEventAndProductId(
      db,
      knownEventId,
      knownProductId
    )) as KnownTicketTypeWithKey;

    expect(knownTicketType.event_id).to.eq(knownEventId);
    expect(knownTicketType.product_id).to.eq(knownProductId);
    expect(knownTicketType.known_public_key_name).to.eq(testPublicKeyName);
    expect(knownTicketType.known_public_key_type).to.eq(
      KnownPublicKeyType.EdDSA
    );
    expect(JSON.parse(knownTicketType.public_key)).to.deep.eq(eddsaPubKey);
    expect(
      isEqualEdDSAPublicKey(
        JSON.parse(knownTicketType.public_key) as EdDSAPublicKey,
        eddsaPubKey
      )
    );
  });

  step("should be able to fetch known ticket type by group", async function () {
    const ticketTypes = await fetchKnownTicketTypesByGroup(
      db,
      KnownTicketGroup.Zuconnect23
    );

    expect(ticketTypes.length).to.eq(1);
    expect(ticketTypes[0].ticket_group).to.eq(KnownTicketGroup.Zuconnect23);
  });

  step("should be able to delete known ticket types", async function () {
    await deleteKnownTicketType(db, ticketTypeIdentifier);

    const ticketTypes = await fetchKnownTicketTypesByGroup(
      db,
      KnownTicketGroup.Zuconnect23
    );

    expect(ticketTypes.length).to.eq(0);
  });

  step("should be able to claim poap links", async function () {
    const TEST_POAP_A1 = "https://poap.xyz/mint/qwerty";
    const TEST_POAP_A2 = "https://poap.xyz/mint/zxcvbn";
    const TEST_POAP_B1 = "https://poap.xyz/mint/asdfgh";

    // Before urls are claimed, getExistingClaimUrlByTicketId returns null
    expect(await getExistingClaimUrlByTicketId(db, "hash-1")).to.be.null;
    expect(await getExistingClaimUrlByTicketId(db, "hash-2")).to.be.null;
    expect(await getExistingClaimUrlByTicketId(db, "hash-3")).to.be.null;

    // Setup
    await insertNewPoapUrl(db, TEST_POAP_A1, "event-a" as PoapEvent);
    await insertNewPoapUrl(db, TEST_POAP_A2, "event-a" as PoapEvent);
    await insertNewPoapUrl(db, TEST_POAP_B1, "event-b" as PoapEvent);

    // Check event-a
    const url1 = await claimNewPoapUrl(db, "event-a" as PoapEvent, "hash-1");
    const url2 = await claimNewPoapUrl(db, "event-a" as PoapEvent, "hash-2");
    // Ignore order of claiming so long as both are claimed
    expect(
      (url1 === TEST_POAP_A1 && url2 === TEST_POAP_A2) ||
        (url1 === TEST_POAP_A2 && url2 === TEST_POAP_A1)
    ).to.be.true;
    expect(await claimNewPoapUrl(db, "event-a" as PoapEvent, "hash-9")).to.be
      .null;

    // Check event-b
    const url3 = await claimNewPoapUrl(db, "event-b" as PoapEvent, "hash-3");
    expect(url3).to.eq(TEST_POAP_B1);
    expect(await claimNewPoapUrl(db, "event-a" as PoapEvent, "hash-8")).to.be
      .null;

    // After urls are claimed, getExistingClaimUrlByTicketId returns correct url
    expect(await getExistingClaimUrlByTicketId(db, "hash-1")).to.eq(url1);
    expect(await getExistingClaimUrlByTicketId(db, "hash-2")).to.eq(url2);
    expect(await getExistingClaimUrlByTicketId(db, "hash-3")).to.eq(url3);
  });
});
