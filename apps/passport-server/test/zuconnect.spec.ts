import { EdDSATicketPCD, EdDSATicketPCDPackage } from "@pcd/eddsa-ticket-pcd";
import {
  KnownTicketGroup,
  User,
  ZupassFeedIds,
  ZuzaluUserRole,
  createFeedCredentialPayload,
  pollFeed,
  requestVerifyTicket,
  requestVerifyTicketById
} from "@pcd/passport-interface";
import { PCDActionType, isReplaceInFolderAction } from "@pcd/pcd-collection";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { ZKEdDSAEventTicketPCDPackage } from "@pcd/zk-eddsa-event-ticket-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import { randomUUID } from "crypto";
import "mocha";
import MockDate from "mockdate";
import { SetupServer } from "msw/lib/node";
import path from "path";
import { Pool } from "postgres-pool";
import { ZuconnectTripshaAPI } from "../src/apis/zuconnect/zuconnectTripshaAPI";
import { stopApplication } from "../src/application";
import { ZuconnectTicketDB } from "../src/database/models";
import { getDB } from "../src/database/postgresPool";
import { fetchAllZuconnectTickets } from "../src/database/queries/zuconnect/fetchZuconnectTickets";
import { upsertZuconnectTicket } from "../src/database/queries/zuconnect/insertZuconnectTicket";
import { insertZuzaluPretixTicket } from "../src/database/queries/zuzalu_pretix_tickets/insertZuzaluPretixTicket";
import { sqlQuery } from "../src/database/sqlQuery";
import {
  ZuconnectTripshaSyncService,
  apiTicketsToDBTickets,
  zuconnectTicketsDifferent
} from "../src/services/zuconnectTripshaSyncService";
import { Zupass } from "../src/types";
import { expectCurrentSemaphoreToBe } from "./semaphore/checkSemaphore";
import {
  MOCK_ZUCONNECT_TRIPSHA_KEY,
  MOCK_ZUCONNECT_TRIPSHA_URL,
  badEmptyResponse,
  badTicketNameResponse,
  badTicketsResponse,
  getZuconnectMockTripshaServer,
  goodResponse,
  makeHandler
} from "./tripsha/mockTripshaAPI";
import { testLogin } from "./user/testLoginPCDPass";
import { overrideEnvironment, testingEnv } from "./util/env";
import { startTestingApp } from "./util/startTestingApplication";
import { expectToExist } from "./util/util";

describe("zuconnect functionality", function () {
  this.timeout(30_000);
  let db: Pool;
  let server: SetupServer;
  let zuconnectTripshaSyncService: ZuconnectTripshaSyncService;
  let application: Zupass;
  let identity: Identity;
  let user: User;
  let ticketPCD: EdDSATicketPCD;
  const numberOfValidTickets = goodResponse.tickets.length;
  const zuconnectTripshaAPI = new ZuconnectTripshaAPI(
    MOCK_ZUCONNECT_TRIPSHA_URL,
    MOCK_ZUCONNECT_TRIPSHA_KEY
  );

  const zkeyFilePath = path.join(
    __dirname,
    `../public/artifacts/zk-eddsa-event-ticket-pcd/circuit.zkey`
  );
  const wasmFilePath = path.join(
    __dirname,
    `../public/artifacts/zk-eddsa-event-ticket-pcd/circuit.wasm`
  );
  this.afterEach(async () => {
    server.resetHandlers();
  });

  this.beforeAll(async () => {
    await overrideEnvironment(testingEnv);
    db = await getDB();

    server = getZuconnectMockTripshaServer();
    server.listen({ onUnhandledRequest: "bypass" });

    application = await startTestingApp({
      zuconnectTripshaAPI
    });

    if (!application.services.zuconnectTripshaSyncService) {
      throw new Error("expected there to be a Tripsha sync service");
    }

    zuconnectTripshaSyncService =
      application.services.zuconnectTripshaSyncService;

    await EdDSATicketPCDPackage.init?.({});
    await ZKEdDSAEventTicketPCDPackage.init?.({
      zkeyFilePath,
      wasmFilePath
    });
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
      g: [],
      d: [],
      s: []
    });
  });

  it("should sync with good API response", async () => {
    await zuconnectTripshaSyncService.sync();
    const tickets = await fetchAllZuconnectTickets(db);
    expect(tickets.length).to.eq(numberOfValidTickets);
  });

  it("tickets should have expected values after sync", async () => {
    const dbTickets = await fetchAllZuconnectTickets(db);
    const apiTickets = await zuconnectTripshaAPI.fetchTickets();

    const dbTicketsByExternalId = new Map(
      dbTickets.map((ticket) => [ticket.external_ticket_id, ticket])
    );
    const apiTicketsByExternalId = new Map(
      apiTickets.map((ticket) => [ticket.id, ticket])
    );

    for (const ticket of dbTickets) {
      expect(ticket.attendee_email).to.eq(
        apiTicketsByExternalId.get(ticket.external_ticket_id)?.email
      );
    }

    const idOfTicketWithAddons = goodResponse.tickets[5].id;

    expect(
      dbTicketsByExternalId.get(idOfTicketWithAddons)?.extra_info.length
    ).to.eq(2);
    expect(
      dbTicketsByExternalId.get(idOfTicketWithAddons)?.extra_info[0]
    ).to.eq(apiTickets[5].extraInfo[0]);
    expect(
      dbTicketsByExternalId.get(idOfTicketWithAddons)?.extra_info[1]
    ).to.eq(apiTickets[5].extraInfo[1]);
  });

  it("tickets from the API should show as being unchanged from the DB after sync", async () => {
    const apiTickets = await zuconnectTripshaAPI.fetchTickets();
    const dbTickets = await fetchAllZuconnectTickets(db);

    const dbTicketsByExternalId = new Map(
      dbTickets.map((ticket) => [ticket.external_ticket_id, ticket])
    );

    for (const apiTicket of apiTicketsToDBTickets(apiTickets)) {
      const dbTicket = dbTicketsByExternalId.get(
        apiTicket.external_ticket_id
      ) as ZuconnectTicketDB;
      expect(zuconnectTicketsDifferent(apiTicket, dbTicket)).to.be.false;
    }
  });

  it("should soft-delete when tickets do not appear in API response", async () => {
    server.use(
      makeHandler({
        tickets: goodResponse.tickets.slice(0, numberOfValidTickets - 1)
      })
    );
    await zuconnectTripshaSyncService.sync();
    const tickets = await fetchAllZuconnectTickets(db);
    expect(tickets.length).to.eq(numberOfValidTickets - 1);

    const deleted = await sqlQuery(
      db,
      `SELECT * FROM zuconnect_tickets WHERE is_deleted = TRUE`
    );
    expect(deleted.rowCount).to.eq(1);
    expect(deleted.rows[0].external_ticket_id).to.eq(
      goodResponse.tickets[numberOfValidTickets - 1].id
    );
  });

  it("soft-deleted ticket should be un-deleted if ticket appears again in API response", async () => {
    await zuconnectTripshaSyncService.sync();
    const tickets = await fetchAllZuconnectTickets(db);
    expect(tickets.length).to.eq(numberOfValidTickets);

    const deleted = await sqlQuery(
      db,
      `SELECT * FROM zuconnect_tickets WHERE is_deleted = TRUE`
    );
    expect(deleted.rowCount).to.eq(0);
  });

  it("mock tickets should never be soft-deleted by the sync process", async () => {
    await upsertZuconnectTicket(db, {
      product_id: randomUUID(),
      external_ticket_id: randomUUID(),
      attendee_email: "mock@example.com",
      attendee_name: "Mock User",
      is_deleted: false,
      is_mock_ticket: true,
      extra_info: []
    });
    await zuconnectTripshaSyncService.sync();
    const tickets = await fetchAllZuconnectTickets(db);
    expect(tickets.length).to.eq(numberOfValidTickets + 1);

    const deleted = await sqlQuery(
      db,
      `SELECT * FROM zuconnect_tickets WHERE is_deleted = TRUE`
    );
    expect(deleted.rowCount).to.eq(0);

    // Clean up mock ticket
    await sqlQuery(
      db,
      "DELETE FROM zuconnect_tickets WHERE is_mock_ticket = TRUE"
    );
  });

  it("should fail to sync with bad API response", async () => {
    // Test that validation fails with no tickets
    server.use(makeHandler(badEmptyResponse));
    try {
      expect(await zuconnectTripshaSyncService.sync()).to.throw;
    } catch (e) {
      expect(e instanceof Error).to.be.true;
    }

    // Test that validation fails for a ticket with no email address
    server.use(makeHandler(badTicketsResponse));
    try {
      expect(await zuconnectTripshaSyncService.sync()).to.not.throw;
      const tickets = await fetchAllZuconnectTickets(db);
      expect(tickets.length).to.eq(0);
    } catch (e) {
      // Should never get here
      expect.fail();
    }

    // Test that validation fails for a ticket with an unknown ticketName
    server.use(makeHandler(badTicketNameResponse));
    try {
      expect(await zuconnectTripshaSyncService.sync()).to.not.throw;
      const tickets = await fetchAllZuconnectTickets(db);
      expect(tickets.length).to.eq(0);
    } catch (e) {
      // Should never get here
      expect.fail();
    }

    // Run a good sync so that following tests have good data to work with
    server.resetHandlers();
    await zuconnectTripshaSyncService.sync();
    const tickets = await fetchAllZuconnectTickets(db);
    expect(tickets.length).to.eq(numberOfValidTickets);
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
    expectCurrentSemaphoreToBe(application, {
      p: [user.commitment],
      r: [user.commitment],
      v: [],
      o: [],
      g: [user.commitment],
      d: [],
      s: []
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
      g: [user.commitment],
      d: [],
      s: []
    });
  });

  it("should be able to be issued tickets", async () => {
    MockDate.set(new Date());
    const payload = JSON.stringify(createFeedCredentialPayload());
    const response = await pollFeed(
      `${application.expressContext.localEndpoint}/feeds`,
      identity,
      payload,
      ZupassFeedIds.Zuconnect_23
    );
    MockDate.reset();

    expect(response.success).to.be.true;

    expect(response.value?.actions.length).to.eq(3);
    const populateAction = response.value?.actions[2];
    expectToExist(populateAction, isReplaceInFolderAction);
    expect(populateAction.type).to.eq(PCDActionType.ReplaceInFolder);
    expect(populateAction.folder).to.eq("ZuConnect");
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

  it("should recognize a ZK ticket as known ticket", async () => {
    const serializedTicketPCD =
      await EdDSATicketPCDPackage.serialize(ticketPCD);

    const serializedIdentityPCD = await SemaphoreIdentityPCDPackage.serialize(
      await SemaphoreIdentityPCDPackage.prove({
        identity
      })
    );

    const zkPCD = await ZKEdDSAEventTicketPCDPackage.prove({
      ticket: {
        value: serializedTicketPCD,
        argumentType: ArgumentTypeName.PCD
      },
      identity: {
        value: serializedIdentityPCD,
        argumentType: ArgumentTypeName.PCD
      },
      fieldsToReveal: {
        value: {
          revealEventId: true,
          revealProductId: true
        },
        argumentType: ArgumentTypeName.ToggleList
      },
      validEventIds: {
        value: [ticketPCD.claim.ticket.eventId],
        argumentType: ArgumentTypeName.StringArray
      },
      externalNullifier: {
        value: undefined,
        argumentType: ArgumentTypeName.BigInt
      },
      watermark: {
        value: Date.now().toString(),
        argumentType: ArgumentTypeName.BigInt
      }
    });

    const serializedZKPCD = await ZKEdDSAEventTicketPCDPackage.serialize(zkPCD);

    const response = await requestVerifyTicket(
      application.expressContext.localEndpoint,
      { pcd: JSON.stringify(serializedZKPCD) }
    );

    expect(response?.success).to.be.true;
    expect(response?.value?.verified).to.be.true;
  });

  it("should verify zuconnect tickets by ID", async () => {
    const response = await requestVerifyTicketById(
      application.expressContext.localEndpoint,
      {
        ticketId: ticketPCD.claim.ticket.ticketId,
        timestamp: Date.now().toString()
      }
    );

    expect(response?.success).to.be.true;
    expect(response?.value?.verified).to.be.true;
    if (response.value?.verified) {
      expect(response.value.group).eq(KnownTicketGroup.Zuconnect23);
      expect(response.value.productId).eq(ticketPCD.claim.ticket.productId);
    }
  });

  let userWithTwoTicketsRow;
  it("should allow a user to have more than one ticket", async () => {
    // Note that this is not the email used for the previous user
    const result = await testLogin(application, goodResponse.tickets[4].email, {
      expectEmailIncorrect: false,
      expectUserAlreadyLoggedIn: false,
      force: false,
      skipSetupPassword: false
    });

    if (!result) {
      throw new Error("failed to log in");
    }

    expect(result).to.not.be.undefined;

    userWithTwoTicketsRow = result;

    const extraTicket = {
      ...goodResponse.tickets[4],
      ticketName: "ZuConnect Organizer Pass",
      id: randomUUID()
    };

    server.use(
      makeHandler({
        tickets: [...goodResponse.tickets, extraTicket]
      })
    );
    await zuconnectTripshaSyncService.sync();
    const tickets = await fetchAllZuconnectTickets(db);
    expect(tickets.length).to.eq(numberOfValidTickets + 1);

    MockDate.set(new Date());
    const payload = JSON.stringify(createFeedCredentialPayload());
    const response = await pollFeed(
      `${application.expressContext.localEndpoint}/feeds`,
      userWithTwoTicketsRow.identity,
      payload,
      ZupassFeedIds.Zuconnect_23
    );
    MockDate.reset();

    expect(response.success).to.be.true;

    expect(response.value?.actions.length).to.eq(3);
    const populateAction = response.value?.actions[2];
    expectToExist(populateAction, isReplaceInFolderAction);
    expect(populateAction.type).to.eq(PCDActionType.ReplaceInFolder);
    expect(populateAction.folder).to.eq("ZuConnect");
    expect(populateAction.pcds.length).to.eq(2);
    for (const pcd of populateAction.pcds) {
      expect(
        (await EdDSATicketPCDPackage.deserialize(pcd.pcd)).claim.ticket
          .attendeeEmail
      ).to.eq(extraTicket.email);
    }
  });
});
