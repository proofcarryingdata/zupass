/* eslint-disable @typescript-eslint/no-explicit-any */
import { getEdDSAPublicKey } from "@pcd/eddsa-pcd";
import {
  CSVPipelineDefinition,
  LemonadePipelineDefinition,
  PipelineType,
  PretixPipelineDefinition,
  isPretixPipelineDefinition,
  requestGenericIssuanceGetPipeline,
  requestGenericIssuanceUpsertPipeline
} from "@pcd/passport-interface";
import { randomUUID } from "@pcd/util";
import { expect } from "chai";
import "mocha";
import { step } from "mocha-steps";
import { PipelineDefinitionDB } from "../../src/database/queries/pipelineDefinitionDB";
import { PipelineUserDB } from "../../src/database/queries/pipelineUserDB";
import { PipelineUser } from "../../src/services/generic-issuance/pipelines/types";
import { uniqueIdsForPipelineDefinition } from "../../src/services/generic-issuance/subservices/utils/pipelineUniqueIds";
import { Zupass } from "../../src/types";
import { overrideEnvironment, testingEnv } from "../util/env";
import { startTestingApp } from "../util/startTestingApplication";
import { expectFalse, expectTrue } from "../util/util";
import { assertUserMatches } from "./util";

/**
 * Tests for {@link GenericIssuanceService}'s external API.
 */
describe.only("generic issuance - external API", function () {
  const nowDate = new Date();
  let giBackend: Zupass;

  const adminGIUserEmail = "admin@example.com";
  const adminGIUserId = randomUUID();

  const giUser1Email = "giuser1@example.com";
  const giUser1Id = randomUUID();

  const giUser2Email = "giuser2@example.com";
  const giUser2Id = randomUUID();

  const adminCsvPipelineDef: CSVPipelineDefinition = {
    type: PipelineType.CSV,
    ownerUserId: adminGIUserId,
    timeCreated: new Date().toISOString(),
    timeUpdated: new Date().toISOString(),
    id: randomUUID(),
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

  const user1CsvPipelineDef: CSVPipelineDefinition = {
    type: PipelineType.CSV,
    ownerUserId: adminGIUserId,
    timeCreated: new Date().toISOString(),
    timeUpdated: new Date().toISOString(),
    id: randomUUID(),
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

  const user2CsvPipelineDef: CSVPipelineDefinition = {
    type: PipelineType.CSV,
    ownerUserId: adminGIUserId,
    timeCreated: new Date().toISOString(),
    timeUpdated: new Date().toISOString(),
    id: randomUUID(),
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

  /**
   * Sets up a Zupass/Generic issuance backend.
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

    const user1: PipelineUser = {
      id: giUser1Id,
      email: giUser1Email,
      isAdmin: false,
      timeCreated: nowDate,
      timeUpdated: nowDate
    };
    await userDB.updateUserById(user1);
    assertUserMatches(
      {
        id: giUser1Id,
        email: giUser1Email,
        isAdmin: false,
        timeCreated: nowDate,
        timeUpdated: nowDate
      },
      await userDB.getUserById(user1.id)
    );

    const user2: PipelineUser = {
      id: giUser2Id,
      email: giUser2Email,
      isAdmin: false,
      timeCreated: nowDate,
      timeUpdated: nowDate
    };
    await userDB.updateUserById(user2);
    assertUserMatches(
      {
        id: giUser2Id,
        email: giUser2Email,
        isAdmin: false,
        timeCreated: nowDate,
        timeUpdated: nowDate
      },
      await userDB.getUserById(user2.id)
    );
  });

  step("verify that IDs are extracted from pipeline definitions", async () => {
    const pipelineId = randomUUID();
    const eventId = randomUUID();
    const productId = randomUUID();
    const semaphoreGroupId = randomUUID();
    const manualTicketId = randomUUID();

    const pretixDefinition: PretixPipelineDefinition = {
      id: pipelineId,
      ownerUserId: adminGIUserId,
      editorUserIds: [],
      options: {
        name: "Test pipeline",
        pretixAPIKey: "",
        pretixOrgUrl: "",
        events: [
          {
            name: "Test event",
            externalId: "external-id",
            genericIssuanceId: eventId,
            products: [
              {
                name: "Test product",
                externalId: "external-id",
                genericIssuanceId: productId,
                isSuperUser: false
              }
            ]
          }
        ],
        feedOptions: {
          feedId: "0",
          feedDescription: "",
          feedDisplayName: "Test",
          feedFolder: "Test"
        },
        semaphoreGroups: [
          {
            groupId: semaphoreGroupId,
            name: "Test",
            memberCriteria: []
          }
        ],
        manualTickets: [
          {
            id: manualTicketId,
            eventId: eventId,
            productId: productId,
            attendeeEmail: "test@example.com",
            attendeeName: "Test"
          }
        ]
      },
      type: PipelineType.Pretix,
      timeCreated: "",
      timeUpdated: ""
    };

    expect([
      pipelineId,
      eventId,
      productId,
      semaphoreGroupId,
      manualTicketId
    ]).to.deep.eq(uniqueIdsForPipelineDefinition(pretixDefinition));

    const lemonadeDefinition: LemonadePipelineDefinition = {
      id: pipelineId,
      ownerUserId: adminGIUserId,
      editorUserIds: [],
      options: {
        name: "Test pipeline",
        oauthAudience: "",
        oauthClientId: "",
        oauthClientSecret: "",
        oauthServerUrl: "",
        backendUrl: "",
        events: [
          {
            name: "Test event",
            externalId: "external-id",
            genericIssuanceEventId: eventId,
            ticketTypes: [
              {
                name: "Test product",
                externalId: "external-id",
                genericIssuanceProductId: productId,
                isSuperUser: false
              }
            ]
          }
        ],
        feedOptions: {
          feedId: "0",
          feedDescription: "",
          feedDisplayName: "Test",
          feedFolder: "Test"
        },
        semaphoreGroups: [
          {
            groupId: semaphoreGroupId,
            name: "Test",
            memberCriteria: []
          }
        ],
        manualTickets: [
          {
            id: manualTicketId,
            eventId: eventId,
            productId: productId,
            attendeeEmail: "test@example.com",
            attendeeName: "Test"
          }
        ]
      },
      type: PipelineType.Lemonade,
      timeCreated: "",
      timeUpdated: ""
    };

    expect([
      pipelineId,
      eventId,
      productId,
      semaphoreGroupId,
      manualTicketId
    ]).to.deep.eq(uniqueIdsForPipelineDefinition(lemonadeDefinition));

    const csvDefinition: CSVPipelineDefinition = {
      id: pipelineId,
      ownerUserId: adminGIUserId,
      editorUserIds: [],
      options: {
        feedOptions: {
          feedId: "0",
          feedDescription: "",
          feedDisplayName: "Test",
          feedFolder: "Test"
        },
        csv: ""
      },
      type: PipelineType.CSV,
      timeCreated: "",
      timeUpdated: ""
    };

    expect([pipelineId]).to.deep.eq(
      uniqueIdsForPipelineDefinition(csvDefinition)
    );
  });

  step("cannot reuse IDs within the same pipeline", async () => {
    let pipelineId = randomUUID();

    let definition: PretixPipelineDefinition = {
      id: pipelineId,
      ownerUserId: adminGIUserId,
      editorUserIds: [],
      options: {
        name: "Test pipeline",
        pretixAPIKey: "",
        pretixOrgUrl: "",
        events: [
          {
            name: "Test event",
            externalId: "external-id",
            genericIssuanceId: pipelineId, // Re-used ID
            products: []
          }
        ],
        feedOptions: {
          feedId: pipelineId, // Already used!
          feedDescription: "",
          feedDisplayName: "Test",
          feedFolder: "Test"
        }
      },
      type: PipelineType.Pretix,
      timeCreated: "",
      timeUpdated: ""
    };

    {
      const result = await requestGenericIssuanceUpsertPipeline(
        process.env.PASSPORT_SERVER_URL as string,
        { pipeline: definition, jwt: adminGIUserEmail }
      );

      expectFalse(result.success);
      expect(result.error).to.eq(
        `ID ${pipelineId} is used more than once in this pipeline`
      );
    }

    {
      // Replace the duplicate ID with a different one
      definition.options.events[0].genericIssuanceId = randomUUID();

      const result = await requestGenericIssuanceUpsertPipeline(
        process.env.PASSPORT_SERVER_URL as string,
        { pipeline: definition, jwt: adminGIUserEmail }
      );

      expectTrue(result.success);
      expectTrue(isPretixPipelineDefinition(result.value));

      // We want to get the server-side timestamps for updates
      definition = result.value as PretixPipelineDefinition;

      // Pipeline ID can change when being saved for the first time!
      pipelineId = definition.id;
    }

    {
      const eventId = randomUUID();
      definition.options.events = [
        {
          name: "Test event",
          externalId: "external-id",
          genericIssuanceId: eventId,
          products: [
            {
              name: "Test product",
              externalId: "external-id",
              genericIssuanceId: eventId, // Re-used ID,
              isSuperUser: false
            }
          ]
        }
      ];

      const result = await requestGenericIssuanceUpsertPipeline(
        process.env.PASSPORT_SERVER_URL as string,
        { pipeline: definition, jwt: adminGIUserEmail }
      );

      expectFalse(result.success);
      expect(result.error).to.eq(
        `ID ${eventId} is used more than once in this pipeline`
      );
    }

    {
      // Define separate unique IDs
      const eventId = randomUUID();
      const productId = randomUUID();
      definition.options.events = [
        {
          name: "Test event",
          externalId: "external-id",
          genericIssuanceId: eventId,
          products: [
            {
              name: "Test product",
              externalId: "external-id",
              genericIssuanceId: productId, // No longer conflicts
              isSuperUser: false
            }
          ]
        }
      ];

      const result = await requestGenericIssuanceUpsertPipeline(
        process.env.PASSPORT_SERVER_URL as string,
        { pipeline: definition, jwt: adminGIUserEmail }
      );

      expectTrue(result.success);
    }
  });

  step("cannot reuse IDs between pipelines", async () => {
    // Clean up anything from previous tests
    const pipelineDefinitionDB = new PipelineDefinitionDB(
      giBackend.context.dbPool
    );
    await pipelineDefinitionDB.deleteAllDefinitions();

    const firstPipelineId = randomUUID();
    const secondPipelineId = randomUUID();
    const eventId = randomUUID();
    const productId = randomUUID();

    let firstPipelineDefinition: PretixPipelineDefinition = {
      id: firstPipelineId,
      ownerUserId: adminGIUserId,
      editorUserIds: [],
      options: {
        name: "Test pipeline",
        pretixAPIKey: "",
        pretixOrgUrl: "",
        events: [
          {
            name: "Test event",
            externalId: "external-id",
            genericIssuanceId: eventId,
            products: [
              {
                name: "Test product",
                externalId: "external-id",
                genericIssuanceId: productId,
                isSuperUser: false
              }
            ]
          }
        ],
        feedOptions: {
          feedId: "0",
          feedDescription: "",
          feedDisplayName: "Test",
          feedFolder: "Test"
        }
      },
      type: PipelineType.Pretix,
      timeCreated: "",
      timeUpdated: ""
    };

    {
      const result = await requestGenericIssuanceUpsertPipeline(
        process.env.PASSPORT_SERVER_URL as string,
        { pipeline: firstPipelineDefinition, jwt: adminGIUserEmail }
      );

      expectTrue(result.success);
      // Ensure we get the timestamps from the result
      firstPipelineDefinition = result.value as PretixPipelineDefinition;
    }

    const secondPipelineDefinition: PretixPipelineDefinition = {
      id: secondPipelineId,
      ownerUserId: adminGIUserId,
      editorUserIds: [],
      options: {
        name: "Test pipeline",
        pretixAPIKey: "",
        pretixOrgUrl: "",
        events: [
          {
            name: "Test event",
            externalId: "external-id",
            genericIssuanceId: eventId,
            products: [
              {
                name: "Test product",
                externalId: "external-id",
                genericIssuanceId: productId,
                isSuperUser: false
              }
            ]
          }
        ],
        feedOptions: {
          feedId: "0",
          feedDescription: "",
          feedDisplayName: "Test",
          feedFolder: "Test"
        }
      },
      type: PipelineType.Pretix,
      timeCreated: "",
      timeUpdated: ""
    };

    {
      const result = await requestGenericIssuanceUpsertPipeline(
        process.env.PASSPORT_SERVER_URL as string,
        { pipeline: secondPipelineDefinition, jwt: adminGIUserEmail }
      );
      expectFalse(result.success);
    }
    {
      // Remove the conflict
      secondPipelineDefinition.options.events = [
        {
          name: "Test event",
          externalId: "external-id",
          genericIssuanceId: randomUUID(),
          products: [
            {
              name: "Test product",
              externalId: "external-id",
              genericIssuanceId: randomUUID(),
              isSuperUser: false
            }
          ]
        }
      ];
      const result = await requestGenericIssuanceUpsertPipeline(
        process.env.PASSPORT_SERVER_URL as string,
        { pipeline: secondPipelineDefinition, jwt: adminGIUserEmail }
      );
      expectTrue(result.success);
    }
  });

  step("users are able to create pipelines", async () => {
    {
      const res = await requestGenericIssuanceUpsertPipeline(
        giBackend.expressContext.localEndpoint,
        { jwt: adminGIUserEmail, pipeline: adminCsvPipelineDef }
      );

      expectTrue(res.success);
      expect(res.value?.id).to.eq(adminCsvPipelineDef.id);
    }

    {
      const res = await requestGenericIssuanceUpsertPipeline(
        giBackend.expressContext.localEndpoint,
        { jwt: giUser1Email, pipeline: user1CsvPipelineDef }
      );

      expectTrue(res.success);
      expect(res.value?.id).to.eq(user1CsvPipelineDef.id);
    }

    {
      const res = await requestGenericIssuanceUpsertPipeline(
        giBackend.expressContext.localEndpoint,
        { jwt: giUser2Email, pipeline: user2CsvPipelineDef }
      );

      expectTrue(res.success);
      expect(res.value?.id).to.eq(user2CsvPipelineDef.id);
    }
  });

  step("admins are able to get all pipelines", async () => {
    {
      const res = await requestGenericIssuanceGetPipeline(
        giBackend.expressContext.localEndpoint,
        adminCsvPipelineDef.id,
        adminGIUserEmail
      );

      expectTrue(res.success);
      expect(res.value?.id).to.eq(adminCsvPipelineDef.id);
    }

    {
      const res = await requestGenericIssuanceGetPipeline(
        giBackend.expressContext.localEndpoint,
        user1CsvPipelineDef.id,
        adminGIUserEmail
      );

      expectTrue(res.success);
      expect(res.value?.id).to.eq(user1CsvPipelineDef.id);
    }

    {
      const res = await requestGenericIssuanceGetPipeline(
        giBackend.expressContext.localEndpoint,
        user2CsvPipelineDef.id,
        adminGIUserEmail
      );

      expectTrue(res.success);
      expect(res.value?.id).to.eq(user2CsvPipelineDef.id);
    }
  });
});
