/* eslint-disable @typescript-eslint/no-explicit-any */
import { getEdDSAPublicKey } from "@pcd/eddsa-pcd";
import {
  CSVPipelineDefinition,
  LemonadePipelineDefinition,
  PipelineType,
  PretixPipelineDefinition,
  isPretixPipelineDefinition,
  requestGenericIssuanceDeletePipeline,
  requestGenericIssuanceGetPipeline,
  requestGenericIssuanceUpsertPipeline,
  requestPipelineInfo
} from "@pcd/passport-interface";
import { randomUUID } from "@pcd/util";
import { expect } from "chai";
import "mocha";
import { step } from "mocha-steps";
import { Pool, PoolClient } from "postgres-pool";
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
describe("generic issuance - external API", function () {
  const nowDate = new Date();

  let giBackend: Zupass;
  let client: PoolClient;
  let pool: Pool;

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
    pool = giBackend.context.dbPool;
    client = await pool.connect();
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

    const user1: PipelineUser = {
      id: giUser1Id,
      email: giUser1Email,
      isAdmin: false,
      timeCreated: nowDate,
      timeUpdated: nowDate
    };
    await userDB.updateUserById(client, user1);
    assertUserMatches(
      {
        id: giUser1Id,
        email: giUser1Email,
        isAdmin: false,
        timeCreated: nowDate,
        timeUpdated: nowDate
      },
      await userDB.getUserById(client, user1.id)
    );

    const user2: PipelineUser = {
      id: giUser2Id,
      email: giUser2Email,
      isAdmin: false,
      timeCreated: nowDate,
      timeUpdated: nowDate
    };
    await userDB.updateUserById(client, user2);
    assertUserMatches(
      {
        id: giUser2Id,
        email: giUser2Email,
        isAdmin: false,
        timeCreated: nowDate,
        timeUpdated: nowDate
      },
      await userDB.getUserById(client, user2.id)
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
    const pipelineDefinitionDB = new PipelineDefinitionDB();
    await pipelineDefinitionDB.deleteAllDefinitions(client);

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

      const infoRes = await requestPipelineInfo(
        adminGIUserEmail,
        giBackend.expressContext.localEndpoint,
        adminCsvPipelineDef.id
      );
      expectTrue(infoRes.success);
      expect(infoRes.value?.ownerEmail).to.eq(adminGIUserEmail);
    }

    {
      const res = await requestGenericIssuanceGetPipeline(
        giBackend.expressContext.localEndpoint,
        user1CsvPipelineDef.id,
        adminGIUserEmail
      );
      expectTrue(res.success);
      expect(res.value?.id).to.eq(user1CsvPipelineDef.id);

      const infoRes = await requestPipelineInfo(
        adminGIUserEmail,
        giBackend.expressContext.localEndpoint,
        user1CsvPipelineDef.id
      );
      expectTrue(infoRes.success);
      expect(infoRes.value?.ownerEmail).to.eq(giUser1Email);
    }

    {
      const res = await requestGenericIssuanceGetPipeline(
        giBackend.expressContext.localEndpoint,
        user2CsvPipelineDef.id,
        adminGIUserEmail
      );
      expectTrue(res.success);
      expect(res.value?.id).to.eq(user2CsvPipelineDef.id);

      const infoRes = await requestPipelineInfo(
        adminGIUserEmail,
        giBackend.expressContext.localEndpoint,
        user2CsvPipelineDef.id
      );
      expectTrue(infoRes.success);
      expect(infoRes.value?.ownerEmail).to.eq(giUser2Email);
    }
  });

  step("non-admins can only get their own pipelines", async () => {
    {
      const pRes = await requestGenericIssuanceGetPipeline(
        giBackend.expressContext.localEndpoint,
        user1CsvPipelineDef.id,
        giUser1Email
      );
      expectTrue(pRes.success);
      expect(pRes.value?.id).to.eq(user1CsvPipelineDef.id);

      const infoRes = await requestPipelineInfo(
        giUser1Email,
        giBackend.expressContext.localEndpoint,
        user1CsvPipelineDef.id
      );
      expectTrue(infoRes.success);
      expect(infoRes.value?.ownerEmail).to.eq(giUser1Email);
    }

    {
      const res = await requestGenericIssuanceGetPipeline(
        giBackend.expressContext.localEndpoint,
        user2CsvPipelineDef.id,
        giUser1Email
      );
      expectFalse(res.success);

      const infoRes = await requestPipelineInfo(
        giUser1Email,
        giBackend.expressContext.localEndpoint,
        user2CsvPipelineDef.id
      );
      expectFalse(infoRes.success);
    }

    {
      const res = await requestGenericIssuanceGetPipeline(
        giBackend.expressContext.localEndpoint,
        adminCsvPipelineDef.id,
        giUser1Email
      );
      expectFalse(res.success);

      const infoRes = await requestPipelineInfo(
        giUser1Email,
        giBackend.expressContext.localEndpoint,
        adminCsvPipelineDef.id
      );
      expectFalse(infoRes.success);
    }

    {
      const res = await requestGenericIssuanceGetPipeline(
        giBackend.expressContext.localEndpoint,
        user2CsvPipelineDef.id,
        giUser2Email
      );

      expectTrue(res.success);
      expect(res.value?.id).to.eq(user2CsvPipelineDef.id);

      const infoRes = await requestPipelineInfo(
        giUser2Email,
        giBackend.expressContext.localEndpoint,
        user2CsvPipelineDef.id
      );
      expectTrue(infoRes.success);
      expect(infoRes.value?.ownerEmail).to.eq(giUser2Email);
    }

    {
      const res = await requestGenericIssuanceGetPipeline(
        giBackend.expressContext.localEndpoint,
        user1CsvPipelineDef.id,
        giUser2Email
      );
      expectFalse(res.success);

      const infoRes = await requestPipelineInfo(
        giUser2Email,
        giBackend.expressContext.localEndpoint,
        user1CsvPipelineDef.id
      );
      expectFalse(infoRes.success);
    }

    {
      const res = await requestGenericIssuanceGetPipeline(
        giBackend.expressContext.localEndpoint,
        adminCsvPipelineDef.id,
        giUser2Email
      );
      expectFalse(res.success);

      const infoRes = await requestPipelineInfo(
        giUser2Email,
        giBackend.expressContext.localEndpoint,
        adminCsvPipelineDef.id
      );
      expectFalse(infoRes.success);
    }
  });

  step("admins can update all pipelines", async () => {
    const newNote = "Updated by admin";

    for (const pipeline of [
      adminCsvPipelineDef,
      user1CsvPipelineDef,
      user2CsvPipelineDef
    ]) {
      const dlRes = await requestGenericIssuanceGetPipeline(
        giBackend.expressContext.localEndpoint,
        pipeline.id,
        adminGIUserEmail
      );
      expectTrue(dlRes.success);

      const updatedPipeline: CSVPipelineDefinition = {
        ...(dlRes.value as CSVPipelineDefinition),
        options: {
          ...(dlRes.value as CSVPipelineDefinition).options,
          notes: newNote
        }
      };

      const res = await requestGenericIssuanceUpsertPipeline(
        giBackend.expressContext.localEndpoint,
        { jwt: adminGIUserEmail, pipeline: updatedPipeline }
      );

      expectTrue(res.success);
      expect(res.value?.id).to.eq(pipeline.id);

      const getRes = await requestGenericIssuanceGetPipeline(
        giBackend.expressContext.localEndpoint,
        pipeline.id,
        adminGIUserEmail
      );

      expectTrue(getRes.success);
      expect(getRes.value?.options.notes).to.eq(newNote);
    }
  });

  step("non-admins can only update their own pipelines", async () => {
    const newNote = "Updated by user 1";

    // user 1 updates their own pipeline
    {
      const dlRes = await requestGenericIssuanceGetPipeline(
        giBackend.expressContext.localEndpoint,
        user1CsvPipelineDef.id,
        adminGIUserEmail
      );
      expectTrue(dlRes.success);

      const updatedPipeline: CSVPipelineDefinition = {
        ...(dlRes.value as CSVPipelineDefinition),
        options: {
          ...(dlRes.value as CSVPipelineDefinition).options,
          notes: newNote
        }
      };

      const res = await requestGenericIssuanceUpsertPipeline(
        giBackend.expressContext.localEndpoint,
        { jwt: giUser1Email, pipeline: updatedPipeline }
      );

      expectTrue(res.success);
      expect(res.value?.id).to.eq(user1CsvPipelineDef.id);

      const getRes = await requestGenericIssuanceGetPipeline(
        giBackend.expressContext.localEndpoint,
        user1CsvPipelineDef.id,
        giUser1Email
      );

      expectTrue(getRes.success);
      expect(getRes.value?.options.notes).to.eq(newNote);
    }

    // user 1 cannot update admin's pipeline
    {
      const updatedPipeline: CSVPipelineDefinition = {
        ...adminCsvPipelineDef,
        options: {
          ...adminCsvPipelineDef.options,
          notes: newNote
        }
      };

      const res = await requestGenericIssuanceUpsertPipeline(
        giBackend.expressContext.localEndpoint,
        { jwt: giUser1Email, pipeline: updatedPipeline }
      );

      expectFalse(res.success);
    }

    // user 1 cannot update other user's pipeline
    {
      const updatedPipeline: CSVPipelineDefinition = {
        ...user2CsvPipelineDef,
        options: {
          ...user2CsvPipelineDef.options,
          notes: newNote
        }
      };

      const res = await requestGenericIssuanceUpsertPipeline(
        giBackend.expressContext.localEndpoint,
        { jwt: giUser1Email, pipeline: updatedPipeline }
      );

      expectFalse(res.success);
    }
  });

  step("admins can delete all pipelines", async () => {
    // user 1 creates another csv pipeline
    const newPipelineDef: CSVPipelineDefinition = {
      ...user1CsvPipelineDef,
      id: randomUUID(),
      timeCreated: new Date().toISOString(),
      timeUpdated: new Date().toISOString()
    };

    const createRes = await requestGenericIssuanceUpsertPipeline(
      giBackend.expressContext.localEndpoint,
      { jwt: giUser1Email, pipeline: newPipelineDef }
    );

    expectTrue(createRes.success);
    expect(createRes.value?.id).to.eq(newPipelineDef.id);

    // admin deletes user 1's pipeline
    const deleteRes = await requestGenericIssuanceDeletePipeline(
      giBackend.expressContext.localEndpoint,
      newPipelineDef.id,
      adminGIUserEmail
    );

    expectTrue(deleteRes.success);

    // Verify the pipeline is deleted
    const getRes = await requestGenericIssuanceGetPipeline(
      giBackend.expressContext.localEndpoint,
      newPipelineDef.id,
      adminGIUserEmail
    );

    expectFalse(getRes.success);
  });

  step("non-admins can only delete their own pipelines", async () => {
    // user 1 fails to delete admin's pipeline
    {
      const deleteRes = await requestGenericIssuanceDeletePipeline(
        giBackend.expressContext.localEndpoint,
        adminCsvPipelineDef.id,
        giUser1Email
      );

      expectFalse(deleteRes.success);
    }

    // user 1 fails to delete other user's pipeline
    {
      const deleteRes = await requestGenericIssuanceDeletePipeline(
        giBackend.expressContext.localEndpoint,
        user2CsvPipelineDef.id,
        giUser1Email
      );

      expectFalse(deleteRes.success);
    }

    // user 1 creates another csv pipeline
    const newPipelineDef: CSVPipelineDefinition = {
      ...user1CsvPipelineDef,
      id: randomUUID(),
      timeCreated: new Date().toISOString(),
      timeUpdated: new Date().toISOString()
    };

    const createRes = await requestGenericIssuanceUpsertPipeline(
      giBackend.expressContext.localEndpoint,
      { jwt: giUser1Email, pipeline: newPipelineDef }
    );

    expectTrue(createRes.success);
    expect(createRes.value?.id).to.eq(newPipelineDef.id);

    // user 1 deletes their own pipeline
    const deleteRes = await requestGenericIssuanceDeletePipeline(
      giBackend.expressContext.localEndpoint,
      newPipelineDef.id,
      giUser1Email
    );

    expectTrue(deleteRes.success);

    // Verify the pipeline is deleted
    const getRes = await requestGenericIssuanceGetPipeline(
      giBackend.expressContext.localEndpoint,
      newPipelineDef.id,
      giUser1Email
    );

    expectFalse(getRes.success);
  });

  step("non-users cannot perform any pipeline operations", async () => {
    const nonUserToken = randomUUID();

    const newPipelineDef: CSVPipelineDefinition = {
      ...adminCsvPipelineDef,
      id: randomUUID(),
      timeCreated: new Date().toISOString(),
      timeUpdated: new Date().toISOString()
    };

    // Attempt to create a pipeline
    const createRes = await requestGenericIssuanceUpsertPipeline(
      giBackend.expressContext.localEndpoint,
      {
        jwt: nonUserToken,
        pipeline: newPipelineDef
      }
    );
    expectFalse(createRes.success);

    // Attempt to get a pipeline
    const getRes = await requestGenericIssuanceGetPipeline(
      giBackend.expressContext.localEndpoint,
      adminCsvPipelineDef.id,
      nonUserToken
    );
    expectFalse(getRes.success);

    // Attempt to delete a pipeline
    const deleteRes = await requestGenericIssuanceDeletePipeline(
      giBackend.expressContext.localEndpoint,
      adminCsvPipelineDef.id,
      nonUserToken
    );
    expectFalse(deleteRes.success);

    // Attempt to get pipeline info
    const infoRes = await requestPipelineInfo(
      nonUserToken,
      giBackend.expressContext.localEndpoint,
      adminCsvPipelineDef.id
    );
    expectFalse(infoRes.success);
  });
});
