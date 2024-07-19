import { getEdDSAPublicKey } from "@pcd/eddsa-pcd";
import {
  Credential,
  PODBOX_CREDENTIAL_REQUEST,
  PODPipelineDefinition,
  PollFeedResult,
  requestPollFeed
} from "@pcd/passport-interface";
import { expectIsReplaceInFolderAction } from "@pcd/pcd-collection";
import { PODPCDTypeName } from "@pcd/pod-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import { randomUUID } from "crypto";
import "mocha";
import { step } from "mocha-steps";
import * as MockDate from "mockdate";
import { stopApplication } from "../../../../src/application";
import { PipelineDefinitionDB } from "../../../../src/database/queries/pipelineDefinitionDB";
import { PipelineUserDB } from "../../../../src/database/queries/pipelineUserDB";
import { GenericIssuanceService } from "../../../../src/services/generic-issuance/GenericIssuanceService";
import { PODPipeline } from "../../../../src/services/generic-issuance/pipelines/PODPipeline/PODPipeline";
import { PipelineUser } from "../../../../src/services/generic-issuance/pipelines/types";
import { Zupass } from "../../../../src/types";
import { overrideEnvironment, testingEnv } from "../../../util/env";
import { startTestingApp } from "../../../util/startTestingApplication";
import { expectLength, expectToExist, expectTrue } from "../../../util/util";
import { assertUserMatches, makeTestCredential } from "../../util";
import { setupTestPODPipelineDefinition } from "./setupTestPODPipelineDefinition";

/**
 * Tests for {@link GenericIssuanceService}, in particular the {@link PODPipeline}.
 */
describe("generic issuance - PODPipeline", function () {
  const nowDate = new Date();
  const now = Date.now();

  let giBackend: Zupass;
  let giService: GenericIssuanceService;

  const adminGIUserId = randomUUID();
  const adminGIUserEmail = "admin@test.com";

  const podPipeline: PODPipelineDefinition =
    setupTestPODPipelineDefinition(adminGIUserId);

  const pipelineDefinitions = [podPipeline];

  /**
   * Sets up a Zupass/Generic issuance backend with one pipelines:
   * - {@link PODPipeline}, as defined by {@link setupTestPODPipelineDefinition}
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

    giService = giBackend.services
      .genericIssuanceService as GenericIssuanceService;
    await giService.stop();
    const pipelineDefinitionDB = new PipelineDefinitionDB(
      giBackend.context.dbPool
    );
    await pipelineDefinitionDB.deleteAllDefinitions();
    await pipelineDefinitionDB.upsertDefinitions(pipelineDefinitions);
    await giService.start(false);
  });

  this.beforeEach(async () => {
    MockDate.set(now);
  });

  this.afterEach(async () => {
    MockDate.reset();
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
  });

  step("PODPipeline", async function () {
    expectToExist(giService);
    const pipelines = await giService.getAllPipelineInstances();
    expectLength(pipelines, 1);
    const podPipeline = pipelines.find(PODPipeline.is);
    expectToExist(podPipeline);
    const loadRes = await podPipeline.load();
    expectTrue(loadRes.success);
    const identity = new Identity();
    const feedRes = await requestPODFeed(
      podPipeline.feedCapability.feedUrl,
      podPipeline.feedCapability.options.feedId,
      await makeTestCredential(
        identity,
        PODBOX_CREDENTIAL_REQUEST,
        "john.doe@example.com",
        testingEnv.SERVER_EDDSA_PRIVATE_KEY as string
      )
    );
    expectTrue(feedRes.success);
    expectLength(feedRes.value.actions, 2);
    const pcdsAction = feedRes.value.actions[1];
    expectIsReplaceInFolderAction(pcdsAction);
    expectLength(pcdsAction.pcds, 1);
    expect(pcdsAction.pcds[0].type).to.eq(PODPCDTypeName);
    expect(pcdsAction.folder).to.eq(
      podPipeline.feedCapability.options.feedFolder
    );
  });

  step("Authenticated Generic Issuance Endpoints", async () => {
    expectToExist(giService);
    const pipelines = await giService.getAllPipelineInstances();
    expectToExist(pipelines);
    expectLength(pipelines, 1);
    const podPipeline = pipelines.find(PODPipeline.is);
    expectToExist(podPipeline);
  });

  this.afterAll(async () => {
    await stopApplication(giBackend);
  });
});

async function requestPODFeed(
  url: string,
  feedId: string,
  credential: Credential
): Promise<PollFeedResult> {
  return requestPollFeed(url, { feedId, pcd: credential });
}
