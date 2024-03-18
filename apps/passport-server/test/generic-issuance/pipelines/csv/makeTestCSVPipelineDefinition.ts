import { CSVPipelineDefinition, PipelineType } from "@pcd/passport-interface";
import { randomUUID } from "@pcd/util";

export function makeTestCSVPipelineDefinition(
  ownerId: string
): CSVPipelineDefinition {
  return {
    type: PipelineType.CSV,
    ownerUserId: ownerId,
    timeCreated: new Date().toISOString(),
    timeUpdated: new Date().toISOString(),
    id: randomUUID(),
    /**
     * TODO: test that the API that lets the frontend make changes to {@link Pipeline}s
     * on the backend respects generic issuance user permissions. @richard
     */
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
