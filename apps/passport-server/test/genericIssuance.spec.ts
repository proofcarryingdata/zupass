/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-restricted-globals */
import { pollFeed } from "@pcd/passport-interface";
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
import { expectToExist } from "./util/util";

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
  const ivan = mockLemonadeData.addUser("ivan");
  const ga = mockLemonadeData.addTier(edgeCity.id, "ga");
  mockLemonadeData.addTicket(ga.id, edgeCity.id, ivan.name);
  mockLemonadeData.permissionUser(ivan.id, edgeCity.id);
  const lemonadeAPI: ILemonadeAPI = new MockLemonadeAPI(mockLemonadeData);

  const exampleLemonadePipelineConfig: LemonadePipelineDefinition = {
    ownerUserId: randomUUID(),
    id: randomUUID(),
    editorUserIds: [],
    options: {
      lemonadeApiKey: ivan.apiKey,
      events: [
        {
          id: edgeCity.id,
          name: edgeCity.name,
          ticketTierIds: [ga.id]
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
    const userIdentity = new Identity();
    const giService = application.services.genericIssuanceService;
    const pipelines = await giService?.getAllPipelines();

    expectToExist(pipelines);

    expect(pipelines).to.have.lengthOf(2);
    logger("the pipelines are", pipelines);

    const lemonadePipeline = pipelines.find(LemonadePipeline.is);
    expectToExist<LemonadePipeline>(lemonadePipeline);

    const urlRoot = application.expressContext.localEndpoint;
    const lemonadeIssuanceRoute = path.join(
      urlRoot,
      lemonadePipeline?.issuanceCapability.getFeedUrl()
    );

    logger(lemonadeIssuanceRoute);

    const result = await pollFeed(
      lemonadeIssuanceRoute,
      userIdentity,
      "",
      lemonadePipeline.issuanceCapability.feedId
    );

    logger(result);
  });
});
