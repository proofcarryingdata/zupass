import { EdDSATicketPCD, EdDSATicketPCDPackage } from "@pcd/eddsa-ticket-pcd";
import {
  User,
  ZupassFeedIds,
  ZuzaluUserRole,
  createFeedCredentialPayload,
  pollFeed,
  requestVerifyTicket
} from "@pcd/passport-interface";
import { PCDActionType, ReplaceInFolderAction } from "@pcd/pcd-collection";
import { sleep } from "@pcd/util";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import { randomUUID } from "crypto";
import "mocha";
import MockDate from "mockdate";
import { SetupServer } from "msw/lib/node";
import { Pool } from "postgres-pool";
import { ZuconnectTripshaAPI } from "../src/apis/zuconnect/zuconnectTripshaAPI";
import { stopApplication } from "../src/application";
import { getDB } from "../src/database/postgresPool";
import { fetchAllZuconnectTickets } from "../src/database/queries/zuconnect/fetchZuconnectTickets";
import { insertZuzaluPretixTicket } from "../src/database/queries/zuzalu_pretix_tickets/insertZuzaluPretixTicket";
import { sqlQuery } from "../src/database/sqlQuery";
import { ZuconnectTripshaSyncService } from "../src/services/zuconnectTripshaSyncService";
import { Zupass } from "../src/types";
import { expectCurrentSemaphoreToBe } from "./semaphore/checkSemaphore";
import {
  MOCK_ZUCONNECT_TRIPSHA_URL,
  badEmptyResponse,
  badTicketsResponse,
  getZuconnectMockTripshaServer,
  goodResponse,
  makeHandler
} from "./tripsha/mockTripshaAPI";
import { testLogin } from "./user/testLoginPCDPass";
import { overrideEnvironment, testingEnv } from "./util/env";
import { startTestingApp } from "./util/startTestingApplication";

describe("zuconnect functionality", function () {
  this.timeout(30_000);
  let db: Pool;
  let server: SetupServer;
  let zuconnectTripshaSyncService: ZuconnectTripshaSyncService;
  let application: Zupass;
  let identity: Identity;
  let user: User;
  let ticketPCD: EdDSATicketPCD;

  this.afterEach(async () => {
    server.resetHandlers();
  });

  this.beforeAll(async () => {
    await overrideEnvironment(testingEnv);
    db = await getDB();

    server = getZuconnectMockTripshaServer();
    server.listen({ onUnhandledRequest: "bypass" });

    application = await startTestingApp({
      zuconnectTripshaAPI: new ZuconnectTripshaAPI(MOCK_ZUCONNECT_TRIPSHA_URL)
    });

    if (!application.services.zuconnectTripshaSyncService) {
      throw new Error("expected there to be a Tripsha sync service");
    }

    zuconnectTripshaSyncService =
      application.services.zuconnectTripshaSyncService;
  });

  this.afterAll(async () => {
    await stopApplication(application);
    await db.end();
    server.close();
  });

  it("since nobody has logged in yet, all the semaphore groups should be empty", async function () {
    expectCurrentSemaphoreToBe(application, {
      p: [],
      r: [],
      v: [],
      o: [],
      g: []
    });
  });

  it("should sync with good API response", async () => {
    await zuconnectTripshaSyncService.sync();
    const tickets = await fetchAllZuconnectTickets(db);
    expect(tickets.length).to.eq(5);
  });

  it("should soft-delete when tickets do not appear in API response", async () => {
    server.use(makeHandler({ tickets: goodResponse.tickets.slice(0, 4) }));
    await zuconnectTripshaSyncService.sync();
    const tickets = await fetchAllZuconnectTickets(db);
    expect(tickets.length).to.eq(4);

    const deleted = await sqlQuery(
      db,
      `SELECT * FROM zuconnect_tickets WHERE is_deleted = TRUE`
    );
    expect(deleted.rowCount).to.eq(1);
    expect(deleted.rows[0].external_ticket_id).to.eq(
      goodResponse.tickets[4].id
    );
  });

  it("soft-deleted ticket should be un-deleted if ticket appears again in API response", async () => {
    await zuconnectTripshaSyncService.sync();
    const tickets = await fetchAllZuconnectTickets(db);
    expect(tickets.length).to.eq(5);

    const deleted = await sqlQuery(
      db,
      `SELECT * FROM zuconnect_tickets WHERE is_deleted = TRUE`
    );
    expect(deleted.rowCount).to.eq(0);
  });

  it("should fail to sync with bad API response", async () => {
    server.use(makeHandler(badEmptyResponse));
    try {
      expect(await zuconnectTripshaSyncService.sync()).to.throw;
    } catch (e) {
      /**
       * We get detailed validation errors here due to the schema defined in
       * {@link ZuconnectTripshaSchema}
       */
      expect((e as any).issues[0].code).to.eq("invalid_type");
      expect((e as any).issues[0].path).to.deep.eq(["tickets"]);
      expect((e as any).issues[0].expected).to.eq("array");
      expect((e as any).issues[0].received).to.eq("undefined");
    }

    server.use(makeHandler(badTicketsResponse));
    try {
      expect(await zuconnectTripshaSyncService.sync()).to.throw;
    } catch (e) {
      expect((e as any).issues[0].code).to.eq("invalid_type");
      expect((e as any).issues[0].path).to.deep.eq(["tickets", 0, "email"]);
      expect((e as any).issues[0].expected).to.eq("string");
      expect((e as any).issues[0].received).to.eq("undefined");
    }
  });

  it("should be able to log in", async function () {
    const result = await testLogin(application, goodResponse.tickets[0].email, {
      expectEmailIncorrect: false,
      expectUserAlreadyLoggedIn: false,
      force: false,
      skipSetupPassword: false
    });

    if (!result) {
      throw new Error("failed to log in");
    }

    expect(result).to.not.be.undefined;

    identity = result.identity;
    user = result.user;
  });

  it("after a Zuconnect resident logs in, they should show up in the resident semaphore group and no other groups", async function () {
    if (!user) {
      throw new Error("expected user");
    }

    await application.services.semaphoreService.reload();

    await sleep(100);

    expectCurrentSemaphoreToBe(application, {
      p: [user.commitment],
      r: [user.commitment],
      v: [],
      o: [],
      g: [user.commitment]
    });
  });

  it("if a Zuconnect resident is also a Zuzalu user with a different role, they should appear in the appropriate semaphore groups", async () => {
    await insertZuzaluPretixTicket(db, {
      email: user.email,
      name: "Organizer",
      role: ZuzaluUserRole.Organizer,
      order_id: randomUUID()
    });

    await application.services.semaphoreService.reload();

    expectCurrentSemaphoreToBe(application, {
      p: [user.commitment],
      r: [user.commitment],
      v: [],
      // Here we see the user is now also in the Organizer group
      o: [user.commitment],
      g: [user.commitment]
    });
  });

  it("should be able to be issued tickets", async () => {
    MockDate.set(new Date());
    const payload = JSON.stringify(createFeedCredentialPayload());
    const response = await pollFeed(
      application.expressContext.localEndpoint,
      identity,
      payload,
      ZupassFeedIds.Zuconnect_23
    );
    MockDate.reset();

    expect(response.success).to.be.true;

    expect(response.value?.actions.length).to.eq(2);
    const populateAction = response.value?.actions[1] as ReplaceInFolderAction;
    expect(populateAction.type).to.eq(PCDActionType.ReplaceInFolder);
    expect(populateAction.folder).to.eq("Zuconnect");
    expect(populateAction.pcds[0].type).to.eq(EdDSATicketPCDPackage.name);

    ticketPCD = await EdDSATicketPCDPackage.deserialize(
      populateAction.pcds[0].pcd
    );
    expect(ticketPCD.claim.ticket.attendeeEmail).to.eq(
      goodResponse.tickets[0].email
    );
  });

  it("should recognize issued ticket as known ticket", async () => {
    const serializedPCD = await EdDSATicketPCDPackage.serialize(ticketPCD);
    const response = await requestVerifyTicket(
      application.expressContext.localEndpoint,
      { pcd: JSON.stringify(serializedPCD) }
    );

    expect(response?.success).to.be.true;
    expect(response?.value?.verified).to.be.true;
  });
});
