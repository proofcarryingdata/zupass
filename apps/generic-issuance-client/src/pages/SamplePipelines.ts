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
Dog,https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/American_Eskimo_Dog.jpg/720px-American_Eskimo_Dog.jpg
Cat,https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Cat_August_2010-4.jpg/2880px-Cat_August_2010-4.jpg
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
