import { CSVPipelineDefinition, PipelineType } from "@pcd/passport-interface";
import { randomUUID } from "@pcd/util";

/**
 * Creates test info required to test {@link CSVPipeline}.
 */
export function setupTestCSVPipelineDefinition(
  ownerId: string
): CSVPipelineDefinition {
  return {
    type: PipelineType.CSV,
    ownerUserId: ownerId,
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
  } satisfies CSVPipelineDefinition;
}
