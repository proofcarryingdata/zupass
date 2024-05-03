import { getEdDSAPublicKey, newEdDSAPrivateKey } from "@pcd/eddsa-pcd";
import { expectIsEdDSATicketPCD } from "@pcd/eddsa-ticket-pcd";
import { EmailPCDPackage } from "@pcd/email-pcd";
import {
  PODBOX_CREDENTIAL_REQUEST,
  PipelineLogLevel,
  PodboxTicketActionResponseValue,
  PretixPipelineDefinition,
  createCredentialPayload,
  requestGenericIssuanceSemaphoreGroup,
  requestPipelineInfo,
  requestPodboxCheckInOfflineTickets,
  requestPodboxDeleteOfflineCheckin,
  requestPodboxGetOfflineTickets,
  requestPodboxTicketAction
} from "@pcd/passport-interface";
import { expectIsPODTicketPCD } from "@pcd/pod-ticket-pcd";
import { ONE_DAY_MS, ONE_SECOND_MS, randomUUID } from "@pcd/util";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import "mocha";
import { step } from "mocha-steps";
import * as MockDate from "mockdate";
import { stopApplication } from "../../../../src/application";
import { PipelineCheckinDB } from "../../../../src/database/queries/pipelineCheckinDB";
import { PipelineConsumerDB } from "../../../../src/database/queries/pipelineConsumerDB";
import { PipelineDefinitionDB } from "../../../../src/database/queries/pipelineDefinitionDB";
import { PipelineUserDB } from "../../../../src/database/queries/pipelineUserDB";
import { sqlQuery } from "../../../../src/database/sqlQuery";
import { GenericIssuanceService } from "../../../../src/services/generic-issuance/GenericIssuanceService";
import {
  PRETIX_CHECKER,
  PretixPipeline
} from "../../../../src/services/generic-issuance/pipelines/PretixPipeline";
import { PipelineUser } from "../../../../src/services/generic-issuance/pipelines/types";
import { Zupass } from "../../../../src/types";
import { IMockGenericIssuancePretixBackendData } from "../../../pretix/GenericPretixDataMocker";
import { overrideEnvironment, testingEnv } from "../../../util/env";
import { startTestingApp } from "../../../util/startTestingApplication";
import {
  expectFalse,
  expectLength,
  expectSuccess,
  expectToExist,
  expectTrue
} from "../../../util/util";
import {
  assertUserMatches,
  checkPipelineInfoEndpoint,
  deleteManualTicketCheckins,
  makeTestCredential,
  proveEmailPCD,
  requestCheckInPipelineTicket,
  requestTicketsFromPipeline,
  signCredentialPayload
} from "../../util";
import { setupTestPretixPipeline } from "./setupTestPretixPipeline";

/**
 * Tests for {@link GenericIssuanceService}, in particular the {@link PretixPipeline}.
 */
describe("generic issuance - PretixPipeline", function () {
  const nowDate = new Date();
  const now = Date.now();

  let ZUPASS_EDDSA_PRIVATE_KEY: string;
  let giBackend: Zupass;
  let giService: GenericIssuanceService;

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
  } = setupTestPretixPipeline();

  const pipelineDefinitions = [ethLatAmPipeline];

  const beforeUseBackup: IMockGenericIssuancePretixBackendData =
    pretixBackend.backup();

  /**
   * Sets up a Zupass/Generic issuance backend with one pipeline:
   * - {@link PretixPipeline}, as defined by {@link setupTestPretixPipeline}
   */
  this.beforeAll(async () => {
    const zupassPublicKey = JSON.stringify(
      await getEdDSAPublicKey(testingEnv.SERVER_EDDSA_PRIVATE_KEY as string)
    );

    await overrideEnvironment({
      ...testingEnv,
      GENERIC_ISSUANCE_ZUPASS_PUBLIC_KEY: zupassPublicKey,
      STYTCH_BYPASS: "true",
      NODE_ENV: "test"
    });

    giBackend = await startTestingApp({});

    const userDB = new PipelineUserDB(giBackend.context.dbPool);

    const adminUser: PipelineUser = {
      id: adminGIUserId,
      email: adminGIUserEmail,
      isAdmin: true,
      timeCreated: nowDate,
      timeUpdated: nowDate
    };
    await userDB.updateUserById(adminUser);
    assertUserMatches(
      {
        id: adminGIUserId,
        email: adminGIUserEmail,
        isAdmin: true,
        timeCreated: nowDate,
        timeUpdated: nowDate
      },
      await userDB.getUserById(adminUser.id)
    );

    const ethLatAmGIUser: PipelineUser = {
      id: ethLatAmGIUserID,
      email: ethLatAmGIUserEmail,
      isAdmin: false,
      timeCreated: nowDate,
      timeUpdated: nowDate
    };
    await userDB.updateUserById(ethLatAmGIUser);
    assertUserMatches(
      {
        id: ethLatAmGIUserID,
        email: ethLatAmGIUserEmail,
        isAdmin: false,
        timeCreated: nowDate,
        timeUpdated: nowDate
      },
      await userDB.getUserById(ethLatAmGIUser.id)
    );

    // The mock server will intercept any requests for URLs that are registered
    // with it. Unhandled requests will bypass the mock server.
    mockServer.listen({ onUnhandledRequest: "bypass" });

    ZUPASS_EDDSA_PRIVATE_KEY = process.env.SERVER_EDDSA_PRIVATE_KEY as string;
    giService = giBackend.services
      .genericIssuanceService as GenericIssuanceService;
    await giService.stop();
    const pipelineDefinitionDB = new PipelineDefinitionDB(
      giBackend.context.dbPool
    );
    await pipelineDefinitionDB.deleteAllDefinitions();
    await pipelineDefinitionDB.upsertDefinitions(pipelineDefinitions);
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
    const userDB = new PipelineUserDB(giBackend.context.dbPool);

    const adminUser: PipelineUser = {
      id: adminGIUserId,
      email: adminGIUserEmail,
      isAdmin: true,
      timeCreated: nowDate,
      timeUpdated: nowDate
    };
    await userDB.updateUserById(adminUser);
    assertUserMatches(
      {
        id: adminGIUserId,
        email: adminGIUserEmail,
        isAdmin: true,
        timeCreated: nowDate,
        timeUpdated: nowDate
      },
      await userDB.getUserById(adminUser.id)
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
        EthLatAmAttendeeIdentity
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
        EthLatAmBouncerIdentity
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
        EthLatAmManualAttendeeIdentity
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
        EthLatAmManualBouncerIdentity
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
          EthLatAmManualAttendeeIdentity
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
      const consumerDB = new PipelineConsumerDB(giBackend.context.dbPool);
      const consumers = await consumerDB.loadByEmails(ethLatAmPipeline.id, [
        EthLatAmManualAttendeeEmail,
        EthLatAmManualBouncerEmail,
        pretixBackend.get().ethLatAmOrganizer.ethLatAmAttendeeEmail,
        pretixBackend.get().ethLatAmOrganizer.ethLatAmBouncerEmail
      ]);
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

    const checkinDB = new PipelineCheckinDB(giBackend.context.dbPool);
    const checkins = await checkinDB.getByPipelineId(ethLatAmPipeline.id);
    // Manual attendee ticket was checked in
    expectLength(checkins, 1);

    const userDB = new PipelineUserDB(giBackend.context.dbPool);
    const adminUser = await userDB.getUserById(adminGIUserId);
    expectToExist(adminUser);

    // Delete the manual tickets from the definition
    const latestPipeline = (await giService.getPipeline(
      ethLatAmPipeline.id
    )) as PretixPipelineDefinition;
    const newPipelineDefinition = structuredClone(latestPipeline);
    newPipelineDefinition.options.manualTickets = [];
    // Update the definition
    const { restartPromise } = await giService.upsertPipelineDefinition(
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
      const checkins = await checkinDB.getByPipelineId(ethLatAmPipeline.id);
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
      EthLatAmBouncerIdentity
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
        EthLatAmBouncerIdentity
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
        EthLatAmBouncerIdentity
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
          EthLatAmBouncerIdentity
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
        EthLatAmBouncerIdentity
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

  step("can get offline tickets", async () => {
    expectToExist(giService);
    const pipelines = await giService.getAllPipelineInstances();
    const pipeline = pipelines.find(PretixPipeline.is);
    expectToExist(pipeline);
    expect(pipeline.id).to.eq(ethLatAmPipeline.id);

    {
      const result = await requestPodboxGetOfflineTickets(
        giBackend.expressContext.localEndpoint,
        await makeTestCredential(
          EthLatAmBouncerIdentity,
          PODBOX_CREDENTIAL_REQUEST,
          ethLatAmPretixOrganizer.ethLatAmBouncerEmail,
          ZUPASS_EDDSA_PRIVATE_KEY
        )
      );

      expectTrue(result.success);
      // Bouncer should be able to receive all tickets
      expectLength(result.value.offlineTickets, 2);
    }

    {
      const result = await requestPodboxGetOfflineTickets(
        giBackend.expressContext.localEndpoint,
        await makeTestCredential(
          EthLatAmAttendeeIdentity,
          PODBOX_CREDENTIAL_REQUEST,
          ethLatAmPretixOrganizer.ethLatAmAttendeeEmail,
          ZUPASS_EDDSA_PRIVATE_KEY
        )
      );

      expectTrue(result.success);
      // Regular attendees can't perform check-in, so can't get offline tickets
      expectLength(result.value.offlineTickets, 0);
    }
  });

  step("can check in offline tickets", async () => {
    expectToExist(giService);
    const pipelines = await giService.getAllPipelineInstances();
    const pipeline = pipelines.find(PretixPipeline.is);
    expectToExist(pipeline);
    expect(pipeline.id).to.eq(ethLatAmPipeline.id);

    pretixBackend.restore(beforeUseBackup);
    await deleteManualTicketCheckins(giBackend.context.dbPool);

    const bouncerCredential = await makeTestCredential(
      EthLatAmBouncerIdentity,
      PODBOX_CREDENTIAL_REQUEST,
      ethLatAmPretixOrganizer.ethLatAmBouncerEmail,
      ZUPASS_EDDSA_PRIVATE_KEY
    );

    const result = await requestPodboxGetOfflineTickets(
      giBackend.expressContext.localEndpoint,
      bouncerCredential
    );

    expectTrue(result.success);
    // Bouncer should be able to receive all tickets
    expectLength(result.value.offlineTickets, 2);

    const ticketsByEvent = result.value.offlineTickets.reduce(
      (res, current) => {
        if (res[current.eventId]) {
          res[current.eventId].push(current.id);
        } else {
          res[current.eventId] = [current.id];
        }
        return res;
      },
      {} as Record<string, string[]>
    );

    await requestPodboxCheckInOfflineTickets(
      giBackend.expressContext.localEndpoint,
      bouncerCredential,
      ticketsByEvent
    );

    // Offline check-ins have not been processed yet
    const pipelineInfo = await requestPipelineInfo(
      adminGIUserEmail,
      giBackend.expressContext.localEndpoint,
      pipeline.id
    );
    expectSuccess(pipelineInfo);
    expectLength(pipelineInfo.value.queuedOfflineCheckins, 2);

    // Verify that the tickets are checked in.
    const loadResult = await pipeline.load();
    expect(loadResult.offlineTicketsCheckedIn).to.eq(2);

    // If we fetch offline tickets again, they should all appear to be
    // checked in.
    const getOfflineTicketsResult = await requestPodboxGetOfflineTickets(
      giBackend.expressContext.localEndpoint,
      bouncerCredential
    );

    expectTrue(getOfflineTicketsResult.success);
    // Bouncer should be able to receive all tickets
    expectLength(getOfflineTicketsResult.value.offlineTickets, 2);
    // All tickets should now be consumed.
    expectLength(
      getOfflineTicketsResult.value.offlineTickets.filter(
        (ot) => ot.is_consumed === true
      ),
      2
    );

    // Try the same thing as a non-permissioned user.
    {
      // Reset check-in state.
      pretixBackend.restore(beforeUseBackup);
      await deleteManualTicketCheckins(giBackend.context.dbPool);

      const attendeeCredential = await makeTestCredential(
        EthLatAmAttendeeIdentity,
        PODBOX_CREDENTIAL_REQUEST,
        ethLatAmPretixOrganizer.ethLatAmAttendeeEmail,
        ZUPASS_EDDSA_PRIVATE_KEY
      );

      // Attempt to send offline check-ins as a user without permission to check
      // tickets in for this pipeline. Will not throw an error, but will not add
      // any of the posted tickets to the queue either.
      await requestPodboxCheckInOfflineTickets(
        giBackend.expressContext.localEndpoint,
        attendeeCredential,
        ticketsByEvent
      );

      // We should find no offline check-ins in the queue.
      const pipelineInfo = await requestPipelineInfo(
        adminGIUserEmail,
        giBackend.expressContext.localEndpoint,
        pipeline.id
      );
      expectSuccess(pipelineInfo);
      expectLength(pipelineInfo.value.queuedOfflineCheckins, 0);

      // When we load the pipeline, no check-ins should be processed.
      const secondLoadResult = await pipeline.load();
      expect(secondLoadResult.offlineTicketsCheckedIn).to.eq(0);
    }
  });

  step("offline check-ins failures are properly recorded", async () => {
    expectToExist(giService);
    const pipelines = await giService.getAllPipelineInstances();
    const pipeline = pipelines.find(PretixPipeline.is);
    expectToExist(pipeline);
    expect(pipeline.id).to.eq(ethLatAmPipeline.id);

    // The synchronization of offline check-ins with the back-end is a
    // non-interactive process that occurs as part of the pipeline load. When
    // a user uploads offline check-ins from their device, those are queued for
    // processing, and the user does not receive any feedback on whether those
    // check-ins succeeded.
    //
    // When processing offline check-ins, various errors may occur. The
    // back-end system may be down, or the tickets that were checked in offline
    // may have been changed or even deleted. These are unlikely problems, but
    // if we are unable to synchronize an offline check-in then there is no way
    // to notify the user of the problem.
    //
    // Instead, we retry failed offline check-ins on each pipeline load, and
    // record the state of these. Pipeline owners, editors, and admins can view
    // the state of the offline check-in queue on the Podbox dashboard, and can
    // manually delete offline check-ins that cannot be completed (e.g. because
    // the ticket has been deleted).

    // Simulate adding an offline check-in for a ticket that no longer exists
    const failedOfflineCheckinTicketId = randomUUID();
    await sqlQuery(
      giBackend.context.dbPool,
      "INSERT INTO generic_issuance_offline_checkins (pipeline_id, ticket_id, checker_email, checkin_timestamp) VALUES($1, $2, $3, $4)",
      [
        ethLatAmPipeline.id,
        failedOfflineCheckinTicketId,
        ethLatAmPretixOrganizer.ethLatAmBouncerEmail,
        new Date()
      ]
    );

    // Failed check-ins appear in the load summary
    const loadResult = await pipeline.load();
    expect(loadResult.offlineTicketsFailedToCheckIn).to.eq(1);
    // A log message should also be included
    expectTrue(
      !!loadResult.latestLogs.find(
        (log) =>
          log.value ===
          `User ${ethLatAmPretixOrganizer.ethLatAmBouncerEmail} uploaded offline check-in for ticket ID ${failedOfflineCheckinTicketId} but this ticket does not exist.`
      )
    );

    // Pipeline info should include the failed offline check-in in the queue
    const pipelineInfo = await requestPipelineInfo(
      adminGIUserEmail,
      giBackend.expressContext.localEndpoint,
      pipeline.id
    );
    expectSuccess(pipelineInfo);
    expectLength(pipelineInfo.value.queuedOfflineCheckins, 1);
    expect(pipelineInfo.value.queuedOfflineCheckins?.[0].ticketId).to.eq(
      failedOfflineCheckinTicketId
    );

    // Admins/owners can delete failed offline check-ins
    await requestPodboxDeleteOfflineCheckin(
      giBackend.expressContext.localEndpoint,
      pipeline.id,
      failedOfflineCheckinTicketId,
      adminGIUserEmail
    );
    {
      // Dashboard should report no offline check-ins in the queue
      const pipelineInfo = await requestPipelineInfo(
        adminGIUserEmail,
        giBackend.expressContext.localEndpoint,
        pipeline.id
      );
      expectSuccess(pipelineInfo);
      expectLength(pipelineInfo.value.queuedOfflineCheckins, 0);

      // Pipeline load should report no offline check-in failures
      const loadResult = await pipeline.load();
      expect(loadResult.offlineTicketsFailedToCheckIn).to.eq(0);
    }
  });

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
