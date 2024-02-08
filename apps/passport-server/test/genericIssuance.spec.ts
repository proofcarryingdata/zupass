import { getEdDSAPublicKey, newEdDSAPrivateKey } from "@pcd/eddsa-pcd";
import {
  EdDSATicketPCD,
  EdDSATicketPCDPackage,
  expectIsEdDSATicketPCD
} from "@pcd/eddsa-ticket-pcd";
import { EmailPCDPackage } from "@pcd/email-pcd";
import {
  FeedCredentialPayload,
  GenericIssuanceCheckInResponseValue,
  GenericIssuanceCheckInResult,
  InfoResult,
  LemonadePipelineDefinition,
  PipelineDefinition,
  PipelineType,
  PollFeedResult,
  PretixPipelineDefinition,
  createFeedCredentialPayload,
  createGenericCheckinCredentialPayload,
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
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import { randomUUID } from "crypto";
import "mocha";
import { step } from "mocha-steps";
import { SetupServer } from "msw/node";
import {
  ILemonadeAPI,
  LemonadeTicket,
  LemonadeTicketTier,
  LemonadeUser
} from "../src/apis/lemonade/lemonadeAPI";
import {
  GenericPretixProduct,
  getI18nString
} from "../src/apis/pretix/genericPretixAPI";
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
import { LemonadeDataMocker } from "./lemonade/LemonadeDataMocker";
import { MockLemonadeAPI } from "./lemonade/MockLemonadeAPI";
import { GenericPretixDataMocker } from "./pretix/GenericPretixDataMocker";
import { getGenericMockPretixAPIServer } from "./pretix/MockGenericPretixServer";
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
describe.only("Generic Issuance", function () {
  this.timeout(15_000);

  let ZUPASS_EDDSA_PRIVATE_KEY: string;
  let giBackend: Zupass;
  let giService: GenericIssuanceService | null;

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

  /**
   * TODO: test ingestion of the data we'll need for production.
   */
  const EdgeCityDenver = lemonadeBackend.addEvent("Edge City Denver");

  /**
   * Attendee ticket tier. In reality there will be several.
   *
   * TODO: test that we can handle several attendee tiers.
   */
  const EdgeCityAttendeeTier: LemonadeTicketTier = lemonadeBackend.addTier(
    EdgeCityDenver.id,
    "ga"
  );
  const EdgeCityBouncerTier = lemonadeBackend.addTier(
    EdgeCityDenver.id,
    "bouncer"
  );

  /**
   * Most tests below need a person who is checking tickets {@link EdgeCityDenverBouncer}
   * and a person whose ticket needs to be checked in (@link Attendee)
   */
  const EdgeCityDenverAttendee: LemonadeUser =
    lemonadeBackend.addUser("attendee");
  const EdgeCityDenverAttendeeIdentity = new Identity();
  const EdgeCityAttendeeTicket: LemonadeTicket = lemonadeBackend.addTicket(
    EdgeCityAttendeeTier.id,
    EdgeCityDenver.id,
    EdgeCityDenverAttendee.name,
    EdgeCityDenverAttendee.email
  );

  /**
   * Similar to {@link EdgeCityDenverAttendee}
   * Person who has a {@link LemonadeTicket} that does not have a bouncer ticket,
   * i.e. a ticket whose 'product id' or 'tier' is set up to be a 'superuser' ticket
   * by the Generic Issuance User with id {@link edgeCityGIUserID}.
   */
  const EdgeCityDenverBouncer: LemonadeUser =
    lemonadeBackend.addUser("bouncer bob");
  const EdgeCityBouncerIdentity = new Identity();
  const EdgeCityDenverBouncerTicket = lemonadeBackend.addTicket(
    EdgeCityBouncerTier.id,
    EdgeCityDenver.id,
    EdgeCityDenverBouncer.name,
    EdgeCityDenverBouncer.email
  );
  lemonadeBackend.makeCoHost(EdgeCityDenverBouncer.id, EdgeCityDenver.id);
  const lemonadeAPI: ILemonadeAPI = new MockLemonadeAPI(lemonadeBackend);
  const lemonadePipelineDefinition: LemonadePipelineDefinition = {
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
      lemonadeApiKey: EdgeCityDenverBouncer.apiKey,
      events: [
        {
          externalId: EdgeCityDenver.id,
          name: EdgeCityDenver.name,
          genericIssuanceEventId: randomUUID(),
          ticketTiers: [
            {
              externalId: EdgeCityBouncerTier.id,
              genericIssuanceProductId: randomUUID(),
              isSuperUser: true
            },
            {
              externalId: EdgeCityAttendeeTier.id,
              genericIssuanceProductId: randomUUID(),
              isSuperUser: false
            }
          ]
        }
      ]
    },
    type: PipelineType.Lemonade
  };

  let pretixBackendServer: SetupServer;
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

  const pipelineDefinitions = [ethLatAmPipeline, lemonadePipelineDefinition];

  /**
   * Sets up a Zupass/Generic issuance backend with two pipelines:
   * - {@link LemonadePipeline}, as defined by {@link lemonadePipelineDefinition}
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
    pretixBackendServer = getGenericMockPretixAPIServer(
      pretixOrgUrls,
      pretixBackend
    );
    pretixBackendServer.listen({ onUnhandledRequest: "bypass" });

    ZUPASS_EDDSA_PRIVATE_KEY = process.env.SERVER_EDDSA_PRIVATE_KEY as string;
    giService = giBackend.services.genericIssuanceService;
    await giService?.stop();
    const pipelineDefinitionDB = new PipelineDefinitionDB(
      giBackend.context.dbPool
    );
    await pipelineDefinitionDB.clearAllDefinitions();
    await pipelineDefinitionDB.setDefinitions(pipelineDefinitions);
    await giService?.startPipelinesFromDefinitions();
    await giService?.executeAllPipelineLoads();
  });

  this.afterEach(async () => {
    pretixBackendServer.resetHandlers();
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
      expectLength(pipelines, 2);
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
        .to.eq(EdgeCityAttendeeTicket.email)
        .to.eq(EdgeCityDenverAttendee.email);

      const BouncerTickets = await requestTicketsFromPipeline(
        edgeCityDenverPipeline.issuanceCapability.options.feedFolder,
        edgeCityDenverTicketFeedUrl,
        edgeCityDenverPipeline.issuanceCapability.options.feedId,
        ZUPASS_EDDSA_PRIVATE_KEY,
        EdgeCityDenverBouncerTicket.email,
        EdgeCityBouncerIdentity
      );
      expectLength(BouncerTickets, 1);
      const BouncerTicket = BouncerTickets[0];
      expectIsEdDSATicketPCD(BouncerTicket);
      expect(BouncerTicket.claim.ticket.attendeeEmail)
        .to.eq(EdgeCityDenverBouncerTicket.email)
        .to.eq(EdgeCityDenverBouncer.email);

      const bouncerChecksInAttendee = await requestCheckInPipelineTicket(
        edgeCityDenverPipeline.checkinCapability.getCheckinUrl(),
        ZUPASS_EDDSA_PRIVATE_KEY,
        EdgeCityDenverBouncerTicket.email,
        EdgeCityBouncerIdentity,
        AttendeeTicket
      );
      expect(bouncerChecksInAttendee.value).to.deep.eq({ checkedIn: true });

      // can't check in a ticket that's already checked in
      const bouncerChecksInAttendeeAgain = await requestCheckInPipelineTicket(
        edgeCityDenverPipeline.checkinCapability.getCheckinUrl(),
        ZUPASS_EDDSA_PRIVATE_KEY,
        EdgeCityDenverBouncerTicket.email,
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
        EdgeCityAttendeeTicket.email,
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
          EdgeCityAttendeeTicket.email,
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
      expectLength(pipelines, 2);
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
      expectLength(definitions, 2);

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

  step("Authenticated Generic Issuance Endpoints", async () => {
    expectToExist(giService);
    const pipelines = await giService.getAllPipelines();
    expectToExist(pipelines);
    expectLength(pipelines, 2);
    const edgeCityDenverPipeline = pipelines.find(LemonadePipeline.is);
    expectToExist(edgeCityDenverPipeline);
    const ethLatAmPipeline = pipelines.find(PretixPipeline.is);
    expectToExist(ethLatAmPipeline);

    // TODO
  });

  this.afterAll(async () => {
    await stopApplication(giBackend);
    pretixBackendServer.close();
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
  feedPollId: string,
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
  const ticketPCDResponse = await requestPollFeed(feedPollId, {
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
