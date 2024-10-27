import { getEdDSAPublicKey } from "@pcd/eddsa-pcd";
import {
  CSVPipelineDefinition,
  PollFeedResult,
  requestPollFeed
} from "@pcd/passport-interface";
import { expectIsReplaceInFolderAction } from "@pcd/pcd-collection";
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
import { CSVPipeline } from "../../../../src/services/generic-issuance/pipelines/CSVPipeline/CSVPipeline";
import { PipelineUser } from "../../../../src/services/generic-issuance/pipelines/types";
import { Zupass } from "../../../../src/types";
import { overrideEnvironment, testingEnv } from "../../../util/env";
import { startTestingApp } from "../../../util/startTestingApplication";
import { expectLength, expectToExist, expectTrue } from "../../../util/util";
import { assertUserMatches } from "../../util";
import { setupTestCSVPipelineDefinition } from "./setupTestCSVPipelineDefinition";

/**
 * Tests for {@link GenericIssuanceService}, in particular the {@link CSVPipeline}.
 */
describe("generic issuance - CSVPipeline", function () {
  const nowDate = new Date();
  const now = Date.now();

  let giBackend: Zupass;
  let giService: GenericIssuanceService;

  let pool: Pool;
  let client: PoolClient;

  const adminGIUserId = randomUUID();
  const adminGIUserEmail = "admin@test.com";

  const csvPipeline: CSVPipelineDefinition =
    setupTestCSVPipelineDefinition(adminGIUserId);

  const pipelineDefinitions = [csvPipeline];

  /**
   * Sets up a Zupass/Generic issuance backend with one pipelines:
   * - {@link CSVPipeline}, as defined by {@link setupTestCSVPipelineDefinition}
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

  step("CSVPipeline", async function () {
    expectToExist(giService);
    const pipelines = await giService.getAllPipelineInstances();
    expectLength(pipelines, 1);
    const csvPipeline = pipelines.find(CSVPipeline.is);
    expectToExist(csvPipeline);
    const loadRes = await giService.performPipelineLoad(csvPipeline.id);
    expectTrue(loadRes.success);
    const feedRes = await requestCSVFeed(
      csvPipeline.feedCapability.feedUrl,
      csvPipeline.feedCapability.options.feedId
    );
    expectTrue(feedRes.success);
    expectLength(feedRes.value.actions, 2);
    const pcdsAction = feedRes.value.actions[1];
    expectIsReplaceInFolderAction(pcdsAction);
    expectLength(pcdsAction.pcds, 2);
    expect(pcdsAction.folder).to.eq(
      csvPipeline.feedCapability.options.feedFolder
    );
  });

  step("Authenticated Generic Issuance Endpoints", async () => {
    expectToExist(giService);
    const pipelines = await giService.getAllPipelineInstances();
    expectToExist(pipelines);
    expectLength(pipelines, 1);
    const csvPipeline = pipelines.find(CSVPipeline.is);
    expectToExist(csvPipeline);
  });

  this.afterAll(async () => {
    await stopApplication(giBackend);
  });
});

async function requestCSVFeed(
  url: string,
  feedId: string
): Promise<PollFeedResult> {
  return requestPollFeed(url, { feedId, pcd: undefined });
}
