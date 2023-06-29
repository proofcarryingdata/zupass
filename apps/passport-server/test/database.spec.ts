import { expect } from "chai";
import "mocha";
import { Pool } from "pg";
import { getDB } from "../src/database/postgresPool";
import { overrideEnvironment, pcdpassTestingEnv } from "./util/env";

describe.only("pcd-pass functionality", function () {
  this.timeout(15_000);

  let db: Pool;

  this.beforeAll(async () => {
    await overrideEnvironment(pcdpassTestingEnv);
    db = await getDB();
  });

  this.afterAll(async () => {
    await db.end();
  });

  step("database should initialize", async function () {
    expect(db).to.not.eq(null);
  });
});
