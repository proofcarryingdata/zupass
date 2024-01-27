/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-restricted-globals */
import { expect } from "chai";
import { randomUUID } from "crypto";
import { Router } from "express";
import "mocha";
import {
  ILemonadeAPI,
  LemonadeEvent,
  LemonadePipeline,
  LemonadePipelineDefinition,
  MockLemonadeAPI,
  MockPipelineAtomDB,
  PipelineType,
  PretixPipeline,
  PretixPipelineDefinition,
  createPipeline,
  setupRoutes
} from "../src/services/genericIssuanceService";

describe.only("generic issuance declarations", function () {
  this.timeout(15_000);
  it("test", async () => {
    expect(true).to.be.true;

    const mockLemonadeData = {
      events: [
        {
          id: "edge-city-id",
          name: "edge city",
          tiers: [
            {
              id: "ga",
              name: "general admission"
            }
          ],
          tickets: [
            {
              id: randomUUID(),
              eventId: "edge-city-id",
              name: "ivan chub",
              tierId: "ga"
            }
          ]
        }
      ] satisfies LemonadeEvent[]
    } as const;

    const exampleLemonadePipelineConfig: LemonadePipelineDefinition = {
      ownerUserId: randomUUID(),
      id: randomUUID(),
      editorUserIds: [],
      options: {
        lemonadeApiKey: "allowed",
        events: [
          {
            id: "edge-city-id",
            name: "Edge City",
            ticketTiers: ["ga"]
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

    const lemonadeAPI: ILemonadeAPI = new MockLemonadeAPI(mockLemonadeData);
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

    expect(db.data[lemonadePipeline!.id]).to.deep.eq({
      [mockLemonadeData.events[0].tickets[0].id]: {
        id: mockLemonadeData.events[0].tickets[0].id
      }
    });

    const router = Router();

    setupRoutes(router, pipelines);

    // todo: hit the routes XD
  });
});
