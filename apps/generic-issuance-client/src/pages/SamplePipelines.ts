import {
  CSVPipelineDefinition,
  LemonadePipelineDefinition,
  PipelineType
} from "@pcd/passport-interface";

export const SAMPLE_LEMONADE_PIPELINE = JSON.stringify(
  {
    type: PipelineType.Lemonade,
    timeCreated: new Date().toISOString(),
    timeUpdated: new Date().toISOString(),
    editorUserIds: [],
    options: {
      lemonadeApiKey: "your-lemonade-api-key",
      events: [],
      feedOptions: {
        feedId: "example-feed-id",
        feedDisplayName: "Example Feed",
        feedDescription: "Your description here...",
        feedFolder: "Example Folder"
      }
    }
  } satisfies Partial<LemonadePipelineDefinition>,
  null,
  2
);

const SAMPLE_CSV_DATA = `Title,Image
Test title 1,Img 1
Test title 2,Img 2
`;

export const SAMPLE_CSV_PIPELINE = JSON.stringify(
  {
    type: PipelineType.CSV,
    timeCreated: new Date().toISOString(),
    timeUpdated: new Date().toISOString(),
    editorUserIds: [],
    options: {
      csv: SAMPLE_CSV_DATA,
      feedOptions: {
        feedId: "0",
        feedDisplayName: "CSV Feed",
        feedDescription: "A Feed backed by a CSV",
        feedFolder: "goodies"
      }
    }
  } satisfies Partial<CSVPipelineDefinition>,
  null,
  2
);
