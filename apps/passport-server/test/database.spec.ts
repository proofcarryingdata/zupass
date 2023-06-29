import { expect } from "chai";
import "mocha";
import { step } from "mocha-steps";
import { Pool } from "pg";
import { ZuzaluPretixTicket, ZuzaluUserRole } from "../src/database/models";
import { getDB } from "../src/database/postgresPool";
import {
  fetchEmailToken,
  insertEmailToken,
} from "../src/database/queries/emailToken";
import { fetchZuzaluUser } from "../src/database/queries/zuzalu_pretix_tickets/fetchZuzaluUser";
import { insertZuzaluPretixTicket } from "../src/database/queries/zuzalu_pretix_tickets/insertZuzaluPretixTicket";
import { randomEmailToken } from "../src/util/util";
import { overrideEnvironment, pcdpassTestingEnv } from "./util/env";
import { randomEmail } from "./util/util";

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

  step("zuzalu user stuff should work properly", async function () {
    const testTicket: ZuzaluPretixTicket = {
      email: randomEmail(),
      name: "bob shmob",
      order_id: "ASD12",
      role: ZuzaluUserRole.Organizer,
      visitor_date_ranges: undefined,
    };

    await insertZuzaluPretixTicket(db, testTicket);

    const insertedUser = await fetchZuzaluUser(db, testTicket.email);

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
});
