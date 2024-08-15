import { getEdDSAPublicKey } from "@pcd/eddsa-pcd";
import { expectIsEdDSATicketPCD } from "@pcd/eddsa-ticket-pcd";
import { EmailPCD, EmailPCDPackage, EmailPCDTypeName } from "@pcd/email-pcd";
import {
  requestChangeUserEmail,
  requestGenericIssuanceSemaphoreGroup,
  requestPollFeed,
  ZUPASS_CREDENTIAL_REQUEST,
  ZupassFeedIds
} from "@pcd/passport-interface";
import { isReplaceInFolderAction, PCDActionType } from "@pcd/pcd-collection";
import { expectIsPODTicketPCD } from "@pcd/pod-ticket-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import "mocha";
import { step } from "mocha-steps";
import * as MockDate from "mockdate";
import { stopApplication } from "../../../../src/application";
import { fetchEmailToken } from "../../../../src/database/queries/emailToken";
import { PipelineDefinitionDB } from "../../../../src/database/queries/pipelineDefinitionDB";
import { PipelineUserDB } from "../../../../src/database/queries/pipelineUserDB";
import { GenericIssuanceService } from "../../../../src/services/generic-issuance/GenericIssuanceService";
import { PretixPipeline } from "../../../../src/services/generic-issuance/pipelines/PretixPipeline";
import { PipelineUser } from "../../../../src/services/generic-issuance/pipelines/types";
import { Zupass } from "../../../../src/types";
import { testLogin } from "../../../user/testLogin";
import { overrideEnvironment, testingEnv } from "../../../util/env";
import { startTestingApp } from "../../../util/startTestingApplication";
import {
  expectLength,
  expectToExist,
  expectTrue,
  randomEmail
} from "../../../util/util";
import {
  assertUserMatches,
  checkPipelineInfoEndpoint,
  makeTestCredentials,
  makeTestCredentialsForEmails,
  requestTicketsFromPipeline,
  requestTicketsFromPipelineWithEmailPCDs
} from "../../util";
import { setupTestPretixPipeline } from "./setupTestPretixPipeline";

async function testGetTickets(
  pipeline: PretixPipeline,
  feedUrl: string,
  emailPCDs: EmailPCD[],
  identity: Identity,
  expectedEmails: string[]
): Promise<void> {
  const attendeeTickets = await requestTicketsFromPipelineWithEmailPCDs(
    pipeline.issuanceCapability.options.feedFolder,
    feedUrl,
    pipeline.issuanceCapability.options.feedId,
    identity,
    emailPCDs
  );

  expectLength(attendeeTickets, expectedEmails.length);

  while (attendeeTickets.length > 0) {
    if (expectedEmails.length === 0) {
      throw new Error("expected more emails than were provided");
    }
    const checkingEmail = expectedEmails.pop();
    const matchingTicket = attendeeTickets.find(
      (t) => t.claim.ticket.attendeeEmail === checkingEmail
    );
    expectToExist(matchingTicket);
    attendeeTickets.splice(attendeeTickets.indexOf(matchingTicket), 1);
  }
}

async function testGetEmailPCDs(
  giBackend: Zupass,
  testUserIdentity: Identity,
  expectedEmails: string[]
): Promise<EmailPCD[]> {
  const pollFeedResult = await requestPollFeed(
    `${giBackend.expressContext.localEndpoint}/feeds`,
    {
      pcd: await makeTestCredentials(
        testUserIdentity,
        ZUPASS_CREDENTIAL_REQUEST
      ),
      feedId: ZupassFeedIds.Email
    }
  );

  if (!pollFeedResult.success) {
    throw new Error("did not expect an error here");
  }

  expect(pollFeedResult.value?.actions.length).to.eq(2);

  // Zeroth action clears the folder, so this one contains the email
  const action = pollFeedResult?.value?.actions?.[1];
  expectToExist(action, isReplaceInFolderAction);
  expect(action.type).to.eq(PCDActionType.ReplaceInFolder);
  expect(action.pcds.length).to.eq(expectedEmails.length);

  const result: EmailPCD[] = [];

  for (const pcd of action.pcds) {
    expect(pcd.type).to.eq(EmailPCDTypeName);

    // Check that the PCD contains the expected email address
    const deserializedPCD = await EmailPCDPackage.deserialize(pcd.pcd);
    expect(expectedEmails).to.include(deserializedPCD.claim.emailAddress);
    result.push(deserializedPCD);

    // Check that the PCD verifies
    expect(await EmailPCDPackage.verify(deserializedPCD)).to.be.true;

    // Check the public key
    expect(deserializedPCD.proof.eddsaPCD.claim.publicKey).to.deep.eq(
      await giBackend.services.issuanceService?.getEdDSAPublicKey()
    );
  }

  return result;
}

/**
 * Tests for {@link GenericIssuanceService}, in particular the {@link PretixPipeline}.
 */
describe.only("generic issuance - PretixPipeline - multi-email support", function () {
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
    mockServer,
    pretixBackend,
    ethLatAmPipeline,
    ethLatAmSemaphoreGroupIds
  } = setupTestPretixPipeline();

  const pipelineDefinitions = [ethLatAmPipeline];

  let pipeline: PretixPipeline;
  let testUserIdentity: Identity;
  const testUserInitialEmail = randomEmail();
  let currentEmailPCDs: EmailPCD[] = [];

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

  step("Pipeline should have initialized", async function () {
    expectToExist(giService);
    const pipelines = await giService.getAllPipelineInstances();
    expectToExist(pipelines);
    expectLength(pipelines, 1);
    const foundPipeline = pipelines.find(PretixPipeline.is);
    expectToExist(foundPipeline);
    pipeline = foundPipeline;
    expect(pipeline.id).to.eq(ethLatAmPipeline.id);
  });

  step("should be able to log in", async function () {
    const loginResult = await testLogin(giBackend, testUserInitialEmail, {
      force: true,
      expectUserAlreadyLoggedIn: false,
      expectEmailIncorrect: false,
      skipSetupPassword: false
    });

    expect(loginResult?.identity).to.not.be.empty;
    testUserIdentity = loginResult?.identity as Identity;
  });

  step(
    "user should be able to be issued an attested email PCD from the server",
    async function () {
      currentEmailPCDs = await testGetEmailPCDs(giBackend, testUserIdentity, [
        testUserInitialEmail
      ]);

      await testGetTickets(
        pipeline,
        pipeline.issuanceCapability.feedUrl,
        currentEmailPCDs,
        testUserIdentity,
        []
      );
    }
  );

  step("user should be able to change their email address", async function () {
    const credential = await makeTestCredentialsForEmails(
      testUserIdentity,
      currentEmailPCDs
    );

    const newEmail =
      pretixBackend.get().ethLatAmOrganizer.ethLatAmAttendeeEmail;

    // send a confirmation code token
    const sendTokenResult = await requestChangeUserEmail(
      giBackend.expressContext.localEndpoint,
      testUserInitialEmail,
      newEmail,
      credential
    );
    expectTrue(sendTokenResult.success);

    const token = await fetchEmailToken(giBackend.context.dbPool, newEmail);
    expectToExist(token);

    // use the confirmation code to change the email
    const changeEmailResult = await requestChangeUserEmail(
      giBackend.expressContext.localEndpoint,
      testUserInitialEmail,
      newEmail,
      credential,
      token
    );

    expectTrue(changeEmailResult.success);

    currentEmailPCDs = await testGetEmailPCDs(giBackend, testUserIdentity, [
      newEmail
    ]);

    await testGetTickets(
      pipeline,
      pipeline.issuanceCapability.feedUrl,
      currentEmailPCDs,
      testUserIdentity,
      [newEmail, newEmail] // 2 - one eddsa and one pod
    );
  });

  /**
   * Test for {@link PretixPipeline} for Eth LatAm.
   */
  step(
    "PretixPipeline issuance - specifically multi-email support",
    async () => {
      const ethLatAmTicketFeedUrl = pipeline.issuanceCapability.feedUrl;
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

      await checkPipelineInfoEndpoint(giBackend, pipeline);
    }
  );

  step(
    "Pretix pipeline Semaphore groups contain correct members",
    async function () {
      await pipeline.load();

      const semaphoreGroupAll = await requestGenericIssuanceSemaphoreGroup(
        process.env.PASSPORT_SERVER_URL as string,
        pipeline.id,
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
        pipeline.id,
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
          pipeline.id,
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
          pipeline.id,
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

  this.afterAll(async () => {
    await stopApplication(giBackend);
    mockServer.close();
  });
});