import { getEdDSAPublicKey, newEdDSAPrivateKey } from "@pcd/eddsa-pcd";
import { expectIsEdDSATicketPCD } from "@pcd/eddsa-ticket-pcd";
import { EmailPCDPackage } from "@pcd/email-pcd";
import {
  PipelineLogLevel,
  PodboxTicketActionResponseValue,
  PretixPipelineDefinition,
  createCredentialPayload,
  requestGenericIssuanceSemaphoreGroup,
  requestPodboxTicketAction
} from "@pcd/passport-interface";
import { expectIsPODTicketPCD } from "@pcd/pod-ticket-pcd";
import { ONE_DAY_MS, ONE_SECOND_MS } from "@pcd/util";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import "mocha";
import { step } from "mocha-steps";
import * as MockDate from "mockdate";
import { Pool, PoolClient } from "postgres-pool";
import { stopApplication } from "../../../../src/application";
import { PipelineCheckinDB } from "../../../../src/database/queries/pipelineCheckinDB";
import { PipelineConsumerDB } from "../../../../src/database/queries/pipelineConsumerDB";
import { PipelineDefinitionDB } from "../../../../src/database/queries/pipelineDefinitionDB";
import { PipelineUserDB } from "../../../../src/database/queries/pipelineUserDB";
import { GenericIssuanceService } from "../../../../src/services/generic-issuance/GenericIssuanceService";
import {
  PRETIX_CHECKER,
  PretixPipeline
} from "../../../../src/services/generic-issuance/pipelines/PretixPipeline";
import { PipelineUser } from "../../../../src/services/generic-issuance/pipelines/types";
import { Zupass } from "../../../../src/types";
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
import { setupTestPretixPipeline } from "./setupTestPretixPipeline";

/**
 * Tests for {@link GenericIssuanceService}, in particular the {@link PretixPipeline}.
 */
describe("generic issuance - PretixPipeline with semaphore v4 enabled", function () {
  const nowDate = new Date();
  const now = Date.now();

  let ZUPASS_EDDSA_PRIVATE_KEY: string;
  let giBackend: Zupass;
  let giService: GenericIssuanceService;

  let client: PoolClient;
  let pool: Pool;

  const {
    adminGIUserId,
    adminGIUserEmail,
    ethLatAmGIUserID,
    ethLatAmGIUserEmail,
    EthLatAmBouncerIdentity,
    EthLatAmAttendeeIdentity,
    EthLatAmManualAttendeeIdentity,
    EthLatAmManualAttendeeEmail,
    EthLatAmManualBouncerIdentity,
    EthLatAmManualBouncerEmail,
    EthLatAmImageUrl,
    mockServer,
    pretixBackend,
    ethLatAmPretixOrganizer,
    ethLatAmEvent,
    ethLatAmPipeline,
    ethLatAmSemaphoreGroupIds
  } = setupTestPretixPipeline(true);

  const pipelineDefinitions = [ethLatAmPipeline];

  /**
   * Sets up a Zupass/Generic issuance backend with one pipeline:
   * - {@link PretixPipeline}, as defined by {@link setupTestPretixPipeline}
   */
  this.beforeAll(async () => {
    const zupassPublicKey = JSON.stringify(
      await getEdDSAPublicKey(testingEnv.SERVER_EDDSA_PRIVATE_KEY as string)
    );

    await overrideEnvironment({
      GENERIC_ISSUANCE_ZUPASS_PUBLIC_KEY: zupassPublicKey,
      ...testingEnv
    });

    giBackend = await startTestingApp({});

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

    const ethLatAmGIUser: PipelineUser = {
      id: ethLatAmGIUserID,
      email: ethLatAmGIUserEmail,
      isAdmin: false,
      timeCreated: nowDate,
      timeUpdated: nowDate
    };
    await userDB.updateUserById(client, ethLatAmGIUser);
    assertUserMatches(
      {
        id: ethLatAmGIUserID,
        email: ethLatAmGIUserEmail,
        isAdmin: false,
        timeCreated: nowDate,
        timeUpdated: nowDate
      },
      await userDB.getUserById(client, ethLatAmGIUser.id)
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
   * Test for {@link PretixPipeline} for Eth LatAm.
   */
  step(
    "PretixPipeline issuance and checkin and PipelineInfo for Eth LatAm",
    async () => {
      expectToExist(giService);
      const pipelines = await giService.getAllPipelineInstances();
      expectToExist(pipelines);
      expectLength(pipelines, 1);
      const pipeline = pipelines.find(PretixPipeline.is);
      expectToExist(pipeline);
      expect(pipeline.id).to.eq(ethLatAmPipeline.id);
      const ethLatAmTicketFeedUrl = pipeline.issuanceCapability.feedUrl;
      const ethLatAmIssuanceDateTime = new Date();
      const attendeeTickets = await requestTicketsFromPipeline(
        pipeline.issuanceCapability.options.feedFolder,
        ethLatAmTicketFeedUrl,
        pipeline.issuanceCapability.options.feedId,
        ZUPASS_EDDSA_PRIVATE_KEY,
        pretixBackend.get().ethLatAmOrganizer.ethLatAmAttendeeEmail,
        EthLatAmAttendeeIdentity,
        true
      );
      expectLength(
        attendeeTickets.map((t) => t.claim.ticket.attendeeEmail),
        2
      );
      const attendeeTicket = attendeeTickets[0];
      expectToExist(attendeeTicket);
      expectIsEdDSATicketPCD(attendeeTicket);
      expect(attendeeTicket.claim.ticket.attendeeEmail).to.eq(
        pretixBackend.get().ethLatAmOrganizer.ethLatAmAttendeeEmail
      );
      expect(attendeeTicket.claim.ticket.attendeeName).to.eq(
        pretixBackend.get().ethLatAmOrganizer.ethLatAmAttendeeName
      );

      const attendeePODTicket = attendeeTickets[1];
      expectToExist(attendeePODTicket);
      expectIsPODTicketPCD(attendeePODTicket);
      expect(attendeePODTicket.claim.ticket.attendeeEmail).to.eq(
        pretixBackend.get().ethLatAmOrganizer.ethLatAmAttendeeEmail
      );
      expect(attendeePODTicket.claim.ticket.attendeeName).to.eq(
        pretixBackend.get().ethLatAmOrganizer.ethLatAmAttendeeName
      );

      const bouncerTickets = await requestTicketsFromPipeline(
        pipeline.issuanceCapability.options.feedFolder,
        ethLatAmTicketFeedUrl,
        pipeline.issuanceCapability.options.feedId,
        ZUPASS_EDDSA_PRIVATE_KEY,
        pretixBackend.get().ethLatAmOrganizer.ethLatAmBouncerEmail,
        EthLatAmBouncerIdentity,
        true
      );
      expectLength(bouncerTickets, 2);
      const bouncerTicket = bouncerTickets[0];
      expectToExist(bouncerTicket);
      expectIsEdDSATicketPCD(bouncerTicket);
      expect(bouncerTicket.claim.ticket.attendeeEmail).to.eq(
        pretixBackend.get().ethLatAmOrganizer.ethLatAmBouncerEmail
      );
      expect(bouncerTicket.claim.ticket.attendeeName).to.eq(
        pretixBackend.get().ethLatAmOrganizer.ethLatAmBouncerName
      );
      const bouncerPODTicket = bouncerTickets[1];
      expectToExist(bouncerPODTicket);
      expectIsPODTicketPCD(bouncerPODTicket);
      expect(bouncerPODTicket.claim.ticket.attendeeEmail).to.eq(
        pretixBackend.get().ethLatAmOrganizer.ethLatAmBouncerEmail
      );
      expect(bouncerPODTicket.claim.ticket.attendeeName).to.eq(
        pretixBackend.get().ethLatAmOrganizer.ethLatAmBouncerName
      );

      const ethLatAmCheckinRoute = pipeline.checkinCapability.getCheckinUrl();

      const bouncerCheckInBouncer = await requestCheckInPipelineTicket(
        ethLatAmCheckinRoute,
        ZUPASS_EDDSA_PRIVATE_KEY,
        bouncerTicket.claim.ticket.attendeeEmail,
        EthLatAmBouncerIdentity,
        bouncerTicket
      );
      expect(bouncerCheckInBouncer.value).to.deep.eq({ success: true });

      // can't check in a ticket that's already checked in
      const bouncerCheckInBouncerAgain = await requestCheckInPipelineTicket(
        ethLatAmCheckinRoute,
        ZUPASS_EDDSA_PRIVATE_KEY,
        bouncerTicket.claim.ticket.attendeeEmail,
        EthLatAmBouncerIdentity,
        bouncerTicket
      );
      expect(bouncerCheckInBouncerAgain.value).to.deep.contain({
        success: false
      });

      // can't check in a ticket using a ticket that isn't a superuser ticket
      const attendeeCheckInBouncerResult = await requestCheckInPipelineTicket(
        ethLatAmCheckinRoute,
        ZUPASS_EDDSA_PRIVATE_KEY,
        attendeeTicket.claim.ticket.attendeeEmail,
        EthLatAmAttendeeIdentity,
        bouncerTicket
      );

      expect(attendeeCheckInBouncerResult.value).to.deep.eq({
        success: false,
        error: { name: "NotSuperuser" }
      } satisfies PodboxTicketActionResponseValue);

      // can't check in a ticket with an email PCD signed by a non-Zupass private key
      const fakeBouncerCheckInBouncerResult =
        await requestCheckInPipelineTicket(
          ethLatAmCheckinRoute,
          newEdDSAPrivateKey(),
          attendeeTicket.claim.ticket.attendeeEmail,
          EthLatAmAttendeeIdentity,
          bouncerTicket
        );
      expect(fakeBouncerCheckInBouncerResult.value).to.deep.eq({
        success: false,
        error: { name: "InvalidSignature" }
      } satisfies PodboxTicketActionResponseValue);

      const ManualAttendeeTickets = await requestTicketsFromPipeline(
        pipeline.issuanceCapability.options.feedFolder,
        ethLatAmTicketFeedUrl,
        pipeline.issuanceCapability.options.feedId,
        ZUPASS_EDDSA_PRIVATE_KEY,
        EthLatAmManualAttendeeEmail,
        EthLatAmManualAttendeeIdentity,
        true
      );
      expectLength(ManualAttendeeTickets, 2);
      const ManualAttendeeTicket = ManualAttendeeTickets[0];
      expectIsEdDSATicketPCD(ManualAttendeeTicket);
      expect(ManualAttendeeTicket.claim.ticket.attendeeEmail).to.eq(
        EthLatAmManualAttendeeEmail
      );
      const ManualAttendeePODTicket = ManualAttendeeTickets[1];
      expectIsPODTicketPCD(ManualAttendeePODTicket);
      expect(ManualAttendeePODTicket.claim.ticket.attendeeEmail).to.eq(
        EthLatAmManualAttendeeEmail
      );

      const ManualBouncerTickets = await requestTicketsFromPipeline(
        pipeline.issuanceCapability.options.feedFolder,
        ethLatAmTicketFeedUrl,
        pipeline.issuanceCapability.options.feedId,
        ZUPASS_EDDSA_PRIVATE_KEY,
        EthLatAmManualBouncerEmail,
        EthLatAmManualBouncerIdentity,
        true
      );
      expectLength(ManualBouncerTickets, 2);
      const ManualBouncerTicket = ManualBouncerTickets[0];
      expectIsEdDSATicketPCD(ManualBouncerTicket);
      expect(ManualBouncerTicket.claim.ticket.attendeeEmail).to.eq(
        EthLatAmManualBouncerEmail
      );
      expect(ManualBouncerTicket.claim.ticket.imageUrl).to.be.undefined;

      const ManualBouncerPODTicket = ManualBouncerTickets[1];
      expectIsPODTicketPCD(ManualBouncerPODTicket);
      expect(ManualBouncerPODTicket.claim.ticket.attendeeEmail).to.eq(
        EthLatAmManualBouncerEmail
      );
      expect(ManualBouncerPODTicket.claim.ticket.imageUrl).to.be.undefined;

      pretixBackend.checkOut(
        ethLatAmPretixOrganizer.orgUrl,
        ethLatAmEvent.slug,
        bouncerTicket.claim.ticket.attendeeEmail
      );
      MockDate.set(Date.now() + ONE_SECOND_MS);
      await pipeline.load();

      const manualBouncerChecksInManualAttendee =
        await requestCheckInPipelineTicket(
          pipeline.checkinCapability.getCheckinUrl(),
          ZUPASS_EDDSA_PRIVATE_KEY,
          EthLatAmManualBouncerEmail,
          EthLatAmManualBouncerIdentity,
          ManualAttendeeTicket
        );
      expect(manualBouncerChecksInManualAttendee.value).to.deep.eq({
        success: true
      });

      {
        const ManualAttendeeTickets = await requestTicketsFromPipeline(
          pipeline.issuanceCapability.options.feedFolder,
          ethLatAmTicketFeedUrl,
          pipeline.issuanceCapability.options.feedId,
          ZUPASS_EDDSA_PRIVATE_KEY,
          EthLatAmManualAttendeeEmail,
          EthLatAmManualAttendeeIdentity,
          true
        );
        expectLength(ManualAttendeeTickets, 2);
        const ManualAttendeeTicket = ManualAttendeeTickets[0];
        expectIsEdDSATicketPCD(ManualAttendeeTicket);
        expect(ManualAttendeeTicket.claim.ticket.attendeeEmail).to.eq(
          EthLatAmManualAttendeeEmail
        );
        expect(ManualAttendeeTicket.claim.ticket.isConsumed).to.eq(true);
        expect(ManualAttendeeTicket.claim.ticket.imageUrl).to.eq(
          EthLatAmImageUrl
        );
        expect(ManualAttendeeTicket.claim.ticket.timestampConsumed).to.eq(
          Date.now()
        );
        const ManualAttendeePODTicket = ManualAttendeeTickets[1];
        expectIsPODTicketPCD(ManualAttendeePODTicket);
        expect(ManualAttendeePODTicket.claim.ticket.attendeeEmail).to.eq(
          EthLatAmManualAttendeeEmail
        );
        expect(ManualAttendeePODTicket.claim.ticket.isConsumed).to.eq(true);
        expect(ManualAttendeePODTicket.claim.ticket.imageUrl).to.eq(
          EthLatAmImageUrl
        );
        expect(ManualAttendeePODTicket.claim.ticket.timestampConsumed).to.eq(
          Date.now()
        );
      }

      const manualBouncerChecksInManualAttendeeAgain =
        await requestCheckInPipelineTicket(
          pipeline.checkinCapability.getCheckinUrl(),
          ZUPASS_EDDSA_PRIVATE_KEY,
          EthLatAmManualBouncerEmail,
          EthLatAmManualBouncerIdentity,
          ManualAttendeeTicket
        );
      expect(manualBouncerChecksInManualAttendeeAgain.value).to.deep.eq({
        success: false,
        error: {
          name: "AlreadyCheckedIn",
          checkinTimestamp: new Date().toISOString(),
          checker: PRETIX_CHECKER
        }
      } satisfies PodboxTicketActionResponseValue);

      const manualAttendeeChecksInManualBouncer =
        await requestCheckInPipelineTicket(
          pipeline.checkinCapability.getCheckinUrl(),
          ZUPASS_EDDSA_PRIVATE_KEY,
          EthLatAmManualAttendeeEmail,
          EthLatAmManualAttendeeIdentity,
          ManualBouncerTicket
        );
      expect(manualAttendeeChecksInManualBouncer.value).to.deep.eq({
        success: false,
        error: { name: "NotSuperuser" }
      } satisfies PodboxTicketActionResponseValue);

      // Verify that consumers were saved for each user who requested tickets
      const consumerDB = new PipelineConsumerDB();
      const consumers = await consumerDB.loadByEmails(
        client,
        ethLatAmPipeline.id,
        [
          EthLatAmManualAttendeeEmail,
          EthLatAmManualBouncerEmail,
          pretixBackend.get().ethLatAmOrganizer.ethLatAmAttendeeEmail,
          pretixBackend.get().ethLatAmOrganizer.ethLatAmBouncerEmail
        ]
      );
      expectLength(consumers, 4);
      expect(consumers).to.deep.include.members([
        {
          email: EthLatAmManualAttendeeEmail,
          commitment: EthLatAmManualAttendeeIdentity.commitment.toString(),
          timeCreated: ethLatAmIssuanceDateTime,
          timeUpdated: ethLatAmIssuanceDateTime
        },
        {
          email: EthLatAmManualBouncerEmail,
          commitment: EthLatAmManualBouncerIdentity.commitment.toString(),
          timeCreated: ethLatAmIssuanceDateTime,
          timeUpdated: ethLatAmIssuanceDateTime
        },
        {
          email: pretixBackend.get().ethLatAmOrganizer.ethLatAmAttendeeEmail,
          commitment: EthLatAmAttendeeIdentity.commitment.toString(),
          timeCreated: ethLatAmIssuanceDateTime,
          timeUpdated: ethLatAmIssuanceDateTime
        },
        {
          email: pretixBackend.get().ethLatAmOrganizer.ethLatAmBouncerEmail,
          commitment: EthLatAmBouncerIdentity.commitment.toString(),
          timeCreated: ethLatAmIssuanceDateTime,
          timeUpdated: ethLatAmIssuanceDateTime
        }
      ]);

      await checkPipelineInfoEndpoint(giBackend, pipeline);
    }
  );

  step(
    "Pretix pipeline Semaphore groups contain correct members",
    async function () {
      expectToExist(giService);
      const pipelines = await giService.getAllPipelineInstances();
      expectToExist(pipelines);
      expectLength(pipelines, 1);
      const ethLatAmPipeline = pipelines.find(PretixPipeline.is);
      expectToExist(ethLatAmPipeline);

      await ethLatAmPipeline.load();

      const semaphoreGroupAll = await requestGenericIssuanceSemaphoreGroup(
        process.env.PASSPORT_SERVER_URL as string,
        ethLatAmPipeline.id,
        ethLatAmSemaphoreGroupIds.all
      );
      expectTrue(semaphoreGroupAll.success);
      expectLength(semaphoreGroupAll.value.members, 4);
      expect(semaphoreGroupAll.value.members).to.deep.include.members([
        EthLatAmBouncerIdentity.commitment.toString(),
        EthLatAmAttendeeIdentity.commitment.toString(),
        EthLatAmManualAttendeeIdentity.commitment.toString(),
        EthLatAmManualBouncerIdentity.commitment.toString()
      ]);

      const semaphoreGroupBouncers = await requestGenericIssuanceSemaphoreGroup(
        process.env.PASSPORT_SERVER_URL as string,
        ethLatAmPipeline.id,
        ethLatAmSemaphoreGroupIds.bouncers
      );

      expectTrue(semaphoreGroupBouncers.success);
      expectLength(semaphoreGroupBouncers.value.members, 2);
      expect(semaphoreGroupBouncers.value.members).to.deep.include.members([
        EthLatAmBouncerIdentity.commitment.toString(),
        EthLatAmManualBouncerIdentity.commitment.toString()
      ]);

      const semaphoreGroupAttendees =
        await requestGenericIssuanceSemaphoreGroup(
          process.env.PASSPORT_SERVER_URL as string,
          ethLatAmPipeline.id,
          ethLatAmSemaphoreGroupIds.attendees
        );

      expectTrue(semaphoreGroupAttendees.success);
      expectLength(semaphoreGroupAttendees.value.members, 2);
      expect(semaphoreGroupAttendees.value.members).to.deep.include.members([
        EthLatAmAttendeeIdentity.commitment.toString(),
        EthLatAmManualAttendeeIdentity.commitment.toString()
      ]);

      const semaphoreGroupAttendeesAndBouncers =
        await requestGenericIssuanceSemaphoreGroup(
          process.env.PASSPORT_SERVER_URL as string,
          ethLatAmPipeline.id,
          ethLatAmSemaphoreGroupIds.attendeesAndBouncers
        );

      expectTrue(semaphoreGroupAttendeesAndBouncers.success);
      expectLength(semaphoreGroupAttendeesAndBouncers.value.members, 4);
      expect(
        semaphoreGroupAttendeesAndBouncers.value.members
      ).to.deep.include.members([
        EthLatAmBouncerIdentity.commitment.toString(),
        EthLatAmAttendeeIdentity.commitment.toString(),
        EthLatAmManualAttendeeIdentity.commitment.toString(),
        EthLatAmManualBouncerIdentity.commitment.toString()
      ]);
    }
  );

  step("check-ins for deleted manual tickets are removed", async function () {
    expectToExist(giService);

    const checkinDB = new PipelineCheckinDB();
    const checkins = await checkinDB.getByPipelineId(
      client,
      ethLatAmPipeline.id
    );
    // Manual attendee ticket was checked in
    expectLength(checkins, 1);

    const userDB = new PipelineUserDB();
    const adminUser = await userDB.getUserById(client, adminGIUserId);
    expectToExist(adminUser);

    // Delete the manual tickets from the definition
    const latestPipeline = (await giService.getPipeline(
      client,
      ethLatAmPipeline.id
    )) as PretixPipelineDefinition;
    const newPipelineDefinition = structuredClone(latestPipeline);
    newPipelineDefinition.options.manualTickets = [];
    // Update the definition
    const { restartPromise } = await giService.upsertPipelineDefinition(
      client,
      adminUser,
      newPipelineDefinition
    );
    // On restart, the pipeline will delete the orphaned checkins
    await restartPromise;

    // Find the running pipeline
    const pipelines = await giService.getAllPipelineInstances();
    expectToExist(pipelines);
    expectLength(pipelines, 1);
    const pipeline = pipelines.find(PretixPipeline.is);
    expectToExist(pipeline);
    expect(pipeline.id).to.eq(newPipelineDefinition.id);
    // Verify that there are no checkins in the DB now
    {
      const checkins = await checkinDB.getByPipelineId(
        client,
        ethLatAmPipeline.id
      );
      // no checkins are found as the tickets have been deleted
      expectLength(checkins, 0);
    }
  });

  step("check-in and remote check-out works in Pretix", async function () {
    expectToExist(giService);
    const pipelines = await giService.getAllPipelineInstances();
    const pipeline = pipelines.find(PretixPipeline.is);
    expectToExist(pipeline);
    expect(pipeline.id).to.eq(ethLatAmPipeline.id);
    const ethLatAmTicketFeedUrl = pipeline.issuanceCapability.feedUrl;

    // Ensure that bouncer is checked out
    pretixBackend.checkOut(
      ethLatAmPretixOrganizer.orgUrl,
      "eth-lat-am",
      pretixBackend.get().ethLatAmOrganizer.ethLatAmBouncerEmail
    );
    MockDate.set(Date.now() + ONE_SECOND_MS);
    // Verify that bouncer is checked out in backend
    await pipeline.load();
    const bouncerTickets = await requestTicketsFromPipeline(
      pipeline.issuanceCapability.options.feedFolder,
      ethLatAmTicketFeedUrl,
      pipeline.issuanceCapability.options.feedId,
      ZUPASS_EDDSA_PRIVATE_KEY,
      pretixBackend.get().ethLatAmOrganizer.ethLatAmBouncerEmail,
      EthLatAmBouncerIdentity,
      true
    );
    expectLength(bouncerTickets, 2);
    const bouncerTicket = bouncerTickets[0];
    expectToExist(bouncerTicket);
    expectIsEdDSATicketPCD(bouncerTicket);
    expect(bouncerTicket.claim.ticket.attendeeEmail).to.eq(
      pretixBackend.get().ethLatAmOrganizer.ethLatAmBouncerEmail
    );
    // Bouncer ticket is checked out
    expect(bouncerTicket.claim.ticket.isConsumed).to.eq(false);
    expect(bouncerTicket.claim.ticket.imageUrl).to.be.undefined;

    const bouncerPODTicket = bouncerTickets[1];
    expectToExist(bouncerPODTicket);
    expectIsPODTicketPCD(bouncerPODTicket);
    expect(bouncerPODTicket.claim.ticket.attendeeEmail).to.eq(
      pretixBackend.get().ethLatAmOrganizer.ethLatAmBouncerEmail
    );
    // Bouncer ticket is checked out
    expect(bouncerPODTicket.claim.ticket.isConsumed).to.eq(false);
    expect(bouncerPODTicket.claim.ticket.imageUrl).to.be.undefined;

    // Now check the bouncer in
    const ethLatAmCheckinRoute = pipeline.checkinCapability.getCheckinUrl();

    const bouncerCheckInBouncer = await requestCheckInPipelineTicket(
      ethLatAmCheckinRoute,
      ZUPASS_EDDSA_PRIVATE_KEY,
      bouncerTicket.claim.ticket.attendeeEmail,
      EthLatAmBouncerIdentity,
      bouncerTicket
    );
    expect(bouncerCheckInBouncer.value).to.deep.eq({ success: true });
    const checkinTimestamp = Date.now();
    MockDate.set(Date.now() + ONE_SECOND_MS);

    // Reload the pipeline
    await pipeline.load();
    {
      // Get updated tickets from feed
      const bouncerTickets = await requestTicketsFromPipeline(
        pipeline.issuanceCapability.options.feedFolder,
        ethLatAmTicketFeedUrl,
        pipeline.issuanceCapability.options.feedId,
        ZUPASS_EDDSA_PRIVATE_KEY,
        pretixBackend.get().ethLatAmOrganizer.ethLatAmBouncerEmail,
        EthLatAmBouncerIdentity,
        true
      );
      expectLength(bouncerTickets, 2);
      const bouncerTicket = bouncerTickets[0];
      expectToExist(bouncerTicket);
      expectIsEdDSATicketPCD(bouncerTicket);
      expect(bouncerTicket.claim.ticket.attendeeEmail).to.eq(
        pretixBackend.get().ethLatAmOrganizer.ethLatAmBouncerEmail
      );
      // User is now checked in
      expect(bouncerTicket.claim.ticket.isConsumed).to.eq(true);

      const bouncerPODTicket = bouncerTickets[1];
      expectToExist(bouncerPODTicket);
      expectIsPODTicketPCD(bouncerPODTicket);
      expect(bouncerPODTicket.claim.ticket.attendeeEmail).to.eq(
        pretixBackend.get().ethLatAmOrganizer.ethLatAmBouncerEmail
      );
      // User is now checked in
      expect(bouncerPODTicket.claim.ticket.isConsumed).to.eq(true);
    }
    {
      // Trying to check in again should fail
      const bouncerCheckInBouncer = await requestCheckInPipelineTicket(
        ethLatAmCheckinRoute,
        ZUPASS_EDDSA_PRIVATE_KEY,
        bouncerTicket.claim.ticket.attendeeEmail,
        EthLatAmBouncerIdentity,
        bouncerTicket
      );
      expect(bouncerCheckInBouncer.value).to.deep.eq({
        success: false,
        error: {
          name: "AlreadyCheckedIn",
          checkinTimestamp: new Date(checkinTimestamp).toISOString(),
          checker: "Pretix"
        }
      } as PodboxTicketActionResponseValue);
    }
    {
      // Check the bouncer out again
      // Simulates the effect of check-in being deleted in Pretix
      pretixBackend.checkOut(
        ethLatAmPretixOrganizer.orgUrl,
        "eth-lat-am",
        pretixBackend.get().ethLatAmOrganizer.ethLatAmBouncerEmail
      );
    }
    {
      // Trying to check in again should fail because we have not yet reloaded
      // data from Pretix.
      const bouncerCheckInBouncer = await requestCheckInPipelineTicket(
        ethLatAmCheckinRoute,
        ZUPASS_EDDSA_PRIVATE_KEY,
        bouncerTicket.claim.ticket.attendeeEmail,
        EthLatAmBouncerIdentity,
        bouncerTicket
      );
      expect(bouncerCheckInBouncer.value).to.deep.eq({
        success: false,
        error: {
          name: "AlreadyCheckedIn",
          checkinTimestamp: new Date(checkinTimestamp).toISOString(),
          checker: "Pretix"
        }
      } as PodboxTicketActionResponseValue);
    }
    // Verify that bouncer is checked out in backend
    await pipeline.load();
    {
      const bouncerTickets = await requestTicketsFromPipeline(
        pipeline.issuanceCapability.options.feedFolder,
        ethLatAmTicketFeedUrl,
        pipeline.issuanceCapability.options.feedId,
        ZUPASS_EDDSA_PRIVATE_KEY,
        pretixBackend.get().ethLatAmOrganizer.ethLatAmBouncerEmail,
        EthLatAmBouncerIdentity,
        true
      );
      expectLength(bouncerTickets, 2);
      const bouncerTicket = bouncerTickets[0];
      expectToExist(bouncerTicket);
      expectIsEdDSATicketPCD(bouncerTicket);
      expect(bouncerTicket.claim.ticket.attendeeEmail).to.eq(
        pretixBackend.get().ethLatAmOrganizer.ethLatAmBouncerEmail
      );
      // Bouncer ticket is checked out
      expect(bouncerTicket.claim.ticket.isConsumed).to.eq(false);

      const bouncerPODTicket = bouncerTickets[1];
      expectToExist(bouncerPODTicket);
      expectIsPODTicketPCD(bouncerPODTicket);
      expect(bouncerPODTicket.claim.ticket.attendeeEmail).to.eq(
        pretixBackend.get().ethLatAmOrganizer.ethLatAmBouncerEmail
      );
      // Bouncer ticket is checked out
      expect(bouncerPODTicket.claim.ticket.isConsumed).to.eq(false);
    }
    {
      // Now check the bouncer in
      const ethLatAmCheckinRoute = pipeline.checkinCapability.getCheckinUrl();

      const bouncerCheckInBouncer = await requestCheckInPipelineTicket(
        ethLatAmCheckinRoute,
        ZUPASS_EDDSA_PRIVATE_KEY,
        bouncerTicket.claim.ticket.attendeeEmail,
        EthLatAmBouncerIdentity,
        bouncerTicket
      );
      expect(bouncerCheckInBouncer.value).to.deep.eq({ success: true });
      MockDate.set(Date.now() + ONE_SECOND_MS);

      // Reload the pipeline
      await pipeline.load();
      {
        const bouncerTickets = await requestTicketsFromPipeline(
          pipeline.issuanceCapability.options.feedFolder,
          ethLatAmTicketFeedUrl,
          pipeline.issuanceCapability.options.feedId,
          ZUPASS_EDDSA_PRIVATE_KEY,
          pretixBackend.get().ethLatAmOrganizer.ethLatAmBouncerEmail,
          EthLatAmBouncerIdentity,
          true
        );
        expectLength(bouncerTickets, 2);
        const bouncerTicket = bouncerTickets[0];
        expectToExist(bouncerTicket);
        expectIsEdDSATicketPCD(bouncerTicket);
        expect(bouncerTicket.claim.ticket.attendeeEmail).to.eq(
          pretixBackend.get().ethLatAmOrganizer.ethLatAmBouncerEmail
        );
        // User is now checked in
        expect(bouncerTicket.claim.ticket.isConsumed).to.eq(true);

        const bouncerPODTicket = bouncerTickets[1];
        expectToExist(bouncerPODTicket);
        expectIsPODTicketPCD(bouncerPODTicket);
        expect(bouncerPODTicket.claim.ticket.attendeeEmail).to.eq(
          pretixBackend.get().ethLatAmOrganizer.ethLatAmBouncerEmail
        );
        // User is now checked in
        expect(bouncerPODTicket.claim.ticket.isConsumed).to.eq(true);
      }
    }
  });

  step(
    "Pretix should not load tickets for an event with invalid settings",
    async function () {
      expectToExist(giService);
      const pipelines = await giService.getAllPipelineInstances();
      const pipeline = pipelines.find(PretixPipeline.is);
      expectToExist(pipeline);
      expect(pipeline.id).to.eq(ethLatAmPipeline.id);

      const backup = pretixBackend.backup();
      // These event settings are invalid, and so the Pretix pipeline should
      // refuse to load any tickets for the event.
      pretixBackend.setEventSettings(
        ethLatAmPretixOrganizer.orgUrl,
        ethLatAmEvent.slug,
        { attendee_emails_asked: false, attendee_emails_required: false }
      );

      const runInfo = await pipeline.load();
      expect(runInfo.atomsLoaded).to.eq(0);
      expectLength(
        runInfo.latestLogs.filter(
          (log) => log.level === PipelineLogLevel.Error
        ),
        1
      );

      pretixBackend.restore(backup);
    }
  );

  step(
    "Pretix should not load tickets for events which have products with invalid settings",
    async function () {
      expectToExist(giService);
      const pipelines = await giService.getAllPipelineInstances();
      const pipeline = pipelines.find(PretixPipeline.is);
      expectToExist(pipeline);
      expect(pipeline.id).to.eq(ethLatAmPipeline.id);

      // The setup of products is considered to be part of the event
      // configuration, so a mis-configured product will block the loading of
      // any tickets for the event, even if there are no tickets using this
      // product.

      const backup = pretixBackend.backup();
      pretixBackend.updateProduct(
        ethLatAmPretixOrganizer.orgUrl,
        pretixBackend.get().ethLatAmOrganizer.ethLatAm.slug,
        pretixBackend.get().ethLatAmOrganizer.ethLatAmTShirtProduct.id,
        (product) => {
          product.generate_tickets = true;
        }
      );

      const runInfo = await pipeline.load();
      expect(runInfo.atomsLoaded).to.eq(0);
      expectLength(
        runInfo.latestLogs.filter(
          (log) => log.level === PipelineLogLevel.Error
        ),
        1
      );

      pretixBackend.restore(backup);
    }
  );

  step(
    "invalid or expired credentials cannot be used for actions or feeds",
    async () => {
      expectToExist(giService);
      const pipelines = await giService.getAllPipelineInstances();
      const pipeline = pipelines.find(PretixPipeline.is);
      expectToExist(pipeline);
      expect(pipeline.id).to.eq(ethLatAmPipeline.id);
      const ethLatAmTicketFeedUrl = pipeline.issuanceCapability.feedUrl;

      pretixBackend.checkOut(
        ethLatAmPretixOrganizer.orgUrl,
        ethLatAmEvent.slug,
        ethLatAmPretixOrganizer.ethLatAmBouncerEmail
      );

      // Verify that bouncer is checked out in backend
      await pipeline.load();
      const bouncerTickets = await requestTicketsFromPipeline(
        pipeline.issuanceCapability.options.feedFolder,
        ethLatAmTicketFeedUrl,
        pipeline.issuanceCapability.options.feedId,
        ZUPASS_EDDSA_PRIVATE_KEY,
        ethLatAmPretixOrganizer.ethLatAmBouncerEmail,
        EthLatAmBouncerIdentity,
        true
      );
      expectLength(bouncerTickets, 2);
      const bouncerTicket = bouncerTickets[0];
      expectToExist(bouncerTicket);
      expectIsEdDSATicketPCD(bouncerTicket);
      expect(bouncerTicket.claim.ticket.attendeeEmail).to.eq(
        ethLatAmPretixOrganizer.ethLatAmBouncerEmail
      );
      // Bouncer ticket is checked out
      expect(bouncerTicket.claim.ticket.isConsumed).to.eq(false);

      const bouncerPODTicket = bouncerTickets[1];
      expectToExist(bouncerPODTicket);
      expectIsPODTicketPCD(bouncerPODTicket);
      expect(bouncerPODTicket.claim.ticket.attendeeEmail).to.eq(
        ethLatAmPretixOrganizer.ethLatAmBouncerEmail
      );
      // Bouncer ticket is checked out
      expect(bouncerPODTicket.claim.ticket.isConsumed).to.eq(false);

      const ethLatAmCheckinRoute = pipeline.checkinCapability.getCheckinUrl();

      const badEmailPCD = await proveEmailPCD(
        ethLatAmPretixOrganizer.ethLatAmBouncerEmail,
        // Not the Zupass private key!
        newEdDSAPrivateKey(),
        EthLatAmBouncerIdentity
      );
      const goodEmailPCD = await proveEmailPCD(
        ethLatAmPretixOrganizer.ethLatAmBouncerEmail,
        ZUPASS_EDDSA_PRIVATE_KEY,
        EthLatAmBouncerIdentity
      );
      const badEmailCredential = await signCredentialPayload(
        EthLatAmBouncerIdentity,
        createCredentialPayload(await EmailPCDPackage.serialize(badEmailPCD))
      );
      const mismatchedIdentityCredential = await signCredentialPayload(
        // Semaphore identity is different from that used by the Email PCD
        new Identity(),
        createCredentialPayload(await EmailPCDPackage.serialize(goodEmailPCD))
      );
      MockDate.set(Date.now() - ONE_DAY_MS);
      const expiredCredential = await signCredentialPayload(
        EthLatAmBouncerIdentity,
        createCredentialPayload(await EmailPCDPackage.serialize(goodEmailPCD))
      );
      MockDate.set(Date.now() + ONE_DAY_MS);

      {
        const result = await requestPodboxTicketAction(
          ethLatAmCheckinRoute,
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
          ethLatAmCheckinRoute,
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
          ethLatAmCheckinRoute,
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
    const ethLatAmPipeline = pipelines.find(PretixPipeline.is);
    expectToExist(ethLatAmPipeline);
  });

  this.afterAll(async () => {
    await stopApplication(giBackend);
    mockServer.close();
  });
});
