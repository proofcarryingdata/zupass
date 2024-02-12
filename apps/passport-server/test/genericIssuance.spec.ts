import { getEdDSAPublicKey, newEdDSAPrivateKey } from "@pcd/eddsa-pcd";
import {
  EdDSATicketPCD,
  EdDSATicketPCDPackage,
  expectIsEdDSATicketPCD
} from "@pcd/eddsa-ticket-pcd";
import { EmailPCDPackage } from "@pcd/email-pcd";
import {
  CSVPipelineDefinition,
  FeedCredentialPayload,
  GenericIssuanceCheckInResponseValue,
  GenericIssuanceCheckInResult,
  GenericPretixProduct,
  InfoResult,
  LemonadePipelineDefinition,
  PipelineDefinition,
  PipelineLogLevel,
  PipelineType,
  PollFeedResult,
  PretixPipelineDefinition,
  createFeedCredentialPayload,
  createGenericCheckinCredentialPayload,
  getI18nString,
  requestGenericIssuanceCheckIn,
  requestPipelineInfo,
  requestPollFeed
} from "@pcd/passport-interface";
import { expectIsReplaceInFolderAction } from "@pcd/pcd-collection";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import {
  SemaphoreSignaturePCD,
  SemaphoreSignaturePCDPackage
} from "@pcd/semaphore-signature-pcd";
import { ONE_DAY_MS, ONE_SECOND_MS } from "@pcd/util";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import { randomUUID } from "crypto";
import "mocha";
import { step } from "mocha-steps";
import * as MockDate from "mockdate";
import { rest } from "msw";
import { SetupServer, setupServer } from "msw/node";
import urljoin from "url-join";
import { LemonadeOAuthCredentials } from "../src/apis/lemonade/auth";
import { ILemonadeAPI, getLemonadeAPI } from "../src/apis/lemonade/lemonadeAPI";
import { LemonadeTicket, LemonadeTicketType } from "../src/apis/lemonade/types";
import { stopApplication } from "../src/application";
import { PipelineDefinitionDB } from "../src/database/queries/pipelineDefinitionDB";
import { PipelineUserDB } from "../src/database/queries/pipelineUserDB";
import { GenericIssuanceService } from "../src/services/generic-issuance/genericIssuanceService";
import { LemonadePipeline } from "../src/services/generic-issuance/pipelines/LemonadePipeline";
import { PretixPipeline } from "../src/services/generic-issuance/pipelines/PretixPipeline";
import {
  Pipeline,
  PipelineUser
} from "../src/services/generic-issuance/pipelines/types";
import { Zupass } from "../src/types";
import { testCSVPipeline } from "./generic-issuance/testCSVPipeline";
import {
  LemonadeDataMocker,
  LemonadeUser
} from "./lemonade/LemonadeDataMocker";
import {
  customTicketHandler,
  getMockLemonadeHandlers,
  loadApolloErrorMessages,
  unregisteredUserTicketHandler
} from "./lemonade/MockLemonadeServer";
import { TestTokenSource } from "./lemonade/TestTokenSource";
import { GenericPretixDataMocker } from "./pretix/GenericPretixDataMocker";
import { getMockGenericPretixHandlers } from "./pretix/MockGenericPretixServer";
import { overrideEnvironment, testingEnv } from "./util/env";
import { startTestingApp } from "./util/startTestingApplication";
import {
  expectFalse,
  expectLength,
  expectToExist,
  expectTrue
} from "./util/util";

/**
 * {@link GenericIssuanceService}
 * Rough test of the generic issuance functionality defined in this PR, just
 * to make sure that ends are coming together neatly. Totally incomplete.
 *
 * TODO:
 * - finish this during Cat Week.
 * - comprehensive tests for both Pretix and Lemonade cases
 */
describe("Generic Issuance", function () {
  this.timeout(30_000);
  const now = Date.now();

  // The Apollo client used by Lemonade does not load error messages by
  // default, so we have to call this.
  loadApolloErrorMessages();

  let ZUPASS_EDDSA_PRIVATE_KEY: string;
  let giBackend: Zupass;
  let giService: GenericIssuanceService | null;

  const lemonadeOAuthClientId = "edge-city-client-id";

  const adminGIUserId = randomUUID();
  const adminGIUserEmail = "admin@test.com";

  /**
   * Generic Issuance product user who has set up a {@link LemonadePipeline}
   * via the Generic Issuance UI.
   */
  const edgeCityGIUserID = randomUUID();
  const edgeCityGIUserEmail = "edge-city-gi-user@test.com";

  /**
   * Generic Issuance product user who has set up a {@link PretixPipeline}
   * via the Generic Issuance UI.
   */
  const ethLatAmGIUserID = randomUUID();
  const ethLatAmGIUserEmail = "eth-lat-am-gi-user@test.com";
  const EthLatAmBouncerIdentity = new Identity();
  const EthLatAmAttendeeIdentity = new Identity();

  const lemonadeBackend = new LemonadeDataMocker();

  const EdgeCityLemonadeAccount = lemonadeBackend.addAccount(
    lemonadeOAuthClientId
  );

  const EdgeCityDenver = EdgeCityLemonadeAccount.addEvent("Edge City Denver");

  /**
   * Attendee ticket type. In reality there will be several.
   */
  const EdgeCityAttendeeTicketType: LemonadeTicketType =
    EdgeCityLemonadeAccount.addTicketType(EdgeCityDenver._id, "ga");
  const EdgeCityBouncerTicketType: LemonadeTicketType =
    EdgeCityLemonadeAccount.addTicketType(EdgeCityDenver._id, "bouncer");

  /**
   * Most tests below need a person who is checking tickets {@link EdgeCityDenverBouncer}
   * and a person whose ticket needs to be checked in (@link Attendee)
   */
  const EdgeCityDenverAttendee: LemonadeUser = lemonadeBackend.addUser(
    "attendee@example.com",
    "attendee",
    "smith"
  );
  const EdgeCityDenverAttendeeIdentity = new Identity();
  const EdgeCityAttendeeTicket: LemonadeTicket =
    EdgeCityLemonadeAccount.addUserTicket(
      EdgeCityDenver._id,
      EdgeCityAttendeeTicketType._id,
      EdgeCityDenverAttendee._id,
      `${EdgeCityDenverAttendee.first_name} ${EdgeCityDenverAttendee.last_name}`
    );

  /**
   * Similar to {@link EdgeCityDenverAttendee}
   * Person who has a {@link LemonadeTicket} that does not have a bouncer ticket,
   * i.e. a ticket whose 'product id' or 'tier' is set up to be a 'superuser' ticket
   * by the Generic Issuance User with id {@link edgeCityGIUserID}.
   */
  const EdgeCityDenverBouncer: LemonadeUser = lemonadeBackend.addUser(
    "bouncer@example.com",
    "bouncer",
    "bob"
  );
  const EdgeCityBouncerIdentity = new Identity();
  const EdgeCityDenverBouncerTicket = EdgeCityLemonadeAccount.addUserTicket(
    EdgeCityDenver._id,
    EdgeCityBouncerTicketType._id,
    EdgeCityDenverBouncer._id,
    `${EdgeCityDenverBouncer.first_name} ${EdgeCityDenverBouncer.last_name}`
  );

  const lemonadeTokenSource = new TestTokenSource();
  const lemonadeAPI: ILemonadeAPI = getLemonadeAPI(
    // LemonadeAPI takes an optional `AuthTokenSource` as a parameter. This
    // allows us to mock out the generation of tokens that would otherwise be
    // done by making OAuth requests.
    // TestTokenSource simply returns the `oauthClientId` as the token.
    lemonadeTokenSource
  );
  const lemonadeBackendUrl = "http://localhost";
  const edgeCityPipeline: LemonadePipelineDefinition = {
    ownerUserId: edgeCityGIUserID,
    timeCreated: new Date().toISOString(),
    timeUpdated: new Date().toISOString(),
    id: randomUUID(),
    /**
     * TODO: test that the API that lets the frontend make changes to {@link Pipeline}s
     * on the backend respects generic issuance user permissions. @richard
     */
    editorUserIds: [],
    options: {
      feedOptions: {
        // TODO: @richard what do the organizers want these tickets to be called?
        feedDescription: "Edge City Denver tickets!",
        feedDisplayName: "Edge City Denver",
        feedFolder: "Edge City",
        feedId: "edge-city"
      },
      // Authentication values are not relevant for testing, except for `oauthClientId`
      oauthAudience: "test",
      oauthClientId: lemonadeOAuthClientId,
      oauthClientSecret: "test",
      oauthServerUrl: "test",
      backendUrl: lemonadeBackendUrl,
      events: [
        {
          externalId: EdgeCityDenver._id,
          name: EdgeCityDenver.title,
          genericIssuanceEventId: randomUUID(),
          ticketTypes: [
            {
              externalId: EdgeCityBouncerTicketType._id,
              genericIssuanceProductId: randomUUID(),
              isSuperUser: true,
              name: "Bouncer"
            },
            {
              externalId: EdgeCityAttendeeTicketType._id,
              genericIssuanceProductId: randomUUID(),
              isSuperUser: false,
              name: "Attendee"
            }
          ]
        }
      ]
    },
    type: PipelineType.Lemonade
  };

  let mockServer: SetupServer;
  const pretixBackend = new GenericPretixDataMocker();
  const ethLatAmPretixOrganizer = pretixBackend.get().ethLatAmOrganizer;
  const ethLatAmEvent = ethLatAmPretixOrganizer.ethLatAm;
  const ethLatAmProducts = ethLatAmPretixOrganizer.productsByEventID.get(
    ethLatAmEvent.slug
  );
  // TODO: how are we going to recommend their Pretix is set up?
  // @richard @rob
  expectToExist(ethLatAmProducts);
  /**
   * We expect an Attendee, a Bouncer, and a Tshirt product
   */
  expectLength(ethLatAmProducts, 3);
  const ethLatAmSuperuserProductIds: number[] = [
    pretixBackend.get().ethLatAmOrganizer.ethLatAmBouncerProduct.id
  ];
  expectLength(ethLatAmSuperuserProductIds, 1);
  expect([]);

  const ethLatAmPipeline: PretixPipelineDefinition = {
    ownerUserId: ethLatAmGIUserID,
    timeCreated: new Date().toISOString(),
    timeUpdated: new Date().toISOString(),
    id: randomUUID(),
    /**
     * TODO: test that the API that lets the frontend make changes to {@link Pipeline}s
     * on the backend respects generic issuance user permissions. @richard
     */
    editorUserIds: [],
    options: {
      // https://ethlatam.org/
      feedOptions: {
        feedDescription: "Eth Lat Am tickets! <copy>", // TODO: @richard what's the best copy here?
        feedDisplayName: "Eth LatAm",
        feedFolder: "Eth LatAm",
        feedId: "eth-latam"
        // TODO: product question - would users (pipeline admins) want to
        // customize other branding for their feed issuance? e.g. a nice image
        // or a custom font, or animation, or making it clickable, or have
        // some other built in functionality? We've been thinking about issuing
        // announcements for edge city, what might a cool announcement look like?
      },
      events: [
        {
          genericIssuanceId: randomUUID(),
          externalId: ethLatAmEvent.slug,
          name: "Eth LatAm",
          products: ethLatAmProducts.map((product: GenericPretixProduct) => {
            return {
              externalId: product.id.toString(),
              genericIssuanceId: randomUUID(),
              name: getI18nString(product.name),
              isSuperUser: ethLatAmSuperuserProductIds.includes(product.id)
            };
          })
        }
      ],
      pretixAPIKey: ethLatAmPretixOrganizer.token,
      pretixOrgUrl: ethLatAmPretixOrganizer.orgUrl
    },
    type: PipelineType.Pretix
  };

  const csvPipeline: CSVPipelineDefinition = {
    type: PipelineType.CSV,
    ownerUserId: ethLatAmGIUserID,
    timeCreated: new Date().toISOString(),
    timeUpdated: new Date().toISOString(),
    id: randomUUID(),
    /**
     * TODO: test that the API that lets the frontend make changes to {@link Pipeline}s
     * on the backend respects generic issuance user permissions. @richard
     */
    editorUserIds: [],
    options: {
      csv: `title,image
t1,i1
t2,i1`,
      feedOptions: {
        feedDescription: "CSV goodies",
        feedDisplayName: "CSV goodies",
        feedFolder: "goodie bag",
        feedId: "goodie-bag"
      }
    }
  };

  const pipelineDefinitions = [ethLatAmPipeline, edgeCityPipeline, csvPipeline];

  /**
   * Sets up a Zupass/Generic issuance backend with two pipelines:
   * - {@link LemonadePipeline}, as defined by {@link edgeCityPipeline}
   * - {@link PretixPipeline}, as defined by {@link ethLatAmPipeline}
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

    const userDB = new PipelineUserDB(giBackend.context.dbPool);
    const ethLatAmGIUser: PipelineUser = {
      id: ethLatAmGIUserID,
      email: ethLatAmGIUserEmail,
      isAdmin: false
    };
    await userDB.setUser(ethLatAmGIUser);
    assertUserMatches(
      { id: ethLatAmGIUserID, email: ethLatAmGIUserEmail, isAdmin: false },
      await userDB.getUser(ethLatAmGIUser.id)
    );
    const edgeCityDenverUser: PipelineUser = {
      id: edgeCityGIUserID,
      email: edgeCityGIUserEmail,
      isAdmin: false
    };
    await userDB.setUser(edgeCityDenverUser);
    assertUserMatches(
      { id: edgeCityGIUserID, email: edgeCityGIUserEmail, isAdmin: false },
      await userDB.getUser(edgeCityDenverUser.id)
    );

    const pretixOrgUrls = pretixBackend.get().organizersByOrgUrl.keys();
    mockServer = setupServer(
      ...getMockGenericPretixHandlers(pretixOrgUrls, pretixBackend),
      ...getMockLemonadeHandlers(lemonadeBackend, lemonadeBackendUrl)
    );
    // The mock server will intercept any requests for URLs that are registered
    // with it. Unhandled requests will bypass the mock server.
    mockServer.listen({ onUnhandledRequest: "bypass" });

    ZUPASS_EDDSA_PRIVATE_KEY = process.env.SERVER_EDDSA_PRIVATE_KEY as string;
    giService = giBackend.services.genericIssuanceService;
    await giService?.stop();
    const pipelineDefinitionDB = new PipelineDefinitionDB(
      giBackend.context.dbPool
    );
    await pipelineDefinitionDB.clearAllDefinitions();
    await pipelineDefinitionDB.setDefinitions(pipelineDefinitions);
    await giService?.loadAndInstantiatePipelines();
    await giService?.performAllPipelineLoads();
  });

  this.beforeEach(async () => {
    MockDate.set(now);
  });

  this.afterEach(async () => {
    mockServer.resetHandlers();
    MockDate.reset();
  });

  step("PipelineUserDB", async function () {
    const userDB = new PipelineUserDB(giBackend.context.dbPool);

    const adminUser: PipelineUser = {
      id: adminGIUserId,
      email: adminGIUserEmail,
      isAdmin: true
    };
    await userDB.setUser(adminUser);
    assertUserMatches(
      { id: adminGIUserId, email: adminGIUserEmail, isAdmin: true },
      await userDB.getUser(adminUser.id)
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
      const pipelines = await giService.getAllPipelines();
      expectToExist(pipelines);
      expectLength(pipelines, 3);
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
      expect(bouncerChecksInAttendee.value).to.deep.eq({ checkedIn: true });

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
        checkedIn: false
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
        checkedIn: false,
        error: { name: "NotSuperuser" }
      } satisfies GenericIssuanceCheckInResponseValue);

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
        checkedIn: false,
        error: { name: "InvalidSignature" }
      } satisfies GenericIssuanceCheckInResponseValue);

      await checkPipelineInfoEndpoint(giBackend, edgeCityDenverPipeline);
    }
  );

  /**
   * Test for {@link PretixPipeline} for Eth LatAm.
   */
  step(
    "PretixPipeline issuance and checkin and PipelineInfo for Eth LatAm",
    async () => {
      expectToExist(giService);
      const pipelines = await giService.getAllPipelines();
      expectToExist(pipelines);
      expectLength(pipelines, 3);
      const pipeline = pipelines.find(PretixPipeline.is);
      expectToExist(pipeline);
      expect(pipeline.id).to.eq(ethLatAmPipeline.id);
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
        1
      );
      const attendeeTicket = attendeeTickets[0];
      expectToExist(attendeeTicket);
      expectIsEdDSATicketPCD(attendeeTicket);
      expect(attendeeTicket.claim.ticket.attendeeEmail).to.eq(
        pretixBackend.get().ethLatAmOrganizer.ethLatAmAttendeeEmail
      );

      const bouncerTickets = await requestTicketsFromPipeline(
        pipeline.issuanceCapability.options.feedFolder,
        ethLatAmTicketFeedUrl,
        pipeline.issuanceCapability.options.feedId,
        ZUPASS_EDDSA_PRIVATE_KEY,
        pretixBackend.get().ethLatAmOrganizer.ethLatAmBouncerEmail,
        EthLatAmBouncerIdentity
      );
      expectLength(bouncerTickets, 1);
      const bouncerTicket = bouncerTickets[0];
      expectToExist(bouncerTicket);
      expectIsEdDSATicketPCD(bouncerTicket);
      expect(bouncerTicket.claim.ticket.attendeeEmail).to.eq(
        pretixBackend.get().ethLatAmOrganizer.ethLatAmBouncerEmail
      );

      const ethLatAmCheckinRoute = pipeline.checkinCapability.getCheckinUrl();

      const bouncerCheckInBouncer = await requestCheckInPipelineTicket(
        ethLatAmCheckinRoute,
        ZUPASS_EDDSA_PRIVATE_KEY,
        bouncerTicket.claim.ticket.attendeeEmail,
        EdgeCityBouncerIdentity,
        bouncerTicket
      );
      expect(bouncerCheckInBouncer.value).to.deep.eq({ checkedIn: true });

      // can't check in a ticket that's already checked in
      const bouncerCheckInBouncerAgain = await requestCheckInPipelineTicket(
        ethLatAmCheckinRoute,
        ZUPASS_EDDSA_PRIVATE_KEY,
        bouncerTicket.claim.ticket.attendeeEmail,
        EdgeCityBouncerIdentity,
        bouncerTicket
      );
      expect(bouncerCheckInBouncerAgain.value).to.deep.contain({
        checkedIn: false
      });

      // can't check in a ticket using a ticket that isn't a superuser ticket
      const attendeeCheckInBouncerResult = await requestCheckInPipelineTicket(
        ethLatAmCheckinRoute,
        ZUPASS_EDDSA_PRIVATE_KEY,
        attendeeTicket.claim.ticket.attendeeEmail,
        EdgeCityDenverAttendeeIdentity,
        bouncerTicket
      );

      expect(attendeeCheckInBouncerResult.value).to.deep.eq({
        checkedIn: false,
        error: { name: "NotSuperuser" }
      } satisfies GenericIssuanceCheckInResponseValue);

      // can't check in a ticket with an email PCD signed by a non-Zupass private key
      const fakeBouncerCheckInBouncerResult =
        await requestCheckInPipelineTicket(
          ethLatAmCheckinRoute,
          newEdDSAPrivateKey(),
          attendeeTicket.claim.ticket.attendeeEmail,
          EdgeCityDenverAttendeeIdentity,
          bouncerTicket
        );
      expect(fakeBouncerCheckInBouncerResult.value).to.deep.eq({
        checkedIn: false,
        error: { name: "InvalidSignature" }
      } satisfies GenericIssuanceCheckInResponseValue);

      await checkPipelineInfoEndpoint(giBackend, pipeline);
    }
  );

  step("CSVPipeline", async function () {
    expectToExist(giService);
    await testCSVPipeline(giService);
  });

  step("check-in and remote check-out works in Pretix", async function () {
    expectToExist(giService);
    const pipelines = await giService.getAllPipelines();
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
    expectLength(bouncerTickets, 1);
    const bouncerTicket = bouncerTickets[0];
    expectToExist(bouncerTicket);
    expectIsEdDSATicketPCD(bouncerTicket);
    expect(bouncerTicket.claim.ticket.attendeeEmail).to.eq(
      pretixBackend.get().ethLatAmOrganizer.ethLatAmBouncerEmail
    );
    // Bouncer ticket is checked out
    expect(bouncerTicket.claim.ticket.isConsumed).to.eq(false);

    // Now check the bouncer in
    const ethLatAmCheckinRoute = pipeline.checkinCapability.getCheckinUrl();

    const bouncerCheckInBouncer = await requestCheckInPipelineTicket(
      ethLatAmCheckinRoute,
      ZUPASS_EDDSA_PRIVATE_KEY,
      bouncerTicket.claim.ticket.attendeeEmail,
      EdgeCityBouncerIdentity,
      bouncerTicket
    );
    expect(bouncerCheckInBouncer.value).to.deep.eq({ checkedIn: true });
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
      expectLength(bouncerTickets, 1);
      const bouncerTicket = bouncerTickets[0];
      expectToExist(bouncerTicket);
      expectIsEdDSATicketPCD(bouncerTicket);
      expect(bouncerTicket.claim.ticket.attendeeEmail).to.eq(
        pretixBackend.get().ethLatAmOrganizer.ethLatAmBouncerEmail
      );
      // User is now checked in
      expect(bouncerTicket.claim.ticket.isConsumed).to.eq(true);
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
        checkedIn: false,
        error: {
          name: "AlreadyCheckedIn",
          checkinTimestamp: new Date(checkinTimestamp).toISOString(),
          checker: "Pretix"
        }
      } as GenericIssuanceCheckInResponseValue);
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
        checkedIn: false,
        error: {
          name: "AlreadyCheckedIn",
          checkinTimestamp: new Date(checkinTimestamp).toISOString(),
          checker: "Pretix"
        }
      } as GenericIssuanceCheckInResponseValue);
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
      expectLength(bouncerTickets, 1);
      const bouncerTicket = bouncerTickets[0];
      expectToExist(bouncerTicket);
      expectIsEdDSATicketPCD(bouncerTicket);
      expect(bouncerTicket.claim.ticket.attendeeEmail).to.eq(
        pretixBackend.get().ethLatAmOrganizer.ethLatAmBouncerEmail
      );
      // Bouncer ticket is checked out
      expect(bouncerTicket.claim.ticket.isConsumed).to.eq(false);
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
      expect(bouncerCheckInBouncer.value).to.deep.eq({ checkedIn: true });
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
        expectLength(bouncerTickets, 1);
        const bouncerTicket = bouncerTickets[0];
        expectToExist(bouncerTicket);
        expectIsEdDSATicketPCD(bouncerTicket);
        expect(bouncerTicket.claim.ticket.attendeeEmail).to.eq(
          pretixBackend.get().ethLatAmOrganizer.ethLatAmBouncerEmail
        );
        // User is now checked in
        expect(bouncerTicket.claim.ticket.isConsumed).to.eq(true);
      }
    }
  });

  step("check-in and remote check-out works in Lemonade", async function () {
    expectToExist(giService);
    const pipelines = await giService.getAllPipelines();
    const pipeline = pipelines.find(LemonadePipeline.is);
    expectToExist(pipeline);
    expect(pipeline.id).to.eq(edgeCityPipeline.id);
    const edgeCityTicketFeedUrl = pipeline.issuanceCapability.feedUrl;

    MockDate.set(Date.now() + ONE_SECOND_MS);
    // Verify that bouncer is checked out in backend
    await pipeline.load();
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

    // Now check the bouncer in
    const edgeCityCheckinRoute = pipeline.checkinCapability.getCheckinUrl();

    const bouncerCheckInBouncer = await requestCheckInPipelineTicket(
      edgeCityCheckinRoute,
      ZUPASS_EDDSA_PRIVATE_KEY,
      bouncerTicket.claim.ticket.attendeeEmail,
      EdgeCityBouncerIdentity,
      bouncerTicket
    );
    expect(bouncerCheckInBouncer.value).to.deep.eq({ checkedIn: true });
    const checkinTimestamp = Date.now();
    MockDate.set(Date.now() + ONE_SECOND_MS);

    // Reload the pipeline
    await pipeline.load();
    {
      // Get updated tickets from feed
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
      // User is now checked in
      expect(bouncerTicket.claim.ticket.isConsumed).to.eq(true);
    }
    {
      // Trying to check in again should fail
      const bouncerCheckInBouncer = await requestCheckInPipelineTicket(
        edgeCityCheckinRoute,
        ZUPASS_EDDSA_PRIVATE_KEY,
        bouncerTicket.claim.ticket.attendeeEmail,
        EdgeCityBouncerIdentity,
        bouncerTicket
      );
      expect(bouncerCheckInBouncer.value).to.deep.eq({
        checkedIn: false,
        error: {
          name: "AlreadyCheckedIn",
          checkinTimestamp: new Date(checkinTimestamp).toISOString(),
          checker: "Lemonade"
        }
      } as GenericIssuanceCheckInResponseValue);
    }
    {
      // Check the bouncer out again
      // There isn't a known way to do this in Lemonade, but it's worth testing
      // for what would happen if it did
      lemonadeBackend.checkOutUser(
        lemonadeOAuthClientId,
        EdgeCityDenver._id,
        EdgeCityDenverBouncer._id
      );
    }
    {
      // Trying to check in again should fail because we have not yet reloaded
      // data from Lemonade
      const bouncerCheckInBouncer = await requestCheckInPipelineTicket(
        edgeCityCheckinRoute,
        ZUPASS_EDDSA_PRIVATE_KEY,
        bouncerTicket.claim.ticket.attendeeEmail,
        EdgeCityBouncerIdentity,
        bouncerTicket
      );
      expect(bouncerCheckInBouncer.value).to.deep.eq({
        checkedIn: false,
        error: {
          name: "AlreadyCheckedIn",
          checkinTimestamp: new Date(checkinTimestamp).toISOString(),
          checker: "Lemonade"
        }
      } as GenericIssuanceCheckInResponseValue);
    }
    // Verify that bouncer is checked out in backend
    await pipeline.load();
    {
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
    }
    {
      // Now check the bouncer in
      const edgeCityCheckinRoute = pipeline.checkinCapability.getCheckinUrl();

      const bouncerCheckInBouncer = await requestCheckInPipelineTicket(
        edgeCityCheckinRoute,
        ZUPASS_EDDSA_PRIVATE_KEY,
        bouncerTicket.claim.ticket.attendeeEmail,
        EdgeCityBouncerIdentity,
        bouncerTicket
      );
      expect(bouncerCheckInBouncer.value).to.deep.eq({ checkedIn: true });
      MockDate.set(Date.now() + ONE_SECOND_MS);

      // Reload the pipeline
      await pipeline.load();
      {
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
        // User is now checked in
        expect(bouncerTicket.claim.ticket.isConsumed).to.eq(true);
      }
    }
  });

  /**
   * Test for {@link PipelineDefinitionDB}, which implements postgres CRUD
   * operations for {@link PipelineDefinition}s
   */
  step("PipelineDefinitionDB", async function () {
    const definitionDB = new PipelineDefinitionDB(giBackend.context.dbPool);
    await definitionDB.clearAllDefinitions();

    {
      const definitions: PipelineDefinition[] =
        await definitionDB.loadPipelineDefinitions();
      expectLength(definitions, 0);
    }

    {
      await definitionDB.setDefinitions(pipelineDefinitions);
      const definitions = await definitionDB.loadPipelineDefinitions();
      expectLength(definitions, pipelineDefinitions.length);

      const pretixDefinition = definitions.find(
        (d) => d.type === PipelineType.Pretix
      ) as PretixPipelineDefinition;

      const newKey = "TEST_KEY";
      pretixDefinition.options = {
        ...pretixDefinition?.options,
        pretixAPIKey: newKey
      };
      await definitionDB.setDefinition(pretixDefinition);
      const updatedPretixDefinition = (await definitionDB.getDefinition(
        pretixDefinition.id
      )) as PretixPipelineDefinition;
      expect(updatedPretixDefinition).to.exist;
      expect(
        (updatedPretixDefinition as PretixPipelineDefinition).options
          .pretixAPIKey
      ).to.eq(newKey);

      updatedPretixDefinition.editorUserIds.push(edgeCityGIUserID);
      await definitionDB.setDefinition(updatedPretixDefinition);
      const newEditorDefinition = (await definitionDB.getDefinition(
        updatedPretixDefinition.id
      )) as PretixPipelineDefinition;
      expect(newEditorDefinition).to.exist;
      expect(newEditorDefinition.editorUserIds).to.contain(edgeCityGIUserID);

      newEditorDefinition.editorUserIds = [];
      await definitionDB.setDefinition(newEditorDefinition);
      const emptyEditorsDefinition = (await definitionDB.getDefinition(
        updatedPretixDefinition.id
      )) as PretixPipelineDefinition;
      expect(emptyEditorsDefinition).to.exist;
      expect(emptyEditorsDefinition.editorUserIds).to.be.empty;
    }
  });

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
    "Lemonade tickets without user emails should not be loaded",
    async function () {
      mockServer.use(
        unregisteredUserTicketHandler(lemonadeBackend, lemonadeBackendUrl)
      );

      expectToExist(giService);
      const pipelines = await giService.getAllPipelines();
      const pipeline = pipelines.find(LemonadePipeline.is);
      expectToExist(pipeline);
      expect(pipeline.id).to.eq(edgeCityPipeline.id);
      const runInfo = await pipeline.load();

      // Despite receiving a ticket, the ticket was ignored due to lnot having
      // a user email
      expect(runInfo.atomsLoaded).to.eq(0);
    }
  );

  step(
    "Mix of valid and invalid Lemonade tickets results in only valid ones being accepted",
    async function () {
      expectToExist(giService);
      const pipelines = await giService.getAllPipelines();
      const pipeline = pipelines.find(LemonadePipeline.is);
      expectToExist(pipeline);
      expect(pipeline.id).to.eq(edgeCityPipeline.id);

      {
        // Two valid tickets
        const tickets: LemonadeTicket[] = [
          EdgeCityAttendeeTicket,
          EdgeCityDenverBouncerTicket
        ];
        mockServer.use(customTicketHandler(lemonadeBackendUrl, tickets));

        const runInfo = await pipeline.load();
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
          { ...EdgeCityDenverBouncerTicket, type_id: "" }
        ];
        mockServer.use(customTicketHandler(lemonadeBackendUrl, tickets));

        const runInfo = await pipeline.load();
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

  // TODO Test Pretix with invalid back-end responses

  step("Authenticated Generic Issuance Endpoints", async () => {
    expectToExist(giService);
    const pipelines = await giService.getAllPipelines();
    expectToExist(pipelines);
    expectLength(pipelines, 3);
    const edgeCityDenverPipeline = pipelines.find(LemonadePipeline.is);
    expectToExist(edgeCityDenverPipeline);
    const ethLatAmPipeline = pipelines.find(PretixPipeline.is);
    expectToExist(ethLatAmPipeline);

    // TODO
  });

  this.afterAll(async () => {
    await stopApplication(giBackend);
    mockServer.close();
  });
});

/**
 * Testing that the Generic Issuance backend calculates {@link InfoResult} about
 * pipeline {@link PretixPipeline} correctly by requesting it from the Generic
 * Issuance API routes.
 *
 * This endpoint is used by the Generic Issuance frontend to assist a user in
 * managing their {@link Pipeline}.
 *
 * TODO: incorporate auth
 */
async function checkPipelineInfoEndpoint(
  giBackend: Zupass,
  pipeline: Pipeline
): Promise<void> {
  const pipelineInfoResult: InfoResult = await requestPipelineInfo(
    "todo",
    giBackend.expressContext.localEndpoint,
    pipeline.id
  );
  expectFalse(pipelineInfoResult.success); // need to implement jwt spoofing
  // expectTrue(pipelineInfoResult.success);
  // expectLength(pipelineInfoResult.value.feeds, 1);
  // const pretixFeedInfo: PipelineFeedInfo | undefined =
  //   pipelineInfoResult.value.feeds?.[0];
  // expectToExist(pretixFeedInfo);
  // expect(pretixFeedInfo.name).to.eq(
  //   pipeline.issuanceCapability.options.feedDisplayName
  // );
  // expect(pretixFeedInfo.url).to.eq(pipeline.issuanceCapability.feedUrl);
  // TODO: more comprehensive pipeline info tests
}

/**
 * TODO: extract this to the `@pcd/passport-interface` package.
 */
export async function signFeedCredentialPayload(
  identity: Identity,
  payload: FeedCredentialPayload
): Promise<SerializedPCD<SemaphoreSignaturePCD>> {
  const signaturePCD = await SemaphoreSignaturePCDPackage.prove({
    identity: {
      argumentType: ArgumentTypeName.PCD,
      value: await SemaphoreIdentityPCDPackage.serialize(
        await SemaphoreIdentityPCDPackage.prove({
          identity: identity
        })
      )
    },
    signedMessage: {
      argumentType: ArgumentTypeName.String,
      value: JSON.stringify(payload)
    }
  });

  return await SemaphoreSignaturePCDPackage.serialize(signaturePCD);
}

/**
 * Requests tickets from a pipeline that is issuing {@link EdDSATicketPCD}s.
 */
export async function requestTicketsFromPipeline(
  expectedFolder: string,
  /**
   * Generated by {@code makeGenericIssuanceFeedUrl}.
   */
  feedUrl: string,
  feedId: string,
  /**
   * Rather than get an {@link EmailPCD} issued by the email feed
   * Zupass Server hosts, for testing purposes, we're generating
   * the email PCD on the fly inside this function using this key.
   */
  zupassEddsaPrivateKey: string,
  /**
   * Zupass Server attests that the given email address...
   */
  email: string,
  /**
   * Is owned by this identity.
   */
  identity: Identity
): Promise<EdDSATicketPCD[]> {
  const ticketPCDResponse = await requestPollFeed(feedUrl, {
    feedId: feedId,
    pcd: await signFeedCredentialPayload(
      identity,
      createFeedCredentialPayload(
        await EmailPCDPackage.serialize(
          await EmailPCDPackage.prove({
            privateKey: {
              value: zupassEddsaPrivateKey,
              argumentType: ArgumentTypeName.String
            },
            id: {
              value: "email-id",
              argumentType: ArgumentTypeName.String
            },
            emailAddress: {
              value: email,
              argumentType: ArgumentTypeName.String
            },
            semaphoreId: {
              value: identity.commitment.toString(),
              argumentType: ArgumentTypeName.String
            }
          })
        )
      )
    )
  });

  return getTicketsFromFeedResponse(expectedFolder, ticketPCDResponse);
}

/**
 * Extracts tickets from {@link PollFeedResult}. Expects tickets to be returned
 * in a single {@link ReplaceInFolderAction}. Checks that the first and only
 * {@link PCDAction}
 */
export function getTicketsFromFeedResponse(
  expectedFolder: string,
  result: PollFeedResult
): Promise<EdDSATicketPCD[]> {
  expectTrue(result.success);
  const firstAction = result.value.actions[0];
  expectIsReplaceInFolderAction(firstAction);
  expect(firstAction.folder).to.eq(expectedFolder);
  return Promise.all(
    firstAction.pcds.map((t) => EdDSATicketPCDPackage.deserialize(t.pcd))
  );
}

/**
 * Receivers of {@link EdDSATicketPCD} can 'check in' other holders of
 * tickets issued by the same feed, if their ticket's 'product type' has
 * been configured by the owner of the pipeline of this feed.
 */
export async function requestCheckInPipelineTicket(
  /**
   * {@link Pipeline}s can have a {@link CheckinCapability}
   */
  checkinRoute: string,
  zupassEddsaPrivateKey: string,
  checkerEmail: string,
  checkerIdentity: Identity,
  ticket: EdDSATicketPCD
): Promise<GenericIssuanceCheckInResult> {
  const checkerEmailPCD = await EmailPCDPackage.prove({
    privateKey: {
      value: zupassEddsaPrivateKey,
      argumentType: ArgumentTypeName.String
    },
    id: {
      value: "email-id",
      argumentType: ArgumentTypeName.String
    },
    emailAddress: {
      value: checkerEmail,
      argumentType: ArgumentTypeName.String
    },
    semaphoreId: {
      value: checkerIdentity.commitment.toString(),
      argumentType: ArgumentTypeName.String
    }
  });
  const serializedTicketCheckerEmailPCD =
    await EmailPCDPackage.serialize(checkerEmailPCD);

  const ticketCheckerPayload = createGenericCheckinCredentialPayload(
    serializedTicketCheckerEmailPCD,
    ticket.claim.ticket.ticketId,
    ticket.claim.ticket.eventId
  );

  const ticketCheckerFeedCredential = await signFeedCredentialPayload(
    checkerIdentity,
    ticketCheckerPayload
  );

  return requestGenericIssuanceCheckIn(
    checkinRoute,
    ticketCheckerFeedCredential
  );
}

function assertUserMatches(
  expectedUser: PipelineUser,
  actualUser: PipelineUser | undefined
): void {
  expect(actualUser).to.exist;
  expect(actualUser?.email).to.eq(expectedUser.email);
  expect(actualUser?.id).to.eq(expectedUser.id);
  expect(actualUser?.isAdmin).to.eq(expectedUser.isAdmin);
}
