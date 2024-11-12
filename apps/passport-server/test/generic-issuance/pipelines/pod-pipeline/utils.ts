import {
  Credential,
  PODPipelineDefinition,
  PODPipelineInputFieldType,
  PODPipelineInputType,
  PODPipelinePCDTypes,
  PipelineType,
  PollFeedResult,
  requestPollFeed
} from "@pcd/passport-interface";
import { randomUUID } from "@pcd/util";
import { PipelineUserDB } from "../../../../src/database/queries/pipelineUserDB";
import { namedSqlTransaction } from "../../../../src/database/sqlQuery";
import { GenericIssuanceService } from "../../../../src/services/generic-issuance/GenericIssuanceService";
import { PODPipeline } from "../../../../src/services/generic-issuance/pipelines/PODPipeline/PODPipeline";
import { Zupass } from "../../../../src/types";
import { expectLength, expectToExist } from "../../../util/util";

/**
 * Creates test info required to test {@link PODPipeline}.
 */
export function setupTestPODPipelineDefinition(
  ownerId: string
): PODPipelineDefinition {
  return {
    type: PipelineType.POD,
    ownerUserId: ownerId,
    timeCreated: new Date().toISOString(),
    timeUpdated: new Date().toISOString(),
    id: randomUUID(),
    editorUserIds: [],
    options: {
      input: {
        type: PODPipelineInputType.CSV,
        csv: "id,first_name,last_name,email,high_score,birthday,is_approved\n768dab50-2dea-4fd7-86bd-212f091b7867,John,Doe,john.doe@example.com,30,1980-01-01,true\nf1304eac-e462-4d8f-b704-9e7aed2e0618,Jane,Doe,jane.doe@example.com,25,1985-02-02,",
        columns: {
          id: { type: PODPipelineInputFieldType.UUID },
          first_name: { type: PODPipelineInputFieldType.String },
          last_name: { type: PODPipelineInputFieldType.String },
          email: { type: PODPipelineInputFieldType.String },
          high_score: { type: PODPipelineInputFieldType.Int },
          birthday: { type: PODPipelineInputFieldType.Date },
          is_approved: { type: PODPipelineInputFieldType.Boolean }
        }
      },
      outputs: {
        output1: {
          entries: {
            id: {
              type: "string",
              source: { name: "id", type: "input" }
            },
            first_name: {
              type: "string",
              source: { name: "first_name", type: "input" }
            },
            last_name: {
              type: "string",
              source: { name: "last_name", type: "input" }
            },
            email: { type: "string", source: { name: "email", type: "input" } },
            high_score: {
              type: "int",
              source: { name: "high_score", type: "input" }
            },
            birthday: {
              type: "int",
              source: { name: "birthday", type: "input" }
            },
            is_approved: {
              type: "int",
              source: { name: "is_approved", type: "input" }
            }
          },
          pcdType: PODPipelinePCDTypes.PODPCD,
          match: {
            type: "email",
            entry: "email"
          }
        }
      },
      feedOptions: {
        feedId: "feedId",
        feedDisplayName: "feedDisplayName",
        feedDescription: "feedDescription",
        feedFolder: "feedFolder",
        feedType: "deleteAndReplace"
      }
    }
  } satisfies PODPipelineDefinition;
}

export async function updateAndRestartPipeline(
  giBackend: Zupass,
  giService: GenericIssuanceService,
  adminGIUserId: string,
  updateFn: (definition: PODPipelineDefinition) => void
): Promise<void> {
  return namedSqlTransaction(
    giBackend.context.dbPool,
    "updateAndRestartPipeline",
    async (client) => {
      const userDB = new PipelineUserDB();
      const adminUser = await userDB.getUserById(client, adminGIUserId);
      expectToExist(adminUser);

      const pipelines = await giService.getAllPipelineInstances();
      expectLength(pipelines, 1);
      const podPipeline = pipelines.find(PODPipeline.is);
      expectToExist(podPipeline);
      const latestPipeline = (await giService.getPipeline(
        client,
        podPipeline.id
      )) as PODPipelineDefinition;
      const newPipelineDefinition = structuredClone(latestPipeline);
      // Get the updates pipeline definition
      updateFn(newPipelineDefinition);

      const updateRes = await giService.upsertPipelineDefinition(
        client,
        adminUser,
        newPipelineDefinition
      );
      return updateRes.restartPromise;
    }
  );
}

export async function requestPODFeed(
  url: string,
  feedId: string,
  credential: Credential
): Promise<PollFeedResult> {
  return requestPollFeed(url, { feedId, pcd: credential });
}
