/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-restricted-globals */
import { EmailPCDPackage } from "@pcd/email-pcd";
import {
  FeedCredentialPayload,
  createFeedCredentialPayload,
  requestGenericIssuanceCheckin,
  requestPollFeed
} from "@pcd/passport-interface";
import { ArgumentTypeName, PCD, SerializedPCD } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import {
  SemaphoreSignaturePCD,
  SemaphoreSignaturePCDPackage
} from "@pcd/semaphore-signature-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import { randomUUID } from "crypto";
import "mocha";
import * as path from "path";
import { ILemonadeAPI } from "../src/apis/lemonade/lemonadeAPI";
import { stopApplication } from "../src/application";
import {
  LemonadePipeline,
  LemonadePipelineDefinition
} from "../src/services/generic-issuance/pipelines/LemonadePipeline";
import { PretixPipelineDefinition } from "../src/services/generic-issuance/pipelines/PretixPipeline";
import { PipelineType } from "../src/services/generic-issuance/pipelines/types";
import { Zupass } from "../src/types";
import { logger } from "../src/util/logger";
import { LemonadeDataMocker } from "./lemonade/LemonadeDataMocker";
import { MockLemonadeAPI } from "./lemonade/MockLemonadeAPI";
import { overrideEnvironment, testingEnv } from "./util/env";
import { startTestingApp } from "./util/startTestingApplication";
import { expectToExist, safeExit } from "./util/util";

// Takes a payload and wraps it in a signature PCD.
export async function semaphoreSignPayload(
  identity: Identity,
  payload: FeedCredentialPayload
): Promise<SerializedPCD<SemaphoreSignaturePCD>> {
  // In future we might support other types of signature here
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
 * Rough test of the generic issuance functionality defined in this PR, just
 * to make sure that ends are coming together neatly. Totally incomplete.
 *
 * TODO:
 * - finish this before shipping the {@link GenericIssuanceService}.
 * - comprehensive tests for both Pretix and Lemonade cases
 * - probably need to test the Capability route features of Pipelines
 * - probably need to test the iterative creation of Pipelines (cc @richard)
 */
describe.only("generic issuance service tests", function () {
  this.timeout(15_000);

  let application: Zupass;

  const mockLemonadeData = new LemonadeDataMocker();
  const edgeCity = mockLemonadeData.addEvent("edge city");
  const ticketHolder = mockLemonadeData.addUser("holder");
  const ticketChecker = mockLemonadeData.addUser("checker");
  const gaTier = mockLemonadeData.addTier(edgeCity.id, "ga");
  const checkerTier = mockLemonadeData.addTier(edgeCity.id, "checker");
  const gaTicket = mockLemonadeData.addTicket(
    gaTier.id,
    edgeCity.id,
    ticketHolder.name
  );
  const checkerTicket = mockLemonadeData.addTicket(
    checkerTier.id,
    edgeCity.id,
    ticketChecker.name
  );
  mockLemonadeData.permissionUser(ticketHolder.id, edgeCity.id);
  const lemonadeAPI: ILemonadeAPI = new MockLemonadeAPI(mockLemonadeData);

  const exampleLemonadePipelineConfig: LemonadePipelineDefinition = {
    ownerUserId: randomUUID(),
    id: randomUUID(),
    editorUserIds: [],
    options: {
      lemonadeApiKey: ticketHolder.apiKey,
      events: [
        {
          id: edgeCity.id,
          name: edgeCity.name,
          ticketTierIds: [gaTier.id]
        }
      ]
    },
    type: PipelineType.Lemonade
  };

  const examplePretixPipelineConfig: PretixPipelineDefinition = {
    ownerUserId: randomUUID(),
    id: randomUUID(),
    editorUserIds: [],
    options: {
      events: [
        {
          id: randomUUID(),
          name: "Eth LatAm",
          productIds: [randomUUID(), randomUUID()],
          superUserProductIds: [randomUUID()]
        }
      ],
      pretixAPIKey: randomUUID(),
      pretixOrgUrl: randomUUID()
    },
    type: PipelineType.Pretix
  };

  const definitions = [
    examplePretixPipelineConfig,
    exampleLemonadePipelineConfig
  ];

  this.beforeAll(async () => {
    await overrideEnvironment(testingEnv);

    application = await startTestingApp({
      lemonadeAPI
    });

    await application.services.genericIssuanceService?.stop();
    await application.context.pipelineDefinitionDB.clearAllDefinitions();
    await application.context.pipelineDefinitionDB.setDefinitions(definitions);
    await application.services.genericIssuanceService?.start();
  });

  this.afterAll(async () => {
    await stopApplication(application);
  });

  it("test", async () => {
    const pKey = process.env.SERVER_EDDSA_PRIVATE_KEY as string;

    const checkerIdentity = new Identity();
    const checkerEmailPCD = await EmailPCDPackage.prove({
      privateKey: {
        value: pKey,
        argumentType: ArgumentTypeName.String
      },
      id: {
        value: "email-id",
        argumentType: ArgumentTypeName.String
      },
      emailAddress: {
        value: checkerTicket.email,
        argumentType: ArgumentTypeName.String
      },
      semaphoreId: {
        value: checkerIdentity.commitment.toString(),
        argumentType: ArgumentTypeName.String
      }
    });

    const serializedCheckerEmailPCD =
      await EmailPCDPackage.serialize(checkerEmailPCD);

    const ticketHolderIdentity = new Identity();
    const ticketHolderEmailPCD = await EmailPCDPackage.prove({
      privateKey: {
        value: pKey,
        argumentType: ArgumentTypeName.String
      },
      id: {
        value: "email-id",
        argumentType: ArgumentTypeName.String
      },
      emailAddress: {
        value: ticketHolder.email,
        argumentType: ArgumentTypeName.String
      },
      semaphoreId: {
        value: ticketHolderIdentity.commitment.toString(),
        argumentType: ArgumentTypeName.String
      }
    });
    const serializedTicketHolderEmailPCD =
      await EmailPCDPackage.serialize(ticketHolderEmailPCD);

    const giService = application.services.genericIssuanceService;
    const pipelines = await giService?.getAllPipelines();

    expectToExist(pipelines);

    expect(pipelines).to.have.lengthOf(2);
    logger("the pipelines are", pipelines);

    const lemonadePipeline = pipelines.find(LemonadePipeline.is);
    expectToExist(lemonadePipeline);

    const urlRoot = application.expressContext.localEndpoint;
    const lemonadeIssuanceRoute = path.join(
      urlRoot,
      lemonadePipeline?.issuanceCapability.getFeedUrl()
    );

    logger(lemonadeIssuanceRoute);

    const ticketHolderFeedCredentialPayload = createFeedCredentialPayload(
      serializedTicketHolderEmailPCD
    );
    const ticketHolderFeedCredential = await semaphoreSignPayload(
      ticketHolderIdentity,
      ticketHolderFeedCredentialPayload
    );

    const ticketPCDResponse = await requestPollFeed(lemonadeIssuanceRoute, {
      feedId: "ticket-feed",
      pcd: ticketHolderFeedCredential
    });

    safeExit();

    const ticketHolderTicketPCD: PCD | undefined = undefined;
    const checkinRoute = path.join(
      urlRoot,
      lemonadePipeline.checkinCapability.getCheckinUrl()
    );

    const checkinCredentialPCD: SerializedPCD =
      await SemaphoreSignaturePCDPackage.serialize(
        await SemaphoreSignaturePCDPackage.prove({
          identity: {
            argumentType: ArgumentTypeName.PCD,
            value: await SemaphoreIdentityPCDPackage.serialize(
              await SemaphoreIdentityPCDPackage.prove({
                identity: checkerIdentity
              })
            )
          },
          signedMessage: {
            argumentType: ArgumentTypeName.String,
            value: ticketHolderTicketPCD ?? ""
          }
        })
      );

    logger(ticketPCDResponse, ticketHolderTicketPCD);
    logger("checkin route", checkinRoute);

    const checkinResult = await requestGenericIssuanceCheckin(
      checkinRoute,
      checkinCredentialPCD
    );

    logger("checkin result", checkinResult);
  });
});
