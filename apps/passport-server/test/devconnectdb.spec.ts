import { expect } from "chai";
import "mocha";
import { step } from "mocha-steps";
import { Pool } from "pg";
import { getDB } from "../src/database/postgresPool";
import { fetchPretixConfiguration } from "../src/database/queries/pretix_config/fetchPretixConfiguration";
import {
  getAllOrganizers,
  insertPretixEventConfig,
  insertPretixOrganizerConfig
} from "../src/database/queries/pretix_config/insertConfiguration";
import { overrideEnvironment, pcdpassTestingEnv } from "./util/env";
import { v4 as uuid } from "uuid";

describe.only("database reads and writes", function () {
  this.timeout(15_000);

  let db: Pool;

  const testOrganizerUrl = "https://www.example.com/test";
  const testToken = uuid();

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

  step("should be able to insert a new organizer", async function () {
    const id = await insertPretixOrganizerConfig(
      db,
      testOrganizerUrl,
      testToken
    );
    expect(id).to.eq(1);
    const allOrganizers = await getAllOrganizers(db);
    expect(allOrganizers.length).to.eq(1);
  });

  step(
    "should be able to insert a new event for that organizer",
    async function () {
      await insertPretixEventConfig(db, "1", ["1", "2", "3"], "new_event_id");
    }
  );

  step("should be able to get pretix configuration", async function () {
    const config = await fetchPretixConfiguration(db);
  });
});
