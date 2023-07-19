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
import { first } from "lodash";

describe.only("database reads and writes", function () {
  this.timeout(15_000);

  let db: Pool;

  const testOrganizerUrl = "https://www.example.com/test";
  const testToken = uuid();
  const testEventId = "test-id";

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
      await insertPretixEventConfig(db, "1", ["1", "2", "3"], testEventId);
    }
  );

  step("should be able to get pretix configuration", async function () {
    const configs = await fetchPretixConfiguration(db);
    const firstConfig = configs[0];

    expect(configs.length).to.eq(1);
    expect(firstConfig.token).to.eq(testToken);
    expect(firstConfig.id).to.eq(1);
    expect(firstConfig.organizer_url).to.eq(testOrganizerUrl);
    expect(firstConfig.events).to.deep.eq([
      {
        id: 1,
        pretix_organizers_config_id: 1,
        active_item_ids: ["1", "2", "3"],
        event_id: testEventId
      }
    ]);
  });
});
