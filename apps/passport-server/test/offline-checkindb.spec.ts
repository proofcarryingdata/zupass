import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import "mocha";
import { step } from "mocha-steps";
import { Pool } from "postgres-pool";
import { getDB } from "../src/database/postgresPool";
import { upsertUser } from "../src/database/queries/saveUser";
import { overrideEnvironment, testingEnv } from "./util/env";
import { randomEmail } from "./util/util";

interface TestUser {
  email: string;
  identity: Identity;
  uuid?: string;
}

function makeTestUser(): TestUser {
  return {
    email: randomEmail(),
    identity: new Identity()
  };
}

describe.only("offline checkin database queries should work", function () {
  let db: Pool;

  const user1 = makeTestUser();
  const user2 = makeTestUser();
  const user3 = makeTestUser();

  this.beforeAll(async () => {
    await overrideEnvironment(testingEnv);
    db = await getDB();
  });

  step("database should initialize", async function () {
    expect(db).to.not.eq(null);
  });

  step("inserting some test users", async function () {
    const uuid = await upsertUser(db, {
      email: user1.email,
      commitment: user1.identity.commitment.toString(),
      encryptionKey: undefined,
      salt: undefined
    });
    user1.uuid = uuid;

    const uuid2 = await upsertUser(db, {
      email: user2.email,
      commitment: user2.identity.commitment.toString(),
      encryptionKey: undefined,
      salt: undefined
    });
    user2.uuid = uuid2;

    const uuid3 = await upsertUser(db, {
      email: user3.email,
      commitment: user3.identity.commitment.toString(),
      encryptionKey: undefined,
      salt: undefined
    });
    user3.uuid = uuid3;
  });
});
