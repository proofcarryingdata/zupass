import { getEdDSAPublicKey } from "@pcd/eddsa-pcd";
import {
  PODBOX_CREDENTIAL_REQUEST,
  PODPipelineDefinition
} from "@pcd/passport-interface";
import { expectIsReplaceInFolderAction } from "@pcd/pcd-collection";
import { PODEntries, PODPCDPackage, PODPCDTypeName } from "@pcd/pod-pcd";
import { uuidToBigInt } from "@pcd/util";
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
import { PODPipeline } from "../../../../src/services/generic-issuance/pipelines/PODPipeline/PODPipeline";
import { PipelineUser } from "../../../../src/services/generic-issuance/pipelines/types";
import { Zupass } from "../../../../src/types";
import { overrideEnvironment, testingEnv } from "../../../util/env";
import { startTestingApp } from "../../../util/startTestingApplication";
import { expectLength, expectToExist, expectTrue } from "../../../util/util";
import { assertUserMatches, makeTestCredential } from "../../util";
import {
  requestPODFeed,
  setupTestPODPipelineDefinition,
  updateAndRestartPipeline
} from "./utils";

/**
 * Tests for {@link GenericIssuanceService}, in particular the {@link PODPipeline}.
 */
describe("generic issuance - PODPipeline", function () {
  const nowDate = new Date();
  const now = Date.now();

  let giBackend: Zupass;
  let giService: GenericIssuanceService;

  let dbPool: Pool;
  let client: PoolClient;

  const adminGIUserId = randomUUID();
  const adminGIUserEmail = "admin@test.com";

  const podPipeline: PODPipelineDefinition =
    setupTestPODPipelineDefinition(adminGIUserId);

  const pipelineDefinitions = [podPipeline];

  const johnDoeUserIdentity = new Identity();
  const unknownUserIdentity = new Identity();

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
    dbPool = giBackend.context.dbPool;
    client = await dbPool.connect();

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

  /**
   * Basic end-to-end test showing that the pipeline loads successfully and
   * that PCDs can be successfully requested from a feed.
   */
  step("PODPipeline loads and serves feed request", async function () {
    expectToExist(giService);
    const pipelines = await giService.getAllPipelineInstances();
    expectLength(pipelines, 1);
    const podPipeline = pipelines.find(PODPipeline.is);
    expectToExist(podPipeline);
    const loadRes = await podPipeline.load();
    expectTrue(loadRes.success);
    expect(loadRes.atomsLoaded).to.eq(2);

    const feedRes = await requestPODFeed(
      podPipeline.feedCapability.feedUrl,
      podPipeline.feedCapability.options.feedId,
      await makeTestCredential(
        johnDoeUserIdentity,
        PODBOX_CREDENTIAL_REQUEST,
        // User email is present in the CSV input
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
    const pcd = await PODPCDPackage.deserialize(pcdsAction.pcds[0].pcd);
    expect(pcd.claim.entries).to.eql({
      id: {
        type: "string",
        value: "768dab50-2dea-4fd7-86bd-212f091b7867"
      },
      first_name: { type: "string", value: "John" },
      last_name: { type: "string", value: "Doe" },
      email: { type: "string", value: "john.doe@example.com" },
      high_score: { type: "int", value: 30n },
      birthday: {
        type: "int",
        value: BigInt(new Date("1980-01-01").getTime())
      },
      is_approved: { type: "int", value: BigInt(true) }
    } satisfies PODEntries);
  });

  /**
   * This test polls the feed with a user account whose email does not match
   * any of the emails in the CSV file. The result is an empty feed.
   */
  step("User with no PODs receives an empty feed", async function () {
    expectToExist(giService);
    const pipelines = await giService.getAllPipelineInstances();
    expectLength(pipelines, 1);
    const podPipeline = pipelines.find(PODPipeline.is);
    expectToExist(podPipeline);
    const loadRes = await podPipeline.load();
    expectTrue(loadRes.success);
    expect(loadRes.atomsLoaded).to.eq(2);

    const feedRes = await requestPODFeed(
      podPipeline.feedCapability.feedUrl,
      podPipeline.feedCapability.options.feedId,
      await makeTestCredential(
        unknownUserIdentity,
        PODBOX_CREDENTIAL_REQUEST,
        "unknown@example.com",
        testingEnv.SERVER_EDDSA_PRIVATE_KEY as string
      )
    );
    // Will still receive two actions, Delete and ReplaceInFolder, but the
    // ReplaceInFolder action will have no PCDs.
    expectTrue(feedRes.success);
    expectLength(feedRes.value.actions, 2);
    const pcdsAction = feedRes.value.actions[1];
    expectIsReplaceInFolderAction(pcdsAction);
    // Zero PCDs received
    expectLength(pcdsAction.pcds, 0);
    expect(pcdsAction.folder).to.eq(
      podPipeline.feedCapability.options.feedFolder
    );
  });

  /**
   * Feed outputs can be configured with a "match" filter. If the match type is
   * set to "none", then all PCDs on the pipeline will be served to any user
   * that requests a feed. If the match type is set to "email", then only PCDs
   * with an email address that matches the user's email address will be
   * served.
   *
   * This test sets the match type to "none" and verifies that the user
   * receives both of the PCDs available on this pipeline (there being two
   * input rows in the CSV file by default, see
   * {@link setupTestPODPipelineDefinition}).
   */
  step(
    "Feed can be configured to allow PCDs to be served to any user",
    async function () {
      expectToExist(giService);

      await updateAndRestartPipeline(
        giBackend,
        giService,
        adminGIUserId,
        (definition: PODPipelineDefinition) => {
          definition.options.outputs["output1"].match = {
            type: "none"
          };
        }
      );

      const pipelines = await giService.getAllPipelineInstances();
      expectLength(pipelines, 1);
      const podPipeline = pipelines.find(PODPipeline.is);
      expectToExist(podPipeline);
      const loadRes = await podPipeline.load();
      expectTrue(loadRes.success);
      expect(loadRes.atomsLoaded).to.eq(2);

      const feedRes = await requestPODFeed(
        podPipeline.feedCapability.feedUrl,
        podPipeline.feedCapability.options.feedId,
        await makeTestCredential(
          unknownUserIdentity,
          PODBOX_CREDENTIAL_REQUEST,
          "unknown@example.com",
          testingEnv.SERVER_EDDSA_PRIVATE_KEY as string
        )
      );
      // Will still receive two actions, Delete and ReplaceInFolder, but the
      // ReplaceInFolder action will have no PCDs.
      expectTrue(feedRes.success);
      expectLength(feedRes.value.actions, 2);
      const pcdsAction = feedRes.value.actions[1];
      expectIsReplaceInFolderAction(pcdsAction);
      // Two PCDs received
      expectLength(pcdsAction.pcds, 2);
      expect(pcdsAction.pcds[0].type).to.eq(PODPCDTypeName);
      expect(pcdsAction.pcds[1].type).to.eq(PODPCDTypeName);
      expect(pcdsAction.folder).to.eq(
        podPipeline.feedCapability.options.feedFolder
      );

      const firstPCD = await PODPCDPackage.deserialize(pcdsAction.pcds[0].pcd);
      expect(firstPCD.claim.entries).to.eql({
        id: {
          type: "string",
          value: "768dab50-2dea-4fd7-86bd-212f091b7867"
        },
        first_name: { type: "string", value: "John" },
        last_name: { type: "string", value: "Doe" },
        email: { type: "string", value: "john.doe@example.com" },
        high_score: { type: "int", value: 30n },
        birthday: {
          type: "int",
          value: BigInt(new Date("1980-01-01").getTime())
        },
        is_approved: { type: "int", value: BigInt(true) }
      } satisfies PODEntries);

      const secondPCD = await PODPCDPackage.deserialize(pcdsAction.pcds[1].pcd);
      expect(secondPCD.claim.entries).to.eql({
        id: {
          type: "string",
          value: "f1304eac-e462-4d8f-b704-9e7aed2e0618"
        },
        first_name: { type: "string", value: "Jane" },
        last_name: { type: "string", value: "Doe" },
        email: { type: "string", value: "jane.doe@example.com" },
        high_score: { type: "int", value: 25n },
        birthday: {
          type: "int",
          value: BigInt(new Date("1985-02-02").getTime())
        },
        is_approved: { type: "int", value: BigInt(false) }
      } satisfies PODEntries);

      // Restore original configuration
      await updateAndRestartPipeline(
        giBackend,
        giService,
        adminGIUserId,
        (definition: PODPipelineDefinition) => {
          definition.options.outputs["output1"].match = {
            type: "email",
            entry: "email"
          };
        }
      );
    }
  );

  /**
   * Output PCDs can be issued to users with matching email addresses. If
   * the user's email matches more than one row in the input CSV, then all
   * matching PCDs will be issued to the user.
   */
  step(
    "Multiple PCDs can be served to a user who appears multiple times in the input",
    async function () {
      await updateAndRestartPipeline(
        giBackend,
        giService,
        adminGIUserId,
        (definition: PODPipelineDefinition) => {
          // existing csv: "id,first_name,last_name,email,high_score,birthday,is_approved\n768dab50-2dea-4fd7-86bd-212f091b7867,John,Doe,john.doe@example.com,30,1980-01-01,true\nf1304eac-e462-4d8f-b704-9e7aed2e0618,Jane,Doe,jane.doe@example.com,25,1985-02-02,true\n"
          // Add another row, using the same email previously present, but
          // with a different high_score and birthday
          definition.options.input.csv =
            definition.options.input.csv +
            "\nb8fb8ad1-6a28-4626-9e31-267580a40134,John,Doe,john.doe@example.com,3000,1981-12-01,true";
        }
      );

      expectToExist(giService);
      const pipelines = await giService.getAllPipelineInstances();
      expectLength(pipelines, 1);
      const podPipeline = pipelines.find(PODPipeline.is);
      expectToExist(podPipeline);
      const loadRes = await podPipeline.load();
      expectTrue(loadRes.success);
      expect(loadRes.atomsLoaded).to.eq(3);

      const feedRes = await requestPODFeed(
        podPipeline.feedCapability.feedUrl,
        podPipeline.feedCapability.options.feedId,
        await makeTestCredential(
          johnDoeUserIdentity,
          PODBOX_CREDENTIAL_REQUEST,
          // User email as present in the CSV input
          "john.doe@example.com",
          testingEnv.SERVER_EDDSA_PRIVATE_KEY as string
        )
      );
      expectTrue(feedRes.success);
      expectLength(feedRes.value.actions, 2);
      const pcdsAction = feedRes.value.actions[1];
      expectIsReplaceInFolderAction(pcdsAction);
      // User receives two PCDs
      expectLength(pcdsAction.pcds, 2);
      expect(pcdsAction.pcds[0].type).to.eq(PODPCDTypeName);
      expect(pcdsAction.folder).to.eq(
        podPipeline.feedCapability.options.feedFolder
      );
      const firstPCD = await PODPCDPackage.deserialize(pcdsAction.pcds[0].pcd);
      expect(firstPCD.claim.entries).to.eql({
        id: {
          type: "string",
          value: "768dab50-2dea-4fd7-86bd-212f091b7867"
        },
        first_name: { type: "string", value: "John" },
        last_name: { type: "string", value: "Doe" },
        email: { type: "string", value: "john.doe@example.com" },
        high_score: { type: "int", value: 30n },
        birthday: {
          type: "int",
          value: BigInt(new Date("1980-01-01").getTime())
        },
        is_approved: { type: "int", value: BigInt(true) }
      } satisfies PODEntries);

      const secondPCD = await PODPCDPackage.deserialize(pcdsAction.pcds[1].pcd);
      expect(secondPCD.claim.entries).to.eql({
        id: {
          type: "string",
          value: "b8fb8ad1-6a28-4626-9e31-267580a40134"
        },
        first_name: { type: "string", value: "John" },
        last_name: { type: "string", value: "Doe" },
        email: { type: "string", value: "john.doe@example.com" },
        high_score: { type: "int", value: 3000n },
        birthday: {
          type: "int",
          value: BigInt(new Date("1981-12-01").getTime())
        },
        is_approved: { type: "int", value: BigInt(true) }
      } satisfies PODEntries);
    }
  );

  /**
   * Outputs can be configured to convert inputs into different types. For
   * example, a date input could be presented as a string, or as an int, and a
   * UUID could be output as a string or as a "cryptographic" type.
   *
   * This test reconfigures the output type for birthday, high_score, id,
   * and is_approved, and verifies that the user receives the PCDs with these
   * new types.
   */
  step("Output type can be re-configured", async function () {
    await updateAndRestartPipeline(
      giBackend,
      giService,
      adminGIUserId,
      (definition: PODPipelineDefinition) => {
        // Change the output type for birthday, high_score, and id
        // Birthday derives from a date input
        definition.options.outputs["output1"].entries["birthday"].type =
          "string";
        // High score derives from an int input
        definition.options.outputs["output1"].entries["high_score"].type =
          "string";
        // ID derives from a UUID input
        definition.options.outputs["output1"].entries["id"].type =
          "cryptographic";
        // is_approved derives from a boolean input
        definition.options.outputs["output1"].entries["is_approved"].type =
          "string";
      }
    );

    expectToExist(giService);
    const pipelines = await giService.getAllPipelineInstances();
    expectLength(pipelines, 1);
    const podPipeline = pipelines.find(PODPipeline.is);
    expectToExist(podPipeline);
    const loadRes = await podPipeline.load();
    expectTrue(loadRes.success);
    expect(loadRes.atomsLoaded).to.eq(3);

    const feedRes = await requestPODFeed(
      podPipeline.feedCapability.feedUrl,
      podPipeline.feedCapability.options.feedId,
      await makeTestCredential(
        johnDoeUserIdentity,
        PODBOX_CREDENTIAL_REQUEST,
        // User email as present in the CSV input
        "john.doe@example.com",
        testingEnv.SERVER_EDDSA_PRIVATE_KEY as string
      )
    );
    expectTrue(feedRes.success);
    expectLength(feedRes.value.actions, 2);
    const pcdsAction = feedRes.value.actions[1];
    expectIsReplaceInFolderAction(pcdsAction);
    // User receives two PCDs
    expectLength(pcdsAction.pcds, 2);
    expect(pcdsAction.pcds[0].type).to.eq(PODPCDTypeName);
    expect(pcdsAction.folder).to.eq(
      podPipeline.feedCapability.options.feedFolder
    );

    const firstPCD = await PODPCDPackage.deserialize(pcdsAction.pcds[0].pcd);
    expect(firstPCD.claim.entries).to.eql({
      id: {
        type: "cryptographic",
        value: uuidToBigInt("768dab50-2dea-4fd7-86bd-212f091b7867")
      },
      first_name: { type: "string", value: "John" },
      last_name: { type: "string", value: "Doe" },
      email: { type: "string", value: "john.doe@example.com" },
      high_score: { type: "string", value: "30" },
      birthday: { type: "string", value: new Date("1980-01-01").toISOString() },
      is_approved: { type: "string", value: "true" }
    } satisfies PODEntries);

    const secondPCD = await PODPCDPackage.deserialize(pcdsAction.pcds[1].pcd);
    expect(secondPCD.claim.entries).to.eql({
      id: {
        type: "cryptographic",
        value: uuidToBigInt("b8fb8ad1-6a28-4626-9e31-267580a40134")
      },
      first_name: { type: "string", value: "John" },
      last_name: { type: "string", value: "Doe" },
      email: { type: "string", value: "john.doe@example.com" },
      high_score: { type: "string", value: "3000" },
      birthday: { type: "string", value: new Date("1981-12-01").toISOString() },
      is_approved: { type: "string", value: "true" }
    } satisfies PODEntries);
  });

  step("Feed type can be reconfigured to skip deletion", async function () {
    await updateAndRestartPipeline(
      giBackend,
      giService,
      adminGIUserId,
      (definition: PODPipelineDefinition) => {
        definition.options.feedOptions.feedType = "replace";
      }
    );

    expectToExist(giService);
    const pipelines = await giService.getAllPipelineInstances();
    expectLength(pipelines, 1);
    const podPipeline = pipelines.find(PODPipeline.is);
    expectToExist(podPipeline);
    const loadRes = await podPipeline.load();
    expectTrue(loadRes.success);
    expect(loadRes.atomsLoaded).to.eq(3);

    const feedRes = await requestPODFeed(
      podPipeline.feedCapability.feedUrl,
      podPipeline.feedCapability.options.feedId,
      await makeTestCredential(
        johnDoeUserIdentity,
        PODBOX_CREDENTIAL_REQUEST,
        // User email as present in the CSV input
        "john.doe@example.com",
        testingEnv.SERVER_EDDSA_PRIVATE_KEY as string
      )
    );
    expectTrue(feedRes.success);
    // There will be no delete action, as distinct from all previous tests
    expectLength(feedRes.value.actions, 1);
    const pcdsAction = feedRes.value.actions[0];
    expectIsReplaceInFolderAction(pcdsAction);
    // User receives two PCDs
    expectLength(pcdsAction.pcds, 2);
    expect(pcdsAction.pcds[0].type).to.eq(PODPCDTypeName);
    expect(pcdsAction.folder).to.eq(
      podPipeline.feedCapability.options.feedFolder
    );
  });

  this.afterAll(async () => {
    await stopApplication(giBackend);
  });
});
