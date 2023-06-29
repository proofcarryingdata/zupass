import { Identity } from "@semaphore-protocol/identity";
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
import { insertCommitment } from "../src/database/queries/saveCommitment";
import {
  fetchAllLoggedInZuzaluUsers,
  fetchLoggedInZuzaluUser,
  fetchZuzaluUser,
} from "../src/database/queries/zuzalu_pretix_tickets/fetchZuzaluUser";
import { insertZuzaluPretixTicket } from "../src/database/queries/zuzalu_pretix_tickets/insertZuzaluPretixTicket";
import { updateZuzaluPretixTicket } from "../src/database/queries/zuzalu_pretix_tickets/updateZuzaluPretixTicket";
import { randomEmailToken } from "../src/util/util";
import { overrideEnvironment, pcdpassTestingEnv } from "./util/env";
import { randomEmail } from "./util/util";

describe.only("database reads and writes", function () {
  this.timeout(15_000);

  let db: Pool;
  let testTicket: ZuzaluPretixTicket;
  let otherRole: ZuzaluUserRole;

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

  step("inserting and reading a zuzalu ticket should work", async function () {
    testTicket = {
      email: randomEmail(),
      name: "bob shmob",
      order_id: "ASD12",
      role: ZuzaluUserRole.Organizer,
      visitor_date_ranges: null,
    };
    otherRole = ZuzaluUserRole.Visitor;

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
    expect(insertedUser.uuid).to.be.null;
    expect(insertedUser.commitment).to.be.null;
  });

  step(
    "adding a commitment corresponding to a zuzalu ticket " +
      "should signify that that zuzalu user is logged in",
    async function () {
      const newIdentity = new Identity();
      const newCommitment = newIdentity.commitment.toString();
      const newUuid = await insertCommitment(db, {
        email: testTicket.email,
        commitment: newCommitment,
      });

      const loggedinUser = await fetchLoggedInZuzaluUser(db, { uuid: newUuid });
      if (!loggedinUser) {
        throw new Error("user didn't insert properly");
      }

      expect(loggedinUser).to.not.eq(null);
      expect(loggedinUser.email).to.eq(testTicket.email);
      expect(loggedinUser.name).to.eq(testTicket.name);
      expect(loggedinUser.order_id).to.eq(testTicket.order_id);
      expect(loggedinUser.role).to.eq(testTicket.role);
      expect(loggedinUser.visitor_date_ranges).to.deep.eq(
        testTicket.visitor_date_ranges
      );
      expect(loggedinUser.uuid).to.eq(newUuid);
      expect(loggedinUser.commitment).to.eq(newCommitment);

      const allZuzaluUsers = await fetchAllLoggedInZuzaluUsers(db);
      expect(allZuzaluUsers).to.deep.eq([loggedinUser]);

      expect(await fetchZuzaluUser(db, testTicket.email)).to.deep.eq(
        await fetchLoggedInZuzaluUser(db, { uuid: loggedinUser.uuid })
      );
    }
  );

  step("updating a zuzalu ticket should work", async function () {
    const update = {
      email: testTicket.email,
      role: otherRole,
      visitor_date_ranges: [
        { date_from: new Date().toString(), date_to: new Date().toString() },
      ],
    };

    await updateZuzaluPretixTicket(db, update);

    const updatedUser = await fetchZuzaluUser(db, testTicket.email);
    if (!updatedUser) {
      throw new Error("not able to get user for email");
    }

    expect(updatedUser.email).to.eq(testTicket.email);
    expect(updatedUser.role).to.eq(update.role);
    expect(updatedUser.visitor_date_ranges).to.deep.eq(
      update.visitor_date_ranges
    );
    expect(update.role).to.not.eq(testTicket.role);
  });
});
