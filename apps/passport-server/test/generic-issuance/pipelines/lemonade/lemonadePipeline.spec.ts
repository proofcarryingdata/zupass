import { getEdDSAPublicKey, newEdDSAPrivateKey } from "@pcd/eddsa-pcd";
import { expectIsEdDSATicketPCD } from "@pcd/eddsa-ticket-pcd";
import { EmailPCDPackage } from "@pcd/email-pcd";
import {
  PipelineLogLevel,
  PodboxTicketActionResponseValue,
  createCredentialPayload,
  requestGenericIssuanceHistoricalSemaphoreGroup,
  requestGenericIssuanceSemaphoreGroup,
  requestGenericIssuanceSemaphoreGroupRoot,
  requestGenericIssuanceValidSemaphoreGroup,
  requestPodboxTicketAction
} from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import {
  SemaphoreGroupPCDPackage,
  deserializeSemaphoreGroup,
  serializeSemaphoreGroup
} from "@pcd/semaphore-group-pcd";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { ONE_DAY_MS, ONE_MINUTE_MS } from "@pcd/util";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import { randomUUID } from "crypto";
import "mocha";
import { step } from "mocha-steps";
import * as MockDate from "mockdate";
import { rest } from "msw";
import { Pool, PoolClient } from "postgres-pool";
import urljoin from "url-join";
import { LemonadeOAuthCredentials } from "../../../../src/apis/lemonade/auth";
import { LemonadeTicket } from "../../../../src/apis/lemonade/types";
import { stopApplication } from "../../../../src/application";
import { PipelineConsumerDB } from "../../../../src/database/queries/pipelineConsumerDB";
import { PipelineDefinitionDB } from "../../../../src/database/queries/pipelineDefinitionDB";
import { PipelineUserDB } from "../../../../src/database/queries/pipelineUserDB";
import { GenericIssuanceService } from "../../../../src/services/generic-issuance/GenericIssuanceService";
import {
  LEMONADE_CHECKER,
  LemonadePipeline
} from "../../../../src/services/generic-issuance/pipelines/LemonadePipeline";
import { PipelineUser } from "../../../../src/services/generic-issuance/pipelines/types";
import { Zupass } from "../../../../src/types";
import {
  customLemonadeTicketHandler,
  loadApolloErrorMessages,
  unregisteredLemonadeUserHandler
} from "../../../lemonade/MockLemonadeServer";
import { overrideEnvironment, testingEnv } from "../../../util/env";
import { startTestingApp } from "../../../util/startTestingApplication";
import {
  expectFalse,
  expectLength,
  expectToExist,
  expectTrue
} from "../../../util/util";
import {
  assertUserMatches,
  checkPipelineInfoEndpoint,
  proveEmailPCD,
  requestCheckInPipelineTicket,
  requestTicketsFromPipeline,
  signCredentialPayload
} from "../../util";
import { setupTestLemonadePipeline } from "./setupTestLemonadePipeline";

/**
 * Tests for {@link GenericIssuanceService}, in particular the {@link LemonadePipeline}.
 */
describe("generic issuance - LemonadePipeline", function () {
  const nowDate = new Date();
  const now = Date.now();

  // The Apollo client used by Lemonade does not load error messages by
  // default, so we have to call this.
  loadApolloErrorMessages();

  let ZUPASS_EDDSA_PRIVATE_KEY: string;
  let giBackend: Zupass;
  let giService: GenericIssuanceService;

  let client: PoolClient;
  let pool: Pool;

  const adminGIUserId = randomUUID();
  const adminGIUserEmail = "admin@test.com";

  const {
    edgeCityPipeline,
    edgeCityGIUserID,
    edgeCityGIUserEmail,
    EdgeCityLemonadeAccount,
    EdgeCityDenver,
    EdgeCityAttendeeTicketType,
    EdgeCityDenverAttendee,
    EdgeCityDenverAttendeeIdentity,
    EdgeCityAttendeeTicket,
    EdgeCityDenverBouncer,
    EdgeCityBouncerIdentity,
    EdgeCityDenverBouncerTicket,
    EdgeCityDenverBouncer2,
    EdgeCityBouncer2Identity,
    EdgeCityDenverBouncer2Ticket,
    EdgeCityManualAttendeeIdentity,
    EdgeCityManualAttendeeEmail,
    EdgeCityManualBouncerIdentity,
    EdgeCityManualBouncerEmail,
    lemonadeTokenSource,
    lemonadeAPI,
    edgeCitySemaphoreGroupIds,
    lemonadeBackendUrl,
    lemonadeBackend,
    lemonadeOAuthClientId,
    mockServer
  } = setupTestLemonadePipeline();

  const pipelineDefinitions = [edgeCityPipeline];

  /**
   * Sets up a Zupass/Generic issuance backend with one pipeline:
   * - {@link LemonadePipeline}, as defined by {@link setupTestLemonadePipeline}
   */
  this.beforeAll(async () => {
    // This has to be done here as it requires an `await`
    const zupassPublicKey = JSON.stringify(
      await getEdDSAPublicKey(testingEnv.SERVER_EDDSA_PRIVATE_KEY as string)
    );

    await overrideEnvironment({
      GENERIC_ISSUANCE_ZUPASS_PUBLIC_KEY: zupassPublicKey,
      ...testingEnv
    });

    giBackend = await startTestingApp({
      lemonadeAPI
    });

    pool = giBackend.context.dbPool;
    client = await pool.connect();

    const userDB = new PipelineUserDB();

    const adminUser: PipelineUser = {
      id: adminGIUserId,
      email: adminGIUserEmail,
      isAdmin: true,
      timeCreated: nowDate,
      timeUpdated: nowDate
    };
    await userDB.updateUserById(client, adminUser);
    assertUserMatches(
      {
        id: adminGIUserId,
        email: adminGIUserEmail,
        isAdmin: true,
        timeCreated: nowDate,
        timeUpdated: nowDate
      },
      await userDB.getUserById(client, adminUser.id)
    );

    const edgeCityDenverUser: PipelineUser = {
      id: edgeCityGIUserID,
      email: edgeCityGIUserEmail,
      isAdmin: false,
      timeCreated: nowDate,
      timeUpdated: nowDate
    };
    await userDB.updateUserById(client, edgeCityDenverUser);
    assertUserMatches(
      {
        id: edgeCityGIUserID,
        email: edgeCityGIUserEmail,
        isAdmin: false,
        timeCreated: nowDate,
        timeUpdated: nowDate
      },
      await userDB.getUserById(client, edgeCityDenverUser.id)
    );

    // The mock server will intercept any requests for URLs that are registered
    // with it. Unhandled requests will bypass the mock server.
    mockServer.listen({ onUnhandledRequest: "bypass" });

    ZUPASS_EDDSA_PRIVATE_KEY = process.env.SERVER_EDDSA_PRIVATE_KEY as string;
    giService = giBackend.services
      .genericIssuanceService as GenericIssuanceService;
    await giService.stop();
    const pipelineDefinitionDB = new PipelineDefinitionDB();
    await pipelineDefinitionDB.deleteAllDefinitions(client);
    await pipelineDefinitionDB.upsertDefinitions(client, pipelineDefinitions);
    await giService.start(false);
  });

  this.beforeEach(async () => {
    MockDate.set(now);
  });

  this.afterEach(async () => {
    mockServer.resetHandlers();
    MockDate.reset();
  });

  this.afterAll(async () => {
    mockServer.close();
  });

  step("PipelineUserDB", async function () {
    const userDB = new PipelineUserDB();

    const adminUser: PipelineUser = {
      id: adminGIUserId,
      email: adminGIUserEmail,
      isAdmin: true,
      timeCreated: nowDate,
      timeUpdated: nowDate
    };
    await userDB.updateUserById(client, adminUser);
    assertUserMatches(
      {
        id: adminGIUserId,
        email: adminGIUserEmail,
        isAdmin: true,
        timeCreated: nowDate,
        timeUpdated: nowDate
      },
      await userDB.getUserById(client, adminUser.id)
    );

    // TODO: comprehensive tests of create update read delete
  });

  /**
   * Tests for {@link LemonadePipeline} reading from a mocked
   * Edge Cities Denver lemonade configuration, and issuing
   * {@link EdDSATicketPCD} tickets that can be checked in
   * using the Zupass client.
   *
   * @brian and @richard discussed building out a separate app for scanning
   * curious to hear thoughts from rest of team about this
   */
  step(
    "LemonadePipeline feed issuance and checkin for Edge City Denver",
    async () => {
      expectToExist(giService);
      const pipelines = await giService.getAllPipelineInstances();
      expectToExist(pipelines);
      expectLength(pipelines, 1);
      const edgeCityDenverPipeline = pipelines.find(LemonadePipeline.is);
      expectToExist(edgeCityDenverPipeline);
      const edgeCityDenverTicketFeedUrl =
        edgeCityDenverPipeline.issuanceCapability.feedUrl;
      const AttendeeTickets = await requestTicketsFromPipeline(
        edgeCityDenverPipeline.issuanceCapability.options.feedFolder,
        edgeCityDenverTicketFeedUrl,
        edgeCityDenverPipeline.issuanceCapability.options.feedId,
        ZUPASS_EDDSA_PRIVATE_KEY,
        EdgeCityDenverAttendee.email,
        EdgeCityDenverAttendeeIdentity
      );
      expectLength(AttendeeTickets, 1);
      const AttendeeTicket = AttendeeTickets[0];
      expectIsEdDSATicketPCD(AttendeeTicket);
      expect(AttendeeTicket.claim.ticket.attendeeEmail)
        .to.eq(EdgeCityAttendeeTicket.user_email)
        .to.eq(EdgeCityDenverAttendee.email);

      const BouncerTickets = await requestTicketsFromPipeline(
        edgeCityDenverPipeline.issuanceCapability.options.feedFolder,
        edgeCityDenverTicketFeedUrl,
        edgeCityDenverPipeline.issuanceCapability.options.feedId,
        ZUPASS_EDDSA_PRIVATE_KEY,
        EdgeCityDenverBouncerTicket.user_email,
        EdgeCityBouncerIdentity
      );
      expectLength(BouncerTickets, 1);
      const BouncerTicket = BouncerTickets[0];
      expectIsEdDSATicketPCD(BouncerTicket);
      expect(BouncerTicket.claim.ticket.attendeeEmail)
        .to.eq(EdgeCityDenverBouncerTicket.user_email)
        .to.eq(EdgeCityDenverBouncer.email);

      const bouncerChecksInAttendee = await requestCheckInPipelineTicket(
        edgeCityDenverPipeline.checkinCapability.getCheckinUrl(),
        ZUPASS_EDDSA_PRIVATE_KEY,
        EdgeCityDenverBouncerTicket.user_email,
        EdgeCityBouncerIdentity,
        AttendeeTicket
      );
      expect(bouncerChecksInAttendee.value).to.deep.eq({ success: true });

      // can't check in a ticket that's already checked in
      const bouncerChecksInAttendeeAgain = await requestCheckInPipelineTicket(
        edgeCityDenverPipeline.checkinCapability.getCheckinUrl(),
        ZUPASS_EDDSA_PRIVATE_KEY,
        EdgeCityDenverBouncerTicket.user_email,
        EdgeCityBouncerIdentity,
        AttendeeTicket
      );
      // TODO check for specific error type
      expect(bouncerChecksInAttendeeAgain.value).to.deep.contain({
        success: false
      });

      // can't check in a ticket using a ticket that isn't a
      // superuser ticket
      const atteendeeChecksInBouncerResult = await requestCheckInPipelineTicket(
        edgeCityDenverPipeline.checkinCapability.getCheckinUrl(),
        ZUPASS_EDDSA_PRIVATE_KEY,
        EdgeCityAttendeeTicket.user_email,
        EdgeCityDenverAttendeeIdentity,
        BouncerTicket
      );

      expect(atteendeeChecksInBouncerResult.value).to.deep.eq({
        success: false,
        error: { name: "NotSuperuser" }
      } satisfies PodboxTicketActionResponseValue);

      // can't check in a ticket with an email PCD signed by a non-Zupass private key
      const fakeBouncerCheckInBouncerResult =
        await requestCheckInPipelineTicket(
          edgeCityDenverPipeline.checkinCapability.getCheckinUrl(),
          newEdDSAPrivateKey(),
          EdgeCityAttendeeTicket.user_email,
          EdgeCityDenverAttendeeIdentity,
          BouncerTicket
        );
      expect(fakeBouncerCheckInBouncerResult.value).to.deep.eq({
        success: false,
        error: { name: "InvalidSignature" }
      } satisfies PodboxTicketActionResponseValue);

      const Bouncer2Tickets = await requestTicketsFromPipeline(
        edgeCityDenverPipeline.issuanceCapability.options.feedFolder,
        edgeCityDenverTicketFeedUrl,
        edgeCityDenverPipeline.issuanceCapability.options.feedId,
        ZUPASS_EDDSA_PRIVATE_KEY,
        EdgeCityDenverBouncer2Ticket.user_email,
        EdgeCityBouncer2Identity
      );
      expectLength(Bouncer2Tickets, 1);
      const Bouncer2Ticket = Bouncer2Tickets[0];
      expectIsEdDSATicketPCD(Bouncer2Ticket);
      expect(Bouncer2Ticket.claim.ticket.attendeeEmail)
        .to.eq(EdgeCityDenverBouncer2Ticket.user_email)
        .to.eq(EdgeCityDenverBouncer2.email);

      const bouncer2ChecksInSelf = await requestCheckInPipelineTicket(
        edgeCityDenverPipeline.checkinCapability.getCheckinUrl(),
        ZUPASS_EDDSA_PRIVATE_KEY,
        EdgeCityDenverBouncer2Ticket.user_email,
        EdgeCityBouncer2Identity,
        Bouncer2Ticket
      );
      expect(bouncer2ChecksInSelf.value).to.deep.eq({ success: true });

      const ManualAttendeeTickets = await requestTicketsFromPipeline(
        edgeCityDenverPipeline.issuanceCapability.options.feedFolder,
        edgeCityDenverTicketFeedUrl,
        edgeCityDenverPipeline.issuanceCapability.options.feedId,
        ZUPASS_EDDSA_PRIVATE_KEY,
        EdgeCityManualAttendeeEmail,
        EdgeCityManualAttendeeIdentity
      );
      expectLength(ManualAttendeeTickets, 1);
      const ManualAttendeeTicket = ManualAttendeeTickets[0];
      expectIsEdDSATicketPCD(ManualAttendeeTicket);
      expect(ManualAttendeeTicket.claim.ticket.attendeeEmail).to.eq(
        EdgeCityManualAttendeeEmail
      );

      const ManualBouncerTickets = await requestTicketsFromPipeline(
        edgeCityDenverPipeline.issuanceCapability.options.feedFolder,
        edgeCityDenverTicketFeedUrl,
        edgeCityDenverPipeline.issuanceCapability.options.feedId,
        ZUPASS_EDDSA_PRIVATE_KEY,
        EdgeCityManualBouncerEmail,
        EdgeCityManualBouncerIdentity
      );
      expectLength(ManualBouncerTickets, 1);
      const ManualBouncerTicket = ManualBouncerTickets[0];
      expectIsEdDSATicketPCD(ManualBouncerTicket);
      expect(ManualBouncerTicket.claim.ticket.attendeeEmail).to.eq(
        EdgeCityManualBouncerEmail
      );

      const manualBouncerChecksInManualAttendee =
        await requestCheckInPipelineTicket(
          edgeCityDenverPipeline.checkinCapability.getCheckinUrl(),
          ZUPASS_EDDSA_PRIVATE_KEY,
          EdgeCityManualBouncerEmail,
          EdgeCityManualBouncerIdentity,
          ManualAttendeeTicket
        );
      expect(manualBouncerChecksInManualAttendee.value).to.deep.eq({
        success: true
      });

      {
        const ManualAttendeeTickets = await requestTicketsFromPipeline(
          edgeCityDenverPipeline.issuanceCapability.options.feedFolder,
          edgeCityDenverTicketFeedUrl,
          edgeCityDenverPipeline.issuanceCapability.options.feedId,
          ZUPASS_EDDSA_PRIVATE_KEY,
          EdgeCityManualAttendeeEmail,
          EdgeCityManualAttendeeIdentity
        );
        expectLength(ManualAttendeeTickets, 1);
        const ManualAttendeeTicket = ManualAttendeeTickets[0];
        expectIsEdDSATicketPCD(ManualAttendeeTicket);
        expect(ManualAttendeeTicket.claim.ticket.attendeeEmail).to.eq(
          EdgeCityManualAttendeeEmail
        );
        expect(ManualAttendeeTicket.claim.ticket.isConsumed).to.eq(true);
        expect(ManualAttendeeTicket.claim.ticket.timestampConsumed).to.eq(
          Date.now()
        );
      }

      const manualBouncerChecksInManualAttendeeAgain =
        await requestCheckInPipelineTicket(
          edgeCityDenverPipeline.checkinCapability.getCheckinUrl(),
          ZUPASS_EDDSA_PRIVATE_KEY,
          EdgeCityManualBouncerEmail,
          EdgeCityManualBouncerIdentity,
          ManualAttendeeTicket
        );
      expect(manualBouncerChecksInManualAttendeeAgain.value).to.deep.eq({
        success: false,
        error: {
          name: "AlreadyCheckedIn",
          checkinTimestamp: new Date().toISOString(),
          checker: LEMONADE_CHECKER
        }
      } satisfies PodboxTicketActionResponseValue);

      const manualAttendeeChecksInManualBouncer =
        await requestCheckInPipelineTicket(
          edgeCityDenverPipeline.checkinCapability.getCheckinUrl(),
          ZUPASS_EDDSA_PRIVATE_KEY,
          EdgeCityManualAttendeeEmail,
          EdgeCityManualAttendeeIdentity,
          ManualBouncerTicket
        );
      expect(manualAttendeeChecksInManualBouncer.value).to.deep.eq({
        success: false,
        error: { name: "NotSuperuser" }
      } satisfies PodboxTicketActionResponseValue);

      // TODO test checking in manual attendee/bouncer
      // Currently not supported as these are not present in the Lemonade
      // backend, will be implemented with the pipeline as the check-in backend

      // Verify that consumers were saved for each user who requested tickets
      const consumerDB = new PipelineConsumerDB();
      const consumers = await consumerDB.loadByEmails(
        client,
        edgeCityDenverPipeline.id,
        [
          EdgeCityManualAttendeeEmail,
          EdgeCityManualBouncerEmail,
          EdgeCityDenverAttendee.email,
          EdgeCityDenverBouncer.email,
          EdgeCityDenverBouncer2.email
        ]
      );
      expectLength(consumers, 5);
      const edgeCityIssuanceDateTime = new Date();
      expect(consumers).to.deep.include.members([
        {
          email: EdgeCityManualAttendeeEmail,
          commitment: EdgeCityManualAttendeeIdentity.commitment.toString(),
          timeCreated: edgeCityIssuanceDateTime,
          timeUpdated: edgeCityIssuanceDateTime
        },
        {
          email: EdgeCityManualBouncerEmail,
          commitment: EdgeCityManualBouncerIdentity.commitment.toString(),
          timeCreated: edgeCityIssuanceDateTime,
          timeUpdated: edgeCityIssuanceDateTime
        },
        {
          email: EdgeCityDenverAttendee.email,
          commitment: EdgeCityDenverAttendeeIdentity.commitment.toString(),
          timeCreated: edgeCityIssuanceDateTime,
          timeUpdated: edgeCityIssuanceDateTime
        },
        {
          email: EdgeCityDenverBouncer.email,
          commitment: EdgeCityBouncerIdentity.commitment.toString(),
          timeCreated: edgeCityIssuanceDateTime,
          timeUpdated: edgeCityIssuanceDateTime
        },
        {
          email: EdgeCityDenverBouncer2.email,
          commitment: EdgeCityBouncer2Identity.commitment.toString(),
          timeCreated: edgeCityIssuanceDateTime,
          timeUpdated: edgeCityIssuanceDateTime
        }
      ]);

      await checkPipelineInfoEndpoint(giBackend, edgeCityDenverPipeline);
    }
  );

  step(
    "Lemonade pipeline Semaphore groups contain correct members",
    async function () {
      expectToExist(giService);
      const pipelines = await giService.getAllPipelineInstances();
      expectToExist(pipelines);
      expectLength(pipelines, 1);
      const edgeCityDenverPipeline = pipelines.find(LemonadePipeline.is);
      expectToExist(edgeCityDenverPipeline);

      await giService.performPipelineLoad(edgeCityDenverPipeline.id);

      const semaphoreGroupAll = await requestGenericIssuanceSemaphoreGroup(
        process.env.PASSPORT_SERVER_URL as string,
        edgeCityDenverPipeline.id,
        edgeCitySemaphoreGroupIds.all
      );

      expectTrue(semaphoreGroupAll.success);
      expectLength(semaphoreGroupAll.value.members, 5);
      expect(semaphoreGroupAll.value.members).to.deep.include.members([
        EdgeCityBouncerIdentity.commitment.toString(),
        EdgeCityBouncer2Identity.commitment.toString(),
        EdgeCityDenverAttendeeIdentity.commitment.toString(),
        EdgeCityManualAttendeeIdentity.commitment.toString(),
        EdgeCityManualBouncerIdentity.commitment.toString()
      ]);

      const semaphoreGroupBouncers = await requestGenericIssuanceSemaphoreGroup(
        process.env.PASSPORT_SERVER_URL as string,
        edgeCityDenverPipeline.id,
        edgeCitySemaphoreGroupIds.bouncers
      );

      expectTrue(semaphoreGroupBouncers.success);
      expectLength(semaphoreGroupBouncers.value.members, 2);
      expect(semaphoreGroupBouncers.value.members).to.deep.include.members([
        EdgeCityBouncerIdentity.commitment.toString(),
        EdgeCityManualBouncerIdentity.commitment.toString()
      ]);

      const semaphoreGroupAttendees =
        await requestGenericIssuanceSemaphoreGroup(
          process.env.PASSPORT_SERVER_URL as string,
          edgeCityDenverPipeline.id,
          edgeCitySemaphoreGroupIds.attendees
        );

      expectTrue(semaphoreGroupAttendees.success);
      expectLength(semaphoreGroupAttendees.value.members, 3);
      expect(semaphoreGroupAttendees.value.members).to.deep.include.members([
        EdgeCityDenverAttendeeIdentity.commitment.toString(),
        EdgeCityManualAttendeeIdentity.commitment.toString(),
        // Bouncer2 has a specially configured "superuser email", but is not
        // a holder of a bouncer-tier ticket. Having a "superuser email" allows
        // a user to perform check-ins, but does not change the product type of
        // their ticket, and so does not change their Semaphore group
        // memberships.
        EdgeCityBouncer2Identity.commitment.toString()
      ]);

      const semaphoreGroupAttendeesAndBouncers =
        await requestGenericIssuanceSemaphoreGroup(
          process.env.PASSPORT_SERVER_URL as string,
          edgeCityDenverPipeline.id,
          edgeCitySemaphoreGroupIds.attendeesAndBouncers
        );

      expectTrue(semaphoreGroupAttendeesAndBouncers.success);
      expectLength(semaphoreGroupAttendeesAndBouncers.value.members, 5);
      expect(
        semaphoreGroupAttendeesAndBouncers.value.members
      ).to.deep.include.members([
        EdgeCityBouncerIdentity.commitment.toString(),
        EdgeCityBouncer2Identity.commitment.toString(),
        EdgeCityDenverAttendeeIdentity.commitment.toString(),
        EdgeCityManualAttendeeIdentity.commitment.toString(),
        EdgeCityManualBouncerIdentity.commitment.toString()
      ]);
    }
  );

  step(
    "New users can sign up, get added to group, prove group membership for Lemonade Pipeline",
    async function () {
      expectToExist(giService);
      const pipelines = await giService.getAllPipelineInstances();
      expectToExist(pipelines);
      expectLength(pipelines, 1);
      const edgeCityDenverPipeline = pipelines.find(LemonadePipeline.is);
      expectToExist(edgeCityDenverPipeline);

      // Test that a new user is added to the attendee group
      const newUser = lemonadeBackend.addUser(
        "newuser@example.com",
        "New",
        "User"
      );
      const newUserIdentity = new Identity();
      EdgeCityLemonadeAccount.addUserTicket(
        EdgeCityDenver._id,
        EdgeCityAttendeeTicketType._id,
        newUser._id,
        newUser.name
      );
      await giService.performPipelineLoad(edgeCityDenverPipeline.id);
      const edgeCityDenverTicketFeedUrl =
        edgeCityDenverPipeline.issuanceCapability.feedUrl;
      // The pipeline doesn't know that the user exists until they hit the feed
      const NewUserTickets = await requestTicketsFromPipeline(
        edgeCityDenverPipeline.issuanceCapability.options.feedFolder,
        edgeCityDenverTicketFeedUrl,
        edgeCityDenverPipeline.issuanceCapability.options.feedId,
        ZUPASS_EDDSA_PRIVATE_KEY,
        newUser.email,
        newUserIdentity
      );
      expectLength(NewUserTickets, 1);

      const attendeeGroupResponse = await requestGenericIssuanceSemaphoreGroup(
        process.env.PASSPORT_SERVER_URL as string,
        edgeCityDenverPipeline.id,
        edgeCitySemaphoreGroupIds.attendees
      );

      expectTrue(attendeeGroupResponse.success);
      expectLength(attendeeGroupResponse.value.members, 4);
      expect(attendeeGroupResponse.value.members).to.deep.include.members([
        EdgeCityDenverAttendeeIdentity.commitment.toString(),
        EdgeCityManualAttendeeIdentity.commitment.toString(),
        EdgeCityBouncer2Identity.commitment.toString(),
        newUserIdentity.commitment.toString()
      ]);
      const attendeeGroup = await deserializeSemaphoreGroup(
        attendeeGroupResponse.value
      );

      const attendeesGroupRootResponse =
        await requestGenericIssuanceSemaphoreGroupRoot(
          process.env.PASSPORT_SERVER_URL as string,
          edgeCityDenverPipeline.id,
          edgeCitySemaphoreGroupIds.attendees
        );
      expectTrue(attendeesGroupRootResponse.success);
      expect(attendeesGroupRootResponse.value).to.eq(
        (
          await deserializeSemaphoreGroup(attendeeGroupResponse.value)
        ).root.toString()
      );

      const attendeeGroupValidResponse =
        await requestGenericIssuanceValidSemaphoreGroup(
          process.env.PASSPORT_SERVER_URL as string,
          edgeCityDenverPipeline.id,
          edgeCitySemaphoreGroupIds.attendees,
          attendeeGroup.root.toString()
        );

      expectTrue(attendeeGroupValidResponse.success);
      expectTrue(attendeeGroupValidResponse.value.valid);

      const newUserIdentityPCD = await SemaphoreIdentityPCDPackage.prove({
        identityV3: newUserIdentity
      });

      const groupPCD = await SemaphoreGroupPCDPackage.prove({
        externalNullifier: {
          argumentType: ArgumentTypeName.BigInt,
          value: attendeeGroup.root.toString()
        },
        signal: {
          argumentType: ArgumentTypeName.BigInt,
          value: "1"
        },
        group: {
          argumentType: ArgumentTypeName.Object,
          value: serializeSemaphoreGroup(
            attendeeGroup,
            attendeeGroupResponse.value.name
          )
        },
        identity: {
          argumentType: ArgumentTypeName.PCD,
          pcdType: SemaphoreIdentityPCDPackage.name,
          value: await SemaphoreIdentityPCDPackage.serialize(newUserIdentityPCD)
        }
      });

      expectTrue(await SemaphoreGroupPCDPackage.verify(groupPCD));

      const consumerDB = new PipelineConsumerDB();
      const consumer = (
        await consumerDB.loadByEmails(client, edgeCityPipeline.id, [
          newUser.email
        ])
      )[0];
      expectToExist(consumer);
      const consumerUpdated = consumer.timeUpdated;
      const consumerCreated = consumer.timeCreated;
      expect(consumerCreated.getTime()).to.eq(consumerUpdated.getTime());
      MockDate.set(Date.now() + ONE_MINUTE_MS);

      const changedIdentity = new Identity();
      await requestTicketsFromPipeline(
        edgeCityDenverPipeline.issuanceCapability.options.feedFolder,
        edgeCityDenverTicketFeedUrl,
        edgeCityDenverPipeline.issuanceCapability.options.feedId,
        ZUPASS_EDDSA_PRIVATE_KEY,
        newUser.email,
        // The user has a new identity, which might occur if they reset their
        // Zupass account
        changedIdentity
      );

      {
        const newAttendeeGroupResponse =
          await requestGenericIssuanceSemaphoreGroup(
            process.env.PASSPORT_SERVER_URL as string,
            edgeCityDenverPipeline.id,
            edgeCitySemaphoreGroupIds.attendees
          );

        expectTrue(newAttendeeGroupResponse.success);
        expectLength(newAttendeeGroupResponse.value.members, 5);
        expect(newAttendeeGroupResponse.value.members).to.deep.include.members([
          EdgeCityDenverAttendeeIdentity.commitment.toString(),
          EdgeCityManualAttendeeIdentity.commitment.toString(),
          EdgeCityBouncer2Identity.commitment.toString(),
          changedIdentity.commitment.toString(),
          // The deleted entry is represented by a zeroValue
          newAttendeeGroupResponse.value.zeroValue
        ]);

        const newAttendeeGroup = await deserializeSemaphoreGroup(
          newAttendeeGroupResponse.value
        );
        expect(newAttendeeGroup.root).to.not.eq(attendeeGroup.root.toString());

        // Requesting the root hash for the group should give us the new root
        const newAttendeeGroupRootResponse =
          await requestGenericIssuanceSemaphoreGroupRoot(
            process.env.PASSPORT_SERVER_URL as string,
            edgeCityDenverPipeline.id,
            edgeCitySemaphoreGroupIds.attendees
          );

        expectTrue(newAttendeeGroupRootResponse.success);
        expect(newAttendeeGroupRootResponse.value).to.eq(
          newAttendeeGroup.root.toString()
        );

        const newAttendeeGroupValidResponse =
          await requestGenericIssuanceValidSemaphoreGroup(
            process.env.PASSPORT_SERVER_URL as string,
            edgeCityDenverPipeline.id,
            edgeCitySemaphoreGroupIds.attendees,
            newAttendeeGroup.root.toString()
          );

        expectTrue(newAttendeeGroupValidResponse.success);
        expectTrue(newAttendeeGroupValidResponse.value.valid);

        // We should be able to get the old values for the group by providing
        // the root hash.
        const historicalGroupResponse =
          await requestGenericIssuanceHistoricalSemaphoreGroup(
            process.env.PASSPORT_SERVER_URL as string,
            edgeCityDenverPipeline.id,
            edgeCitySemaphoreGroupIds.attendees,
            attendeeGroup.root.toString()
          );

        expectTrue(historicalGroupResponse.success);
        expect(historicalGroupResponse.value.members).to.deep.eq(
          attendeeGroupResponse.value.members
        );

        const newUserIdentityPCD = await SemaphoreIdentityPCDPackage.prove({
          identityV3: changedIdentity // Use the changed identity
        });

        const groupPCD = await SemaphoreGroupPCDPackage.prove({
          externalNullifier: {
            argumentType: ArgumentTypeName.BigInt,
            value: newAttendeeGroup.root.toString()
          },
          signal: {
            argumentType: ArgumentTypeName.BigInt,
            value: "1"
          },
          group: {
            argumentType: ArgumentTypeName.Object,
            value: serializeSemaphoreGroup(
              newAttendeeGroup,
              newAttendeeGroupResponse.value.name
            )
          },
          identity: {
            argumentType: ArgumentTypeName.PCD,
            pcdType: SemaphoreIdentityPCDPackage.name,
            value:
              await SemaphoreIdentityPCDPackage.serialize(newUserIdentityPCD)
          }
        });

        expectTrue(await SemaphoreGroupPCDPackage.verify(groupPCD));
      }

      const consumerAfterChange = (
        await consumerDB.loadByEmails(client, edgeCityDenverPipeline.id, [
          newUser.email
        ])
      )[0];
      const consumerUpdatedAfterChange = consumerAfterChange.timeUpdated;
      const consumerCreatedAfterChange = consumerAfterChange.timeCreated;

      // Consumer update occurred now
      expect(consumerUpdatedAfterChange.getTime()).to.eq(Date.now());
      // Creation time should never change
      expect(consumerCreatedAfterChange.getTime()).to.eq(
        consumerCreated.getTime()
      );
      // Update time should be later than creation time now
      expect(consumerUpdatedAfterChange.getTime()).to.be.greaterThan(
        consumerCreated.getTime()
      );
      // Update time should be later than original update time
      expect(consumerUpdatedAfterChange.getTime()).to.be.greaterThan(
        consumerUpdated.getTime()
      );
    }
  );

  step(
    "Lemonade API will request new token when old one expires",
    async function () {
      // Because we initialized the LemonadeAPI with a TestTokenSource, we can
      // track when LemonadeAPI refreshes its token. TestTokenSource returns an
      // expiry time of Date.now() + ONE_DAY_MS, so advancing the clock beyond
      // one day should trigger a new token refresh.
      lemonadeTokenSource.called = 0;

      const credentials: LemonadeOAuthCredentials = {
        oauthClientId: lemonadeOAuthClientId,
        oauthAudience: "new-credentials",
        oauthClientSecret: "new-credentials",
        oauthServerUrl: "new-credentials"
      };

      await lemonadeAPI.getTickets(
        lemonadeBackendUrl,
        credentials,
        EdgeCityDenver._id
      );

      expect(lemonadeTokenSource.called).to.eq(1);

      MockDate.set(Date.now() + ONE_DAY_MS + 1);

      await lemonadeAPI.getTickets(
        lemonadeBackendUrl,
        credentials,
        EdgeCityDenver._id
      );

      expect(lemonadeTokenSource.called).to.eq(2);

      // Since no time has elapsed since the last request, this request will
      // not require a new token.
      await lemonadeAPI.getTickets(
        lemonadeBackendUrl,
        credentials,
        EdgeCityDenver._id
      );

      expect(lemonadeTokenSource.called).to.eq(2);

      // Simulate an authorization failure, which will cause a new token to be
      // requested.
      mockServer.use(
        rest.post(
          urljoin(lemonadeBackendUrl, "/event/:eventId/export/tickets"),
          (req, res, ctx) => {
            // Calling .once() means that only the first request will be
            // handled. So, the first time we request tickets, we get a 401
            // and this will cause LemonadeAPI to get a new token. The next
            // request will go to the default mock handler, which will succeed.
            return res.once(ctx.status(401, "Unauthorized"));
          }
        )
      );

      await lemonadeAPI.getTickets(
        lemonadeBackendUrl,
        credentials,
        EdgeCityDenver._id
      );
      // We should have seen one more token request
      expect(lemonadeTokenSource.called).to.eq(3);
    }
  );

  step(
    "Lemonade tickets without user emails should be loaded",
    async function () {
      mockServer.use(
        unregisteredLemonadeUserHandler(lemonadeBackend, lemonadeBackendUrl)
      );

      expectToExist(giService);
      const pipelines = await giService.getAllPipelineInstances();
      const pipeline = pipelines.find(LemonadePipeline.is);
      expectToExist(pipeline);
      expect(pipeline.id).to.eq(edgeCityPipeline.id);
      const runInfo = await giService.performPipelineLoad(pipeline.id);

      // The ticket should be loaded
      expect(runInfo.atomsLoaded).to.eq(1);
    }
  );

  step(
    "Mix of valid and invalid Lemonade tickets results in only valid ones being accepted",
    async function () {
      expectToExist(giService);
      const pipelines = await giService.getAllPipelineInstances();
      const pipeline = pipelines.find(LemonadePipeline.is);
      expectToExist(pipeline);
      expect(pipeline.id).to.eq(edgeCityPipeline.id);

      {
        // Two valid tickets
        const tickets: LemonadeTicket[] = [
          EdgeCityAttendeeTicket,
          EdgeCityDenverBouncerTicket
        ];
        mockServer.use(
          customLemonadeTicketHandler(lemonadeBackendUrl, tickets)
        );

        const runInfo = await giService.performPipelineLoad(pipeline.id);

        // Both tickets should have been loaded
        expect(runInfo.atomsLoaded).to.eq(2);
        // Expect no errors to have been logged
        expectLength(
          runInfo.latestLogs.filter(
            (log) => log.level === PipelineLogLevel.Error
          ),
          0
        );
      }

      {
        // One valid ticket and one invalid ticket
        const tickets: LemonadeTicket[] = [
          EdgeCityAttendeeTicket,
          // Empty type ID is not valid
          {
            ...EdgeCityDenverBouncerTicket,
            _id: undefined as unknown as string
          }
        ];
        mockServer.use(
          customLemonadeTicketHandler(lemonadeBackendUrl, tickets)
        );

        const runInfo = await giService.performPipelineLoad(pipeline.id);
        // Despite receiving two tickets, only one should be parsed and saved
        expect(runInfo.atomsLoaded).to.eq(1);
        // Expect one error to have been logged
        expectLength(
          runInfo.latestLogs.filter(
            (log) => log.level === PipelineLogLevel.Error
          ),
          1
        );
      }
    }
  );

  step(
    "invalid or expired credentials cannot be used for actions or feeds",
    async () => {
      expectToExist(giService);
      const pipelines = await giService.getAllPipelineInstances();
      const pipeline = pipelines.find(LemonadePipeline.is);
      expectToExist(pipeline);
      expect(pipeline.id).to.eq(edgeCityPipeline.id);
      const edgeCityTicketFeedUrl = pipeline.issuanceCapability.feedUrl;

      lemonadeBackend.checkOutAll();

      // Verify that bouncer is checked out in backend
      await giService.performPipelineLoad(pipeline.id);
      const bouncerTickets = await requestTicketsFromPipeline(
        pipeline.issuanceCapability.options.feedFolder,
        edgeCityTicketFeedUrl,
        pipeline.issuanceCapability.options.feedId,
        ZUPASS_EDDSA_PRIVATE_KEY,
        EdgeCityDenverBouncer.email,
        EdgeCityBouncerIdentity
      );
      expectLength(bouncerTickets, 1);
      const bouncerTicket = bouncerTickets[0];
      expectToExist(bouncerTicket);
      expectIsEdDSATicketPCD(bouncerTicket);
      expect(bouncerTicket.claim.ticket.attendeeEmail).to.eq(
        EdgeCityDenverBouncer.email
      );
      // Bouncer ticket is checked out
      expect(bouncerTicket.claim.ticket.isConsumed).to.eq(false);

      const edgeCityCheckinRoute = pipeline.checkinCapability.getCheckinUrl();

      const badEmailPCD = await proveEmailPCD(
        EdgeCityDenverBouncer.email,
        // Not the Zupass private key!
        newEdDSAPrivateKey(),
        EdgeCityBouncerIdentity
      );
      const goodEmailPCD = await proveEmailPCD(
        EdgeCityDenverBouncer.email,
        ZUPASS_EDDSA_PRIVATE_KEY,
        EdgeCityBouncerIdentity
      );
      const badEmailCredential = await signCredentialPayload(
        EdgeCityBouncerIdentity,
        createCredentialPayload(await EmailPCDPackage.serialize(badEmailPCD))
      );
      const mismatchedIdentityCredential = await signCredentialPayload(
        // Semaphore identity is different from that used by the Email PCD
        new Identity(),
        createCredentialPayload(await EmailPCDPackage.serialize(goodEmailPCD))
      );
      MockDate.set(Date.now() - ONE_DAY_MS);
      const expiredCredential = await signCredentialPayload(
        EdgeCityBouncerIdentity,
        createCredentialPayload(await EmailPCDPackage.serialize(goodEmailPCD))
      );
      MockDate.set(Date.now() + ONE_DAY_MS);

      {
        const result = await requestPodboxTicketAction(
          edgeCityCheckinRoute,
          badEmailCredential,
          {
            checkin: true
          },
          bouncerTicket.claim.ticket.ticketId,
          bouncerTicket.claim.ticket.eventId
        );

        expectTrue(result.success);
        expectFalse(result.value.success);
        expect(result.value.error.name).to.eq("InvalidSignature");
      }

      {
        const result = await requestPodboxTicketAction(
          edgeCityCheckinRoute,
          mismatchedIdentityCredential,
          {
            checkin: true
          },
          bouncerTicket.claim.ticket.ticketId,
          bouncerTicket.claim.ticket.eventId
        );

        expectTrue(result.success);
        expectFalse(result.value.success);
        expect(result.value.error.name).to.eq("InvalidSignature");
      }

      {
        const result = await requestPodboxTicketAction(
          edgeCityCheckinRoute,
          expiredCredential,
          {
            checkin: true
          },
          bouncerTicket.claim.ticket.ticketId,
          bouncerTicket.claim.ticket.eventId
        );

        expectTrue(result.success);
        expectFalse(result.value.success);
        expect(result.value.error.name).to.eq("InvalidSignature");
      }
    }
  );

  step("Authenticated Generic Issuance Endpoints", async () => {
    expectToExist(giService);
    const pipelines = await giService.getAllPipelineInstances();
    expectToExist(pipelines);
    expectLength(pipelines, 1);
    const edgeCityDenverPipeline = pipelines.find(LemonadePipeline.is);
    expectToExist(edgeCityDenverPipeline);
  });

  this.afterAll(async () => {
    await stopApplication(giBackend);
    mockServer.close();
  });
});
