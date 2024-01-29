/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-restricted-globals */
import { expect } from "chai";
import { randomUUID } from "crypto";
import { Router } from "express";
import "mocha";
import {
  ILemonadeAPI,
  LemonadePipeline,
  LemonadePipelineDefinition,
  PipelineType,
  PretixPipeline,
  PretixPipelineDefinition,
  createPipeline,
  setupRoutesForPipelines
} from "../src/services/genericIssuanceService";
import { MockPipelineAtomDB } from "./generic-issuance/MockPipelineAtomDB";
import { LemonadeDataMocker } from "./lemonade/LemonadeDataMocker";
import { MockLemonadeAPI } from "./lemonade/MockLemonadeAPI";

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
describe.only("generic issuance declarations", function () {
  this.timeout(15_000);
  it("test", async () => {
    const mockData = new LemonadeDataMocker();
    const edgeCity = mockData.addEvent("edge city");
    const ivan = mockData.addUser("ivan");
    const ga = mockData.addTier(edgeCity.id, "ga");
    mockData.addTicket(ga.id, edgeCity.id, ivan.name);
    mockData.permissionUser(ivan.id, edgeCity.id);

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

    const lemonadeAPI: ILemonadeAPI = new MockLemonadeAPI(mockData);
    // TODO: implement real one
    const db = new MockPipelineAtomDB();
    const definitions = [
      examplePretixPipelineConfig,
      exampleLemonadePipelineConfig
    ];
    const pipelines = definitions.map((d) =>
      createPipeline(d, db, {
        lemonadeAPI
      })
    );

    const lemonadePipeline = pipelines.find(LemonadePipeline.is);
    const pretixPipeline = pipelines.find(PretixPipeline.is);

    expect(lemonadePipeline).to.not.be.undefined;
    expect(pretixPipeline).to.not.be.undefined;

    await lemonadePipeline!.load();

    // expect(db.data[lemonadePipeline!.id]).to.deep.eq({
    //   [mockLemonadeData.events[0].tickets[0].id]: {
    //     id: mockLemonadeData.events[0].tickets[0].id
    //   }
    // });

    const router = Router();

    setupRoutesForPipelines(router, pipelines);

    // todo: hit the routes XD
  });
});
