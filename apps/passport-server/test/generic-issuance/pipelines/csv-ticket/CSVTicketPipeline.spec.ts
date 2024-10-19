import { getEdDSAPublicKey } from "@pcd/eddsa-pcd";
import { expectIsEdDSATicketPCD } from "@pcd/eddsa-ticket-pcd";
import { CSVTicketPipelineDefinition } from "@pcd/passport-interface";
import { expectIsPODTicketPCD } from "@pcd/pod-ticket-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import { randomUUID } from "crypto";
import "mocha";
import { step } from "mocha-steps";
import * as MockDate from "mockdate";
import { Pool, PoolClient } from "postgres-pool";
import { stopApplication } from "../../../../src/application";
import { PipelineDefinitionDB } from "../../../../src/database/queries/pipelineDefinitionDB";
import { PipelineUserDB } from "../../../../src/database/queries/pipelineUserDB";
import { GenericIssuanceService } from "../../../../src/services/generic-issuance/GenericIssuanceService";
import { CSVTicketPipeline } from "../../../../src/services/generic-issuance/pipelines/CSVTicketPipeline/CSVTicketPipeline";
import { PipelineUser } from "../../../../src/services/generic-issuance/pipelines/types";
import { Zupass } from "../../../../src/types";
import { overrideEnvironment, testingEnv } from "../../../util/env";
import { startTestingApp } from "../../../util/startTestingApplication";
import { expectLength, expectToExist, expectTrue } from "../../../util/util";
import { assertUserMatches, requestTicketsFromPipeline } from "../../util";
import { setupTestCSVTicketPipelineDefinition } from "./setupTestCSVTicketPipelineDefinition";

/**
 * Tests for {@link GenericIssuanceService}, in particular the {@link CSVTicketPipeline}.
 */
describe("generic issuance - CSVTicketPipeline", function () {
  const nowDate = new Date();
  const now = Date.now();

  let giBackend: Zupass;
  let giService: GenericIssuanceService;

  let pool: Pool;
  let client: PoolClient;

  const adminGIUserId = randomUUID();
  const adminGIUserEmail = "admin@test.com";

  const csvTicketPipelineDefinition: CSVTicketPipelineDefinition =
    setupTestCSVTicketPipelineDefinition(adminGIUserId);

  const pipelineDefinitions = [csvTicketPipelineDefinition];

  const gaIdentity = new Identity();

  /**
   * Sets up a Zupass/Generic issuance backend with one pipelines:
   * - {@link CSVTicketPipeline}, as defined by {@link setupTestCSVTicketPipelineDefinition}
   */
  this.beforeAll(async () => {
    const zupassPublicKey = JSON.stringify(
      await getEdDSAPublicKey(testingEnv.SERVER_EDDSA_PRIVATE_KEY as string)
    );

    await overrideEnvironment({
      GENERIC_ISSUANCE_ZUPASS_PUBLIC_KEY: zupassPublicKey,
      ...testingEnv
    });

    giBackend = await startTestingApp();
    pool = giBackend.context.dbPool;
    client = await pool.connect();

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

    giService = giBackend.services
      .genericIssuanceService as GenericIssuanceService;
    await giService.stop();
    const pipelineDefinitionDB = new PipelineDefinitionDB();
    await pipelineDefinitionDB.deleteAllDefinitions(client);
    await pipelineDefinitionDB.upsertDefinitions(client, pipelineDefinitions);
    await giService.start(false);
  });

  this.beforeEach(async () => {
    MockDate.set(now);
  });

  this.afterEach(async () => {
    MockDate.reset();
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
  });

  step("can request tickets", async function () {
    expectToExist(giService);
    const pipelines = await giService.getAllPipelineInstances();
    expectLength(pipelines, 1);
    const csvTicketPipeline = pipelines.find(CSVTicketPipeline.is);
    expectToExist(csvTicketPipeline);
    const loadRes = await csvTicketPipeline.load();
    expectTrue(loadRes.success);
    const tickets = await requestTicketsFromPipeline(
      csvTicketPipeline.feedCapability.options.feedFolder,
      csvTicketPipeline.feedCapability.feedUrl,
      csvTicketPipeline.feedCapability.options.feedId,
      testingEnv.SERVER_EDDSA_PRIVATE_KEY as string,
      "gabe@gmail.com",
      gaIdentity,
      true
    );
    expectLength(tickets, 2);
    const ticket = tickets[0];
    expectIsEdDSATicketPCD(ticket);
    expect(ticket.claim.ticket.attendeeEmail).to.eq("gabe@gmail.com");
    const ticket2 = tickets[1];
    expectIsPODTicketPCD(ticket2);
    expect(ticket2.claim.ticket.attendeeEmail).to.eq("gabe@gmail.com");
  });

  step("will not receive tickets for user with no tickets", async () => {
    expectToExist(giService);
    const pipelines = await giService.getAllPipelineInstances();
    expectLength(pipelines, 1);
    const csvTicketPipeline = pipelines.find(CSVTicketPipeline.is);
    expectToExist(csvTicketPipeline);
    const loadRes = await csvTicketPipeline.load();
    expectTrue(loadRes.success);
    const tickets = await requestTicketsFromPipeline(
      csvTicketPipeline.feedCapability.options.feedFolder,
      csvTicketPipeline.feedCapability.feedUrl,
      csvTicketPipeline.feedCapability.options.feedId,
      testingEnv.SERVER_EDDSA_PRIVATE_KEY as string,
      "no-tickets@gmail.com",
      new Identity(),
      true
    );

    expect(tickets).to.have.length(0);
  });

  step("Authenticated Generic Issuance Endpoints", async () => {
    expectToExist(giService);
    const pipelines = await giService.getAllPipelineInstances();
    expectToExist(pipelines);
    expectLength(pipelines, 1);
    const csvTicketPipeline = pipelines.find(CSVTicketPipeline.is);
    expectToExist(csvTicketPipeline);
  });

  this.afterAll(async () => {
    await stopApplication(giBackend);
  });
});
