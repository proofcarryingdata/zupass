import { EdDSATicketPCD, EdDSATicketPCDPackage } from "@pcd/eddsa-ticket-pcd";
import { EmailPCDPackage } from "@pcd/email-pcd";
import {
  FeedCredentialPayload,
  GenericIssuanceCheckInResult,
  createFeedCredentialPayload,
  createGenericCheckinCredentialPayload,
  requestGenericIssuanceCheckin,
  requestPollFeed
} from "@pcd/passport-interface";
import { ReplaceInFolderAction } from "@pcd/pcd-collection";
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
import { SetupServer } from "msw/node";
import * as path from "path";
import { ILemonadeAPI } from "../src/apis/lemonade/lemonadeAPI";
import { getI18nString } from "../src/apis/pretix/genericPretixAPI";
import { stopApplication } from "../src/application";
import { GenericIssuanceService } from "../src/services/generic-issuance/genericIssuanceService";
import {
  LemonadePipeline,
  LemonadePipelineDefinition
} from "../src/services/generic-issuance/pipelines/LemonadePipeline";
import {
  PretixPipeline,
  PretixPipelineDefinition
} from "../src/services/generic-issuance/pipelines/PretixPipeline";
import { PipelineType } from "../src/services/generic-issuance/pipelines/types";
import { Zupass } from "../src/types";
import { LemonadeDataMocker } from "./lemonade/LemonadeDataMocker";
import { MockLemonadeAPI } from "./lemonade/MockLemonadeAPI";
import { GenericPretixDataMocker } from "./pretix/GenericPretixDataMocker";
import { getGenericMockPretixAPIServer } from "./pretix/MockGenericPretixServer";
import { overrideEnvironment, testingEnv } from "./util/env";
import { startTestingApp } from "./util/startTestingApplication";
import { expectToExist } from "./util/util";

export async function semaphoreSignPayload(
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

export async function requestGenericTickets(
  url: string,
  zupassEddsaPrivateKey: string,
  email: string,
  identity: Identity
): Promise<EdDSATicketPCD[]> {
  const ticketHolderEmailPCD = await EmailPCDPackage.prove({
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
  });
  const serializedTicketHolderEmailPCD =
    await EmailPCDPackage.serialize(ticketHolderEmailPCD);
  const ticketHolderFeedCredentialPayload = createFeedCredentialPayload(
    serializedTicketHolderEmailPCD
  );
  const ticketHolderFeedCredential = await semaphoreSignPayload(
    identity,
    ticketHolderFeedCredentialPayload
  );
  const ticketPCDResponse = await requestPollFeed(url, {
    feedId: "ticket-feed",
    pcd: ticketHolderFeedCredential
  });

  if (!ticketPCDResponse.success) {
    throw new Error("expected to be able to hit the generic issuance feed");
  }

  const firstAction = ticketPCDResponse.value
    .actions[0] as ReplaceInFolderAction;
  const serializedTickets: SerializedPCD<EdDSATicketPCD>[] = firstAction.pcds;
  const tickets = await Promise.all(
    serializedTickets.map((t) => EdDSATicketPCDPackage.deserialize(t.pcd))
  );
  return tickets;
}

export async function requestCheckInGenericTicket(
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
    await EdDSATicketPCDPackage.serialize(ticket)
  );

  const ticketCheckerFeedCredential = await semaphoreSignPayload(
    checkerIdentity,
    ticketCheckerPayload
  );

  return requestGenericIssuanceCheckin(
    checkinRoute,
    ticketCheckerFeedCredential
  );
}

/**
 * Rough test of the generic issuance functionality defined in this PR, just
 * to make sure that ends are coming together neatly. Totally incomplete.
 *
 * TODO:
 * - finish this before shipping the {@link GenericIssuanceService}.
 * - comprehensive tests for both Pretix and Lemonade cases
 * - probably need to test the Capability route features of Pipelines
 * - probably need to test the iterative creation of Pipelines (cc @richard)
 */
describe("generic issuance service tests", function () {
  this.timeout(15_000);

  let ZUPASS_EDDSA_PRIVATE_KEY: string;
  let URL_ROOT: string;
  let application: Zupass;
  let giService: GenericIssuanceService | null;
  let mockPretixServer: SetupServer;

  const mockLemonadeData = new LemonadeDataMocker();
  const edgeCityLemonadeEvent = mockLemonadeData.addEvent("edge city");

  const lemonadeGATier = mockLemonadeData.addTier(
    edgeCityLemonadeEvent.id,
    "ga"
  );
  const lemonadeCheckerTier = mockLemonadeData.addTier(
    edgeCityLemonadeEvent.id,
    "checker"
  );

  const ticketHolderLemonadeUser = mockLemonadeData.addUser("holder");
  const ticketHolderZupassIdentity = new Identity();
  const ticketHolderLemonadeTicket = mockLemonadeData.addTicket(
    lemonadeGATier.id,
    edgeCityLemonadeEvent.id,
    ticketHolderLemonadeUser.name,
    ticketHolderLemonadeUser.email
  );

  const ticketCheckerLemonadeUser = mockLemonadeData.addUser("checker");
  const ticketCheckerZupassIdentity = new Identity();
  const ticketCheckerLemonadeTicket = mockLemonadeData.addTicket(
    lemonadeCheckerTier.id,
    edgeCityLemonadeEvent.id,
    ticketCheckerLemonadeUser.name,
    ticketCheckerLemonadeUser.email
  );

  mockLemonadeData.permissionUser(
    ticketCheckerLemonadeUser.id,
    edgeCityLemonadeEvent.id
  );

  const lemonadeAPI: ILemonadeAPI = new MockLemonadeAPI(mockLemonadeData);

  const lemonadeDefinition: LemonadePipelineDefinition = {
    ownerUserId: randomUUID(),
    id: randomUUID(),
    editorUserIds: [],
    options: {
      lemonadeApiKey: ticketCheckerLemonadeUser.apiKey,
      events: [
        {
          externalId: edgeCityLemonadeEvent.id,
          name: edgeCityLemonadeEvent.name,
          genericIssuanceEventId: randomUUID(),
          ticketTiers: [
            {
              externalId: lemonadeCheckerTier.id,
              genericIssuanceProductId: randomUUID(),
              isSuperUser: true
            },
            {
              externalId: lemonadeGATier.id,
              genericIssuanceProductId: randomUUID(),
              isSuperUser: false
            }
          ]
        }
      ]
    },
    type: PipelineType.Lemonade
  };

  const mockPretixData = new GenericPretixDataMocker();

  const pretixOrganizer = mockPretixData.get().organizer1;
  const pretixEvent = pretixOrganizer.eventA;
  const pretixProducts = pretixOrganizer.itemsByEventID.get(pretixEvent.slug);
  const pretixSuperuserItemIds = [pretixProducts?.[1].id];

  const ticketHolderPretixEmail = pretixOrganizer.EMAIL_3;
  const checkerPretixEmail = pretixOrganizer.EMAIL_1;

  const pretixDefinition: PretixPipelineDefinition = {
    ownerUserId: randomUUID(),
    id: randomUUID(),
    editorUserIds: [],
    options: {
      events: [
        {
          genericIssuanceId: randomUUID(),
          externalId: pretixEvent.slug,
          name: "Eth LatAm",
          products: (pretixProducts ?? []).map((product) => {
            return {
              externalId: product.id.toString(),
              name: getI18nString(product.name),
              genericIssuanceId: randomUUID(),
              isSuperUser: pretixSuperuserItemIds.includes(product.id)
            };
          })
        }
      ],
      pretixAPIKey: pretixOrganizer.token,
      pretixOrgUrl: pretixOrganizer.orgUrl
    },
    type: PipelineType.Pretix
  };

  const pipelineDefinitions = [pretixDefinition, lemonadeDefinition];

  this.beforeAll(async () => {
    await overrideEnvironment(testingEnv);
    application = await startTestingApp({
      lemonadeAPI
    });

    const orgUrls = mockPretixData.get().organizersByOrgUrl.keys();
    mockPretixServer = getGenericMockPretixAPIServer(orgUrls, mockPretixData);
    mockPretixServer.listen({ onUnhandledRequest: "bypass" });

    ZUPASS_EDDSA_PRIVATE_KEY = process.env.SERVER_EDDSA_PRIVATE_KEY as string;
    URL_ROOT = application.expressContext.localEndpoint;
    giService = application.services.genericIssuanceService;
    await giService?.stop();
    await application.context.pipelineDefinitionDB.clearAllDefinitions();
    await application.context.pipelineDefinitionDB.setDefinitions(
      pipelineDefinitions
    );
    await giService?.start();
  });

  this.afterEach(async () => {
    mockPretixServer.resetHandlers();
  });

  it("test", async () => {
    expectToExist(giService);
    const pipelines = await giService.getAllPipelines();
    expectToExist(pipelines);
    expect(pipelines).to.have.lengthOf(2);
    const lemonadePipeline = pipelines.find(LemonadePipeline.is);
    expectToExist(lemonadePipeline);

    const lemonadeIssuanceRoute = path.join(
      URL_ROOT,
      lemonadePipeline?.issuanceCapability.getFeedUrl()
    );

    const holderIssuedTickets = await requestGenericTickets(
      lemonadeIssuanceRoute,
      ZUPASS_EDDSA_PRIVATE_KEY,
      ticketHolderLemonadeUser.email,
      ticketHolderZupassIdentity
    );
    expect(holderIssuedTickets.length).to.eq(1);
    const firstHolderTicket = holderIssuedTickets[0];
    expect(firstHolderTicket.claim.ticket.attendeeEmail)
      .to.eq(ticketHolderLemonadeTicket.email)
      .to.eq(ticketHolderLemonadeUser.email);

    const checkerIssuedTickets = await requestGenericTickets(
      lemonadeIssuanceRoute,
      ZUPASS_EDDSA_PRIVATE_KEY,
      ticketCheckerLemonadeTicket.email,
      ticketCheckerZupassIdentity
    );
    expect(checkerIssuedTickets.length).to.eq(1);
    const firstCheckerTicket = checkerIssuedTickets[0];
    expect(firstCheckerTicket.claim.ticket.attendeeEmail)
      .to.eq(ticketCheckerLemonadeTicket.email)
      .to.eq(ticketCheckerLemonadeUser.email);

    const lemonadeCheckInRoute = path.join(
      URL_ROOT,
      lemonadePipeline?.checkinCapability.getCheckinUrl()
    );

    const firstCheckinResult = await requestCheckInGenericTicket(
      lemonadeCheckInRoute,
      ZUPASS_EDDSA_PRIVATE_KEY,
      ticketCheckerLemonadeTicket.email,
      ticketCheckerZupassIdentity,
      firstHolderTicket
    );
    expect(firstCheckinResult.success).to.eq(true);

    // can't check in a ticket that's already checked in
    const secondCheckinResult = await requestCheckInGenericTicket(
      lemonadeCheckInRoute,
      ZUPASS_EDDSA_PRIVATE_KEY,
      ticketCheckerLemonadeTicket.email,
      ticketCheckerZupassIdentity,
      firstHolderTicket
    );
    expect(secondCheckinResult.success).to.eq(false);

    // can't check in a ticket using a ticket that isn't a
    // superuser ticket
    const thirdCheckinResult = await requestCheckInGenericTicket(
      lemonadeCheckInRoute,
      ZUPASS_EDDSA_PRIVATE_KEY,
      ticketHolderLemonadeTicket.email,
      ticketHolderZupassIdentity,
      firstCheckerTicket
    );
    expect(thirdCheckinResult.success).to.eq(false);
  });

  it("test pretix", async () => {
    expectToExist(giService);
    const pipelines = await giService.getAllPipelines();
    expectToExist(pipelines);
    expect(pipelines).to.have.lengthOf(2);
    const pretixPipeline = pipelines.find(PretixPipeline.is);
    expectToExist(pretixPipeline);
    const pretixIssuanceRoute = path.join(
      URL_ROOT,
      pretixPipeline?.issuanceCapability.getFeedUrl()
    );

    const holderIssuedTickets = await requestGenericTickets(
      pretixIssuanceRoute,
      ZUPASS_EDDSA_PRIVATE_KEY,
      ticketHolderPretixEmail,
      ticketHolderZupassIdentity
    );

    expect(holderIssuedTickets.length).to.eq(1);
    const firstHolderTicket = holderIssuedTickets[0];
    expect(firstHolderTicket.claim.ticket.attendeeEmail).to.eq(
      ticketHolderPretixEmail
    );

    const checkerIssuedTickets = await requestGenericTickets(
      pretixIssuanceRoute,
      ZUPASS_EDDSA_PRIVATE_KEY,
      checkerPretixEmail,
      ticketCheckerZupassIdentity
    );
    expect(checkerIssuedTickets.length).to.eq(6);
    const firstCheckerTicket = checkerIssuedTickets[0];
    expect(firstCheckerTicket.claim.ticket.attendeeEmail).to.eq(
      checkerPretixEmail
    );

    const pretixCheckinRoute = path.join(
      URL_ROOT,
      pretixPipeline?.checkinCapability.getCheckinUrl()
    );

    const firstCheckinResult = await requestCheckInGenericTicket(
      pretixCheckinRoute,
      ZUPASS_EDDSA_PRIVATE_KEY,
      checkerPretixEmail,
      ticketCheckerZupassIdentity,
      firstHolderTicket
    );
    expect(firstCheckinResult.success).to.eq(true);

    // can't check in a ticket that's already checked in
    const secondCheckinResult = await requestCheckInGenericTicket(
      pretixCheckinRoute,
      ZUPASS_EDDSA_PRIVATE_KEY,
      checkerPretixEmail,
      ticketCheckerZupassIdentity,
      firstHolderTicket
    );
    expect(secondCheckinResult.success).to.eq(false);

    // can't check in a ticket using a ticket that isn't a
    // superuser ticket
    const thirdCheckinResult = await requestCheckInGenericTicket(
      pretixCheckinRoute,
      ZUPASS_EDDSA_PRIVATE_KEY,
      ticketHolderPretixEmail,
      ticketHolderZupassIdentity,
      firstCheckerTicket
    );
    expect(thirdCheckinResult.success).to.eq(false);
  });

  this.afterAll(async () => {
    await stopApplication(application);
    mockPretixServer.close();
  });
});
