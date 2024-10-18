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
import { setupAutoIssuancePipeline } from "./setupAutoIssuancePipeline";

/**
 * Tests for {@link GenericIssuanceService}, in particular the {@link PretixPipeline} implementing
 * auto-issuance features.
 */
describe("generic issuance - PretixPipeline w/ auto-issuance enabled", function () {
  const nowDate = new Date();
  MockDate.set(nowDate);
  const now = nowDate.getTime();

  let ZUPASS_EDDSA_PRIVATE_KEY: string;
  let giBackend: Zupass;
  let giService: GenericIssuanceService;
  let client: PoolClient;
  let pool: Pool;

  const {
    adminGIUserId,
    adminGIUserEmail,
    autoIssuanceGIUserID,
    autoIssuanceGIUserEmail,
    AutoIssuanceBouncerIdentity,
    AutoIssuanceAttendeeIdentity,
    AutoIssuanceManualAttendeeIdentity,
    AutoIssuanceManualAttendeeEmail,
    AutoIssuanceManualBouncerIdentity,
    AutoIssuanceManualBouncerEmail,
    AutoIssuanceImageUrl,
    mockServer,
    pretixBackend,
    autoIssuancePretixOrganizer,
    autoIssuanceEvent,
    autoIssuancePipeline,
    autoIssuanceSemaphoreGroupIds
  } = setupAutoIssuancePipeline();

  const autoIssuanceInterval = autoIssuancePipeline.options.autoIssuance?.[0]
    ?.schedule?.intervalMs as number;
  const autoIssuanceEnd = autoIssuancePipeline.options.autoIssuance?.[0]
    ?.schedule?.endDate as string;

  const pipelineDefinitions = [autoIssuancePipeline];

  /**
   * Sets up a Zupass/Generic issuance backend with one pipeline:
   * - {@link PretixPipeline}, as defined by {@link setupAutoIssuancePipeline}
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

    const autoIssuanceGIUser: PipelineUser = {
      id: autoIssuanceGIUserID,
      email: autoIssuanceGIUserEmail,
      isAdmin: false,
      timeCreated: nowDate,
      timeUpdated: nowDate
    };
    await userDB.updateUserById(client, autoIssuanceGIUser);
    assertUserMatches(
      {
        id: autoIssuanceGIUserID,
        email: autoIssuanceGIUserEmail,
        isAdmin: false,
        timeCreated: nowDate,
        timeUpdated: nowDate
      },
      await userDB.getUserById(client, autoIssuanceGIUser.id)
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
   * Test for {@link PretixPipeline} for Auto Issuance event.
   */
  step(
    "PretixPipeline issuance and checkin and PipelineInfo for Auto Issuance",
    async () => {
      expectToExist(giService);
      const pipelines = await giService.getAllPipelineInstances();
      expectToExist(pipelines);
      expectLength(pipelines, 1);
      const pipeline = pipelines.find(PretixPipeline.is);
      expectToExist(pipeline);
      expect(pipeline.id).to.eq(autoIssuancePipeline.id);
      const autoIssuanceTicketFeedUrl = pipeline.issuanceCapability.feedUrl;
      const autoIssuanceIssuanceDateTime = new Date();

      const foodVendorTickets = await requestTicketsFromPipeline(
        pipeline.issuanceCapability.options.feedFolder,
        autoIssuanceTicketFeedUrl,
        pipeline.issuanceCapability.options.feedId,
        ZUPASS_EDDSA_PRIVATE_KEY,
        pretixBackend.get().autoIssuanceOrganizer.autoIssuanceFoodVendorEmail,
        AutoIssuanceAttendeeIdentity
      );
      expectLength(foodVendorTickets, 2); // just their food vendor ticket and corresponding pod ticket

      const attendeeTickets = await requestTicketsFromPipeline(
        pipeline.issuanceCapability.options.feedFolder,
        autoIssuanceTicketFeedUrl,
        pipeline.issuanceCapability.options.feedId,
        ZUPASS_EDDSA_PRIVATE_KEY,
        pretixBackend.get().autoIssuanceOrganizer.autoIssuanceAttendeeEmail,
        AutoIssuanceAttendeeIdentity
      );
      expectLength(
        attendeeTickets.map((t) => t.claim.ticket),
        (1 + 2) * 2 // 1 ticket + pod + 2 vouchers + 2 voucher pods
      );

      {
        // issuing again immediately does not give you further food vouchers
        const attendeeTickets = await requestTicketsFromPipeline(
          pipeline.issuanceCapability.options.feedFolder,
          autoIssuanceTicketFeedUrl,
          pipeline.issuanceCapability.options.feedId,
          ZUPASS_EDDSA_PRIVATE_KEY,
          pretixBackend.get().autoIssuanceOrganizer.autoIssuanceAttendeeEmail,
          AutoIssuanceAttendeeIdentity
        );
        expectLength(
          attendeeTickets.map((t) => t.claim.ticket),
          (1 + 2) * 2 // 1 ticket + pod + 2 vouchers + 2 voucher pods
        );

        const savedDate = new Date();
        MockDate.set(
          new Date(savedDate.getTime() + autoIssuanceInterval + 1000)
        );
        // issuing again after `autoIssuanceInterval` ms does give you further food vouchers
        const attendeeTicketsAfterSomeTime = await requestTicketsFromPipeline(
          pipeline.issuanceCapability.options.feedFolder,
          autoIssuanceTicketFeedUrl,
          pipeline.issuanceCapability.options.feedId,
          ZUPASS_EDDSA_PRIVATE_KEY,
          pretixBackend.get().autoIssuanceOrganizer.autoIssuanceAttendeeEmail,
          AutoIssuanceAttendeeIdentity
        );
        expectLength(
          attendeeTicketsAfterSomeTime.map((t) => t.claim.ticket),
          (1 + 4) * 2 // 1 ticket + pod + 4 vouchers + 4 voucher pods
        );

        MockDate.set(new Date(new Date(autoIssuanceEnd).getTime() + 1));
        // issuing after auto issuance end yields no further food vouchers
        const attendeeTicketsAfterEnd = await requestTicketsFromPipeline(
          pipeline.issuanceCapability.options.feedFolder,
          autoIssuanceTicketFeedUrl,
          pipeline.issuanceCapability.options.feedId,
          ZUPASS_EDDSA_PRIVATE_KEY,
          pretixBackend.get().autoIssuanceOrganizer.autoIssuanceAttendeeEmail,
          AutoIssuanceAttendeeIdentity
        );
        expectLength(
          attendeeTicketsAfterEnd.map((t) => t.claim.ticket),
          (1 + 4) * 2 // 1 ticket + pod + 4 vouchers + 4 voucher pods
        );

        MockDate.set(savedDate);
      }

      const attendeeTicket = attendeeTickets[0];
      const attendeeFoodVoucherTicket = attendeeTickets[1];
      expectIsEdDSATicketPCD(attendeeFoodVoucherTicket);
      expectToExist(attendeeTicket);
      expectIsEdDSATicketPCD(attendeeTicket);
      expect(attendeeTicket.claim.ticket.attendeeEmail).to.eq(
        pretixBackend.get().autoIssuanceOrganizer.autoIssuanceAttendeeEmail
      );
      expect(attendeeTicket.claim.ticket.attendeeName).to.eq(
        pretixBackend.get().autoIssuanceOrganizer.autoIssuanceAttendeeName
      );

      const attendeePODTicket = attendeeTickets[5];
      expectToExist(attendeePODTicket);
      expectIsPODTicketPCD(attendeePODTicket);
      expect(attendeePODTicket.claim.ticket.attendeeEmail).to.eq(
        pretixBackend.get().autoIssuanceOrganizer.autoIssuanceAttendeeEmail
      );
      expect(attendeePODTicket.claim.ticket.attendeeName).to.eq(
        pretixBackend.get().autoIssuanceOrganizer.autoIssuanceAttendeeName
      );

      const bouncerTickets = await requestTicketsFromPipeline(
        pipeline.issuanceCapability.options.feedFolder,
        autoIssuanceTicketFeedUrl,
        pipeline.issuanceCapability.options.feedId,
        ZUPASS_EDDSA_PRIVATE_KEY,
        pretixBackend.get().autoIssuanceOrganizer.autoIssuanceBouncerEmail,
        AutoIssuanceBouncerIdentity
      );
      expectLength(bouncerTickets, 2);
      const bouncerTicket = bouncerTickets[0];
      expectToExist(bouncerTicket);
      expectIsEdDSATicketPCD(bouncerTicket);
      expect(bouncerTicket.claim.ticket.attendeeEmail).to.eq(
        pretixBackend.get().autoIssuanceOrganizer.autoIssuanceBouncerEmail
      );
      expect(bouncerTicket.claim.ticket.attendeeName).to.eq(
        pretixBackend.get().autoIssuanceOrganizer.autoIssuanceBouncerName
      );
      const bouncerPODTicket = bouncerTickets[1];
      expectToExist(bouncerPODTicket);
      expectIsPODTicketPCD(bouncerPODTicket);
      expect(bouncerPODTicket.claim.ticket.attendeeEmail).to.eq(
        pretixBackend.get().autoIssuanceOrganizer.autoIssuanceBouncerEmail
      );
      expect(bouncerPODTicket.claim.ticket.attendeeName).to.eq(
        pretixBackend.get().autoIssuanceOrganizer.autoIssuanceBouncerName
      );

      const autoIssuanceCheckinRoute =
        pipeline.checkinCapability.getCheckinUrl();

      {
        const foodVendorChecksInFoodVoucher =
          await requestCheckInPipelineTicket(
            pipeline.checkinCapability.getCheckinUrl(),
            ZUPASS_EDDSA_PRIVATE_KEY,
            pretixBackend.get().autoIssuanceOrganizer
              .autoIssuanceFoodVendorEmail,
            new Identity(),
            attendeeFoodVoucherTicket
          );

        expect(foodVendorChecksInFoodVoucher.value).to.deep.eq({
          success: true
        });

        const foodVendorChecksInGATicket = await requestCheckInPipelineTicket(
          pipeline.checkinCapability.getCheckinUrl(),
          ZUPASS_EDDSA_PRIVATE_KEY,
          pretixBackend.get().autoIssuanceOrganizer.autoIssuanceFoodVendorEmail,
          new Identity(),
          attendeeTicket
        );

        expect(foodVendorChecksInGATicket.value).to.deep.eq({
          success: false,
          error: { name: "NotSuperuser" }
        });
      }

      const bouncerCheckInBouncer = await requestCheckInPipelineTicket(
        autoIssuanceCheckinRoute,
        ZUPASS_EDDSA_PRIVATE_KEY,
        bouncerTicket.claim.ticket.attendeeEmail,
        AutoIssuanceBouncerIdentity,
        bouncerTicket
      );
      expect(bouncerCheckInBouncer.value).to.deep.eq({ success: true });

      // can't check in a ticket that's already checked in
      const bouncerCheckInBouncerAgain = await requestCheckInPipelineTicket(
        autoIssuanceCheckinRoute,
        ZUPASS_EDDSA_PRIVATE_KEY,
        bouncerTicket.claim.ticket.attendeeEmail,
        AutoIssuanceBouncerIdentity,
        bouncerTicket
      );
      expect(bouncerCheckInBouncerAgain.value).to.deep.contain({
        success: false
      });

      // can't check in a ticket using a ticket that isn't a superuser ticket
      const attendeeCheckInBouncerResult = await requestCheckInPipelineTicket(
        autoIssuanceCheckinRoute,
        ZUPASS_EDDSA_PRIVATE_KEY,
        attendeeTicket.claim.ticket.attendeeEmail,
        AutoIssuanceAttendeeIdentity,
        bouncerTicket
      );

      expect(attendeeCheckInBouncerResult.value).to.deep.eq({
        success: false,
        error: { name: "NotSuperuser" }
      } satisfies PodboxTicketActionResponseValue);

      // can't check in a ticket with an email PCD signed by a non-Zupass private key
      const fakeBouncerCheckInBouncerResult =
        await requestCheckInPipelineTicket(
          autoIssuanceCheckinRoute,
          newEdDSAPrivateKey(),
          attendeeTicket.claim.ticket.attendeeEmail,
          AutoIssuanceAttendeeIdentity,
          bouncerTicket
        );
      expect(fakeBouncerCheckInBouncerResult.value).to.deep.eq({
        success: false,
        error: { name: "InvalidSignature" }
      } satisfies PodboxTicketActionResponseValue);

      const ManualAttendeeTickets = await requestTicketsFromPipeline(
        pipeline.issuanceCapability.options.feedFolder,
        autoIssuanceTicketFeedUrl,
        pipeline.issuanceCapability.options.feedId,
        ZUPASS_EDDSA_PRIVATE_KEY,
        AutoIssuanceManualAttendeeEmail,
        AutoIssuanceManualAttendeeIdentity
      );
      expectLength(ManualAttendeeTickets, 6);
      const ManualAttendeeTicket = ManualAttendeeTickets[0];
      expectIsEdDSATicketPCD(ManualAttendeeTicket);
      expect(ManualAttendeeTicket.claim.ticket.attendeeEmail).to.eq(
        AutoIssuanceManualAttendeeEmail
      );
      const ManualAttendeePODTicket = ManualAttendeeTickets[3];
      expectIsPODTicketPCD(ManualAttendeePODTicket);
      expect(ManualAttendeePODTicket.claim.ticket.attendeeEmail).to.eq(
        AutoIssuanceManualAttendeeEmail
      );

      const ManualBouncerTickets = await requestTicketsFromPipeline(
        pipeline.issuanceCapability.options.feedFolder,
        autoIssuanceTicketFeedUrl,
        pipeline.issuanceCapability.options.feedId,
        ZUPASS_EDDSA_PRIVATE_KEY,
        AutoIssuanceManualBouncerEmail,
        AutoIssuanceManualBouncerIdentity
      );
      expectLength(ManualBouncerTickets, 2);
      const ManualBouncerTicket = ManualBouncerTickets[0];
      expectIsEdDSATicketPCD(ManualBouncerTicket);
      expect(ManualBouncerTicket.claim.ticket.attendeeEmail).to.eq(
        AutoIssuanceManualBouncerEmail
      );
      expect(ManualBouncerTicket.claim.ticket.imageUrl).to.be.undefined;

      const ManualBouncerPODTicket = ManualBouncerTickets[1];
      expectIsPODTicketPCD(ManualBouncerPODTicket);
      expect(ManualBouncerPODTicket.claim.ticket.attendeeEmail).to.eq(
        AutoIssuanceManualBouncerEmail
      );
      expect(ManualBouncerPODTicket.claim.ticket.imageUrl).to.be.undefined;

      pretixBackend.checkOut(
        autoIssuancePretixOrganizer.orgUrl,
        autoIssuanceEvent.slug,
        bouncerTicket.claim.ticket.attendeeEmail
      );
      MockDate.set(Date.now() + ONE_SECOND_MS);
      await pipeline.load();

      const manualBouncerChecksInManualAttendee =
        await requestCheckInPipelineTicket(
          pipeline.checkinCapability.getCheckinUrl(),
          ZUPASS_EDDSA_PRIVATE_KEY,
          AutoIssuanceManualBouncerEmail,
          AutoIssuanceManualBouncerIdentity,
          ManualAttendeeTicket
        );
      expect(manualBouncerChecksInManualAttendee.value).to.deep.eq({
        success: true
      });

      {
        const ManualAttendeeTickets = await requestTicketsFromPipeline(
          pipeline.issuanceCapability.options.feedFolder,
          autoIssuanceTicketFeedUrl,
          pipeline.issuanceCapability.options.feedId,
          ZUPASS_EDDSA_PRIVATE_KEY,
          AutoIssuanceManualAttendeeEmail,
          AutoIssuanceManualAttendeeIdentity
        );
        expectLength(ManualAttendeeTickets, 6);
        const ManualAttendeeTicket = ManualAttendeeTickets[0];
        expectIsEdDSATicketPCD(ManualAttendeeTicket);
        expect(ManualAttendeeTicket.claim.ticket.attendeeEmail).to.eq(
          AutoIssuanceManualAttendeeEmail
        );
        expect(ManualAttendeeTicket.claim.ticket.isConsumed).to.eq(true);
        expect(ManualAttendeeTicket.claim.ticket.imageUrl).to.eq(
          AutoIssuanceImageUrl
        );
        expect(ManualAttendeeTicket.claim.ticket.timestampConsumed).to.eq(
          Date.now()
        );
        const ManualAttendeePODTicket = ManualAttendeeTickets[3];
        expectIsPODTicketPCD(ManualAttendeePODTicket);
        expect(ManualAttendeePODTicket.claim.ticket.attendeeEmail).to.eq(
          AutoIssuanceManualAttendeeEmail
        );
        expect(ManualAttendeePODTicket.claim.ticket.isConsumed).to.eq(true);
        expect(ManualAttendeePODTicket.claim.ticket.imageUrl).to.eq(
          AutoIssuanceImageUrl
        );
        expect(ManualAttendeePODTicket.claim.ticket.timestampConsumed).to.eq(
          Date.now()
        );
      }

      const manualBouncerChecksInManualAttendeeAgain =
        await requestCheckInPipelineTicket(
          pipeline.checkinCapability.getCheckinUrl(),
          ZUPASS_EDDSA_PRIVATE_KEY,
          AutoIssuanceManualBouncerEmail,
          AutoIssuanceManualBouncerIdentity,
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
          AutoIssuanceManualAttendeeEmail,
          AutoIssuanceManualAttendeeIdentity,
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
        autoIssuancePipeline.id,
        [
          AutoIssuanceManualAttendeeEmail,
          AutoIssuanceManualBouncerEmail,
          pretixBackend.get().autoIssuanceOrganizer.autoIssuanceAttendeeEmail,
          pretixBackend.get().autoIssuanceOrganizer.autoIssuanceBouncerEmail
        ]
      );
      expectLength(consumers, 4);
      expect(consumers).to.deep.include.members([
        {
          email: AutoIssuanceManualAttendeeEmail,
          commitment: AutoIssuanceManualAttendeeIdentity.commitment.toString(),
          timeCreated: autoIssuanceIssuanceDateTime,
          timeUpdated: autoIssuanceIssuanceDateTime
        },
        {
          email: AutoIssuanceManualBouncerEmail,
          commitment: AutoIssuanceManualBouncerIdentity.commitment.toString(),
          timeCreated: autoIssuanceIssuanceDateTime,
          timeUpdated: autoIssuanceIssuanceDateTime
        },
        {
          email:
            pretixBackend.get().autoIssuanceOrganizer.autoIssuanceAttendeeEmail,
          commitment: AutoIssuanceAttendeeIdentity.commitment.toString(),
          timeCreated: autoIssuanceIssuanceDateTime,
          timeUpdated: autoIssuanceIssuanceDateTime
        },
        {
          email:
            pretixBackend.get().autoIssuanceOrganizer.autoIssuanceBouncerEmail,
          commitment: AutoIssuanceBouncerIdentity.commitment.toString(),
          timeCreated: autoIssuanceIssuanceDateTime,
          timeUpdated: autoIssuanceIssuanceDateTime
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
      const autoIssuancePipeline = pipelines.find(PretixPipeline.is);
      expectToExist(autoIssuancePipeline);

      await autoIssuancePipeline.load();

      const semaphoreGroupAll = await requestGenericIssuanceSemaphoreGroup(
        process.env.PASSPORT_SERVER_URL as string,
        autoIssuancePipeline.id,
        autoIssuanceSemaphoreGroupIds.all
      );
      expectTrue(semaphoreGroupAll.success);
      expectLength(semaphoreGroupAll.value.members, 4);
      expect(semaphoreGroupAll.value.members).to.deep.include.members([
        AutoIssuanceBouncerIdentity.commitment.toString(),
        AutoIssuanceAttendeeIdentity.commitment.toString(),
        AutoIssuanceManualAttendeeIdentity.commitment.toString(),
        AutoIssuanceManualBouncerIdentity.commitment.toString()
      ]);

      const semaphoreGroupBouncers = await requestGenericIssuanceSemaphoreGroup(
        process.env.PASSPORT_SERVER_URL as string,
        autoIssuancePipeline.id,
        autoIssuanceSemaphoreGroupIds.bouncers
      );

      expectTrue(semaphoreGroupBouncers.success);
      expectLength(semaphoreGroupBouncers.value.members, 2);
      expect(semaphoreGroupBouncers.value.members).to.deep.include.members([
        AutoIssuanceBouncerIdentity.commitment.toString(),
        AutoIssuanceManualBouncerIdentity.commitment.toString()
      ]);

      const semaphoreGroupAttendees =
        await requestGenericIssuanceSemaphoreGroup(
          process.env.PASSPORT_SERVER_URL as string,
          autoIssuancePipeline.id,
          autoIssuanceSemaphoreGroupIds.attendees
        );

      expectTrue(semaphoreGroupAttendees.success);
      expectLength(semaphoreGroupAttendees.value.members, 2);
      expect(semaphoreGroupAttendees.value.members).to.deep.include.members([
        AutoIssuanceAttendeeIdentity.commitment.toString(),
        AutoIssuanceManualAttendeeIdentity.commitment.toString()
      ]);

      const semaphoreGroupAttendeesAndBouncers =
        await requestGenericIssuanceSemaphoreGroup(
          process.env.PASSPORT_SERVER_URL as string,
          autoIssuancePipeline.id,
          autoIssuanceSemaphoreGroupIds.attendeesAndBouncers
        );

      expectTrue(semaphoreGroupAttendeesAndBouncers.success);
      expectLength(semaphoreGroupAttendeesAndBouncers.value.members, 4);
      expect(
        semaphoreGroupAttendeesAndBouncers.value.members
      ).to.deep.include.members([
        AutoIssuanceBouncerIdentity.commitment.toString(),
        AutoIssuanceAttendeeIdentity.commitment.toString(),
        AutoIssuanceManualAttendeeIdentity.commitment.toString(),
        AutoIssuanceManualBouncerIdentity.commitment.toString()
      ]);
    }
  );

  step("check-ins for deleted manual tickets are removed", async function () {
    expectToExist(giService);

    const checkinDB = new PipelineCheckinDB();
    const checkins = await checkinDB.getByPipelineId(
      client,
      autoIssuancePipeline.id
    );
    // Manual attendee ticket and food voucher was checked in
    expectLength(checkins, 2);

    const userDB = new PipelineUserDB();
    const adminUser = await userDB.getUserById(client, adminGIUserId);
    expectToExist(adminUser);

    // Delete the manual tickets from the definition
    const latestPipeline = (await giService.getPipeline(
      client,
      autoIssuancePipeline.id
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
        autoIssuancePipeline.id
      );
      // only food voucher checkin is found as the tickets have been deleted
      expectLength(checkins, 1);
    }
  });

  step("check-in and remote check-out works in Pretix", async function () {
    expectToExist(giService);
    const pipelines = await giService.getAllPipelineInstances();
    const pipeline = pipelines.find(PretixPipeline.is);
    expectToExist(pipeline);
    expect(pipeline.id).to.eq(autoIssuancePipeline.id);
    const autoIssuanceTicketFeedUrl = pipeline.issuanceCapability.feedUrl;

    // Ensure that bouncer is checked out
    pretixBackend.checkOut(
      autoIssuancePretixOrganizer.orgUrl,
      autoIssuanceEvent.slug,
      pretixBackend.get().autoIssuanceOrganizer.autoIssuanceBouncerEmail
    );
    MockDate.set(Date.now() + ONE_SECOND_MS);
    // Verify that bouncer is checked out in backend
    await pipeline.load();
    const bouncerTickets = await requestTicketsFromPipeline(
      pipeline.issuanceCapability.options.feedFolder,
      autoIssuanceTicketFeedUrl,
      pipeline.issuanceCapability.options.feedId,
      ZUPASS_EDDSA_PRIVATE_KEY,
      pretixBackend.get().autoIssuanceOrganizer.autoIssuanceBouncerEmail,
      AutoIssuanceBouncerIdentity
    );
    expectLength(bouncerTickets, 2);
    const bouncerTicket = bouncerTickets[0];
    expectToExist(bouncerTicket);
    expectIsEdDSATicketPCD(bouncerTicket);
    expect(bouncerTicket.claim.ticket.attendeeEmail).to.eq(
      pretixBackend.get().autoIssuanceOrganizer.autoIssuanceBouncerEmail
    );
    // Bouncer ticket is checked out
    expect(bouncerTicket.claim.ticket.isConsumed).to.eq(false);
    expect(bouncerTicket.claim.ticket.imageUrl).to.be.undefined;

    const bouncerPODTicket = bouncerTickets[1];
    expectToExist(bouncerPODTicket);
    expectIsPODTicketPCD(bouncerPODTicket);
    expect(bouncerPODTicket.claim.ticket.attendeeEmail).to.eq(
      pretixBackend.get().autoIssuanceOrganizer.autoIssuanceBouncerEmail
    );
    // Bouncer ticket is checked out
    expect(bouncerPODTicket.claim.ticket.isConsumed).to.eq(false);
    expect(bouncerPODTicket.claim.ticket.imageUrl).to.be.undefined;

    // Now check the bouncer in
    const autoIssuanceCheckinRoute = pipeline.checkinCapability.getCheckinUrl();

    const bouncerCheckInBouncer = await requestCheckInPipelineTicket(
      autoIssuanceCheckinRoute,
      ZUPASS_EDDSA_PRIVATE_KEY,
      bouncerTicket.claim.ticket.attendeeEmail,
      AutoIssuanceBouncerIdentity,
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
        autoIssuanceTicketFeedUrl,
        pipeline.issuanceCapability.options.feedId,
        ZUPASS_EDDSA_PRIVATE_KEY,
        pretixBackend.get().autoIssuanceOrganizer.autoIssuanceBouncerEmail,
        AutoIssuanceBouncerIdentity
      );
      expectLength(bouncerTickets, 2);
      const bouncerTicket = bouncerTickets[0];
      expectToExist(bouncerTicket);
      expectIsEdDSATicketPCD(bouncerTicket);
      expect(bouncerTicket.claim.ticket.attendeeEmail).to.eq(
        pretixBackend.get().autoIssuanceOrganizer.autoIssuanceBouncerEmail
      );
      // User is now checked in
      expect(bouncerTicket.claim.ticket.isConsumed).to.eq(true);

      const bouncerPODTicket = bouncerTickets[1];
      expectToExist(bouncerPODTicket);
      expectIsPODTicketPCD(bouncerPODTicket);
      expect(bouncerPODTicket.claim.ticket.attendeeEmail).to.eq(
        pretixBackend.get().autoIssuanceOrganizer.autoIssuanceBouncerEmail
      );
      // User is now checked in
      expect(bouncerPODTicket.claim.ticket.isConsumed).to.eq(true);
    }
    {
      // Trying to check in again should fail
      const bouncerCheckInBouncer = await requestCheckInPipelineTicket(
        autoIssuanceCheckinRoute,
        ZUPASS_EDDSA_PRIVATE_KEY,
        bouncerTicket.claim.ticket.attendeeEmail,
        AutoIssuanceBouncerIdentity,
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
        autoIssuancePretixOrganizer.orgUrl,
        autoIssuanceEvent.slug,
        pretixBackend.get().autoIssuanceOrganizer.autoIssuanceBouncerEmail
      );
    }
    {
      // Trying to check in again should fail because we have not yet reloaded
      // data from Pretix.
      const bouncerCheckInBouncer = await requestCheckInPipelineTicket(
        autoIssuanceCheckinRoute,
        ZUPASS_EDDSA_PRIVATE_KEY,
        bouncerTicket.claim.ticket.attendeeEmail,
        AutoIssuanceBouncerIdentity,
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
        autoIssuanceTicketFeedUrl,
        pipeline.issuanceCapability.options.feedId,
        ZUPASS_EDDSA_PRIVATE_KEY,
        pretixBackend.get().autoIssuanceOrganizer.autoIssuanceBouncerEmail,
        AutoIssuanceBouncerIdentity
      );
      expectLength(bouncerTickets, 2);
      const bouncerTicket = bouncerTickets[0];
      expectToExist(bouncerTicket);
      expectIsEdDSATicketPCD(bouncerTicket);
      expect(bouncerTicket.claim.ticket.attendeeEmail).to.eq(
        pretixBackend.get().autoIssuanceOrganizer.autoIssuanceBouncerEmail
      );
      // Bouncer ticket is checked out
      expect(bouncerTicket.claim.ticket.isConsumed).to.eq(false);

      const bouncerPODTicket = bouncerTickets[1];
      expectToExist(bouncerPODTicket);
      expectIsPODTicketPCD(bouncerPODTicket);
      expect(bouncerPODTicket.claim.ticket.attendeeEmail).to.eq(
        pretixBackend.get().autoIssuanceOrganizer.autoIssuanceBouncerEmail
      );
      // Bouncer ticket is checked out
      expect(bouncerPODTicket.claim.ticket.isConsumed).to.eq(false);
    }
    {
      // Now check the bouncer in
      const autoIssuanceCheckinRoute =
        pipeline.checkinCapability.getCheckinUrl();

      const bouncerCheckInBouncer = await requestCheckInPipelineTicket(
        autoIssuanceCheckinRoute,
        ZUPASS_EDDSA_PRIVATE_KEY,
        bouncerTicket.claim.ticket.attendeeEmail,
        AutoIssuanceBouncerIdentity,
        bouncerTicket
      );
      expect(bouncerCheckInBouncer.value).to.deep.eq({ success: true });
      MockDate.set(Date.now() + ONE_SECOND_MS);

      // Reload the pipeline
      await pipeline.load();
      {
        const bouncerTickets = await requestTicketsFromPipeline(
          pipeline.issuanceCapability.options.feedFolder,
          autoIssuanceTicketFeedUrl,
          pipeline.issuanceCapability.options.feedId,
          ZUPASS_EDDSA_PRIVATE_KEY,
          pretixBackend.get().autoIssuanceOrganizer.autoIssuanceBouncerEmail,
          AutoIssuanceBouncerIdentity
        );
        expectLength(bouncerTickets, 2);
        const bouncerTicket = bouncerTickets[0];
        expectToExist(bouncerTicket);
        expectIsEdDSATicketPCD(bouncerTicket);
        expect(bouncerTicket.claim.ticket.attendeeEmail).to.eq(
          pretixBackend.get().autoIssuanceOrganizer.autoIssuanceBouncerEmail
        );
        // User is now checked in
        expect(bouncerTicket.claim.ticket.isConsumed).to.eq(true);

        const bouncerPODTicket = bouncerTickets[1];
        expectToExist(bouncerPODTicket);
        expectIsPODTicketPCD(bouncerPODTicket);
        expect(bouncerPODTicket.claim.ticket.attendeeEmail).to.eq(
          pretixBackend.get().autoIssuanceOrganizer.autoIssuanceBouncerEmail
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
      expect(pipeline.id).to.eq(autoIssuancePipeline.id);

      const backup = pretixBackend.backup();
      // These event settings are invalid, and so the Pretix pipeline should
      // refuse to load any tickets for the event.
      pretixBackend.setEventSettings(
        autoIssuancePretixOrganizer.orgUrl,
        autoIssuanceEvent.slug,
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
    "invalid or expired credentials cannot be used for actions or feeds",
    async () => {
      expectToExist(giService);
      const pipelines = await giService.getAllPipelineInstances();
      const pipeline = pipelines.find(PretixPipeline.is);
      expectToExist(pipeline);
      expect(pipeline.id).to.eq(autoIssuancePipeline.id);
      const autoIssuanceTicketFeedUrl = pipeline.issuanceCapability.feedUrl;

      pretixBackend.checkOut(
        autoIssuancePretixOrganizer.orgUrl,
        autoIssuanceEvent.slug,
        autoIssuancePretixOrganizer.autoIssuanceBouncerEmail
      );

      // Verify that bouncer is checked out in backend
      await pipeline.load();
      const bouncerTickets = await requestTicketsFromPipeline(
        pipeline.issuanceCapability.options.feedFolder,
        autoIssuanceTicketFeedUrl,
        pipeline.issuanceCapability.options.feedId,
        ZUPASS_EDDSA_PRIVATE_KEY,
        autoIssuancePretixOrganizer.autoIssuanceBouncerEmail,
        AutoIssuanceBouncerIdentity
      );
      expectLength(bouncerTickets, 2);
      const bouncerTicket = bouncerTickets[0];
      expectToExist(bouncerTicket);
      expectIsEdDSATicketPCD(bouncerTicket);
      expect(bouncerTicket.claim.ticket.attendeeEmail).to.eq(
        autoIssuancePretixOrganizer.autoIssuanceBouncerEmail
      );
      // Bouncer ticket is checked out
      expect(bouncerTicket.claim.ticket.isConsumed).to.eq(false);

      const bouncerPODTicket = bouncerTickets[1];
      expectToExist(bouncerPODTicket);
      expectIsPODTicketPCD(bouncerPODTicket);
      expect(bouncerPODTicket.claim.ticket.attendeeEmail).to.eq(
        autoIssuancePretixOrganizer.autoIssuanceBouncerEmail
      );
      // Bouncer ticket is checked out
      expect(bouncerPODTicket.claim.ticket.isConsumed).to.eq(false);

      const autoIssuanceCheckinRoute =
        pipeline.checkinCapability.getCheckinUrl();

      const badEmailPCD = await proveEmailPCD(
        autoIssuancePretixOrganizer.autoIssuanceBouncerEmail,
        // Not the Zupass private key!
        newEdDSAPrivateKey(),
        AutoIssuanceBouncerIdentity
      );
      const goodEmailPCD = await proveEmailPCD(
        autoIssuancePretixOrganizer.autoIssuanceBouncerEmail,
        ZUPASS_EDDSA_PRIVATE_KEY,
        AutoIssuanceBouncerIdentity
      );
      const badEmailCredential = await signCredentialPayload(
        AutoIssuanceBouncerIdentity,
        createCredentialPayload(await EmailPCDPackage.serialize(badEmailPCD))
      );
      const mismatchedIdentityCredential = await signCredentialPayload(
        // Semaphore identity is different from that used by the Email PCD
        new Identity(),
        createCredentialPayload(await EmailPCDPackage.serialize(goodEmailPCD))
      );
      MockDate.set(Date.now() - ONE_DAY_MS);
      const expiredCredential = await signCredentialPayload(
        AutoIssuanceBouncerIdentity,
        createCredentialPayload(await EmailPCDPackage.serialize(goodEmailPCD))
      );
      MockDate.set(Date.now() + ONE_DAY_MS);

      {
        const result = await requestPodboxTicketAction(
          autoIssuanceCheckinRoute,
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
          autoIssuanceCheckinRoute,
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
          autoIssuanceCheckinRoute,
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
    const autoIssuancePipeline = pipelines.find(PretixPipeline.is);
    expectToExist(autoIssuancePipeline);
  });

  this.afterAll(async () => {
    await stopApplication(giBackend);
    mockServer.close();
  });
});
