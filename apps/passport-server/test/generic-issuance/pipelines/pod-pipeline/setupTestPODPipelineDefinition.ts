import {
  PODPipelineDefinition,
  PODPipelineInputFieldType,
  PODPipelineInputType,
  PODPipelinePCDTypes,
  PipelineType
} from "@pcd/passport-interface";
import { randomUUID } from "@pcd/util";

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
          high_score: { type: PODPipelineInputFieldType.Integer },
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
        feedFolder: "feedFolder"
      }
    }
  } satisfies PODPipelineDefinition;
}
