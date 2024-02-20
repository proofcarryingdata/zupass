import {
  CSVPipelineDefinition,
  CSVPipelineOutputType,
  FeedIssuanceOptions,
  LemonadePipelineDefinition,
  PipelineType
} from "@pcd/passport-interface";

export const DEFAULT_FEED_OPTIONS = {
  feedId: "example-feed-id",
  feedDisplayName: "Example Feed",
  feedDescription: "Your description here...",
  feedFolder: "Example Folder"
} satisfies FeedIssuanceOptions;

export const SAMPLE_LEMONADE_PIPELINE = JSON.stringify(
  {
    type: PipelineType.Lemonade,
    timeCreated: new Date().toISOString(),
    timeUpdated: new Date().toISOString(),
    editorUserIds: [],
    options: {
      paused: true,
      name: "test name",
      notes: "test notes",
      oauthAudience: "",
      oauthClientId: "",
      oauthClientSecret: "",
      oauthServerUrl: "",
      backendUrl: "",
      events: [],
      feedOptions: DEFAULT_FEED_OPTIONS
    }
  } satisfies Partial<LemonadePipelineDefinition>,
  null,
  2
);

// export const SAMPLE_CSV_DATA_RSAIMAGE = `Title,Image
// Ant,https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Bullant_head_detail.jpg/440px-Bullant_head_detail.jpg
// Bat,https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Flying_fox_at_botanical_gardens_in_Sydney_%28cropped_and_flipped%29.jpg/160px-Flying_fox_at_botanical_gardens_in_Sydney_%28cropped_and_flipped%29.jpg
// Cat,https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Cat_August_2010-4.jpg/362px-Cat_August_2010-4.jpg
// Dodo,https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Dronte_17th_Century_color_corrected.jpg/272px-Dronte_17th_Century_color_corrected.jpg
// Eel,https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/FMIB_35739_Anguilla_vulgaris_--_Anguilla.jpeg/443px-FMIB_35739_Anguilla_vulgaris_--_Anguilla.jpeg
// Fox,https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Vulpes_vulpes_ssp_fulvus.jpg/440px-Vulpes_vulpes_ssp_fulvus.jpg
// Gator,https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/AmericanAlligator.JPG/240px-AmericanAlligator.JPG
// Hippo,https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Portrait_Hippopotamus_in_the_water.jpg/440px-Portrait_Hippopotamus_in_the_water.jpg
// Inchworm,https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Geometrid_Moths_%28Geometridae%29_caterpillar_-2.jpg/346px-Geometrid_Moths_%28Geometridae%29_caterpillar_-2.jpg
// Jackrabbit,https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Brooklyn_Museum_-_California_Hare_-_John_J._Audubon.jpg/440px-Brooklyn_Museum_-_California_Hare_-_John_J._Audubon.jpg`;

export const SAMPLE_CSV_EDSDA_MESSAGE = `Title,Message
Announcement of Cat,"We'd like to announce the following cat:  \n  ![cat](https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Cat_August_2010-4.jpg/181px-Cat_August_2010-4.jpg)"`;

// TODO
export const SAMPLE_CSV_EDSA_TICKET = `Title,Image
Test Title,Test Message`;

export function getSampleCSVData(
  outputType = CSVPipelineOutputType.Message
): string {
  switch (outputType) {
    case CSVPipelineOutputType.Message:
      return SAMPLE_CSV_EDSDA_MESSAGE;
    case CSVPipelineOutputType.Ticket:
      return SAMPLE_CSV_EDSA_TICKET;
    default:
      return "not implemented";
  }
}

export function getSampleFeedOptions(
  outputType: CSVPipelineOutputType
): FeedIssuanceOptions {
  switch (outputType) {
    case CSVPipelineOutputType.Message:
      return SAMPLE_CSV_FEED_OPTIONS_EdDSAMessage;
    case CSVPipelineOutputType.Ticket:
      return SAMPLE_CSV_FEED_OPTIONS_EdDSATicket;
    default:
      throw new Error("not implemented");
  }
}

export const SAMPLE_CSV_FEED_OPTIONS_RSAImage = {
  feedId: "0",
  feedDisplayName: "Podbox Weeks",
  feedDescription: "Feed of animals - one for each week of Podbox",
  feedFolder: "Podbox Weeks"
} satisfies FeedIssuanceOptions;

export const SAMPLE_CSV_FEED_OPTIONS_EdDSAMessage = {
  feedId: "0",
  feedDisplayName: "Announcements",
  feedDescription: "Sample Announcements Feed",
  feedFolder: "Announcements"
} satisfies FeedIssuanceOptions;

export const SAMPLE_CSV_FEED_OPTIONS_EdDSATicket = {
  feedId: "0",
  feedDisplayName: "CSV Tickets",
  feedDescription: "Feed of tickets backed by a CSV",
  feedFolder: "CSV Tickets"
} satisfies FeedIssuanceOptions;

export const SAMPLE_CSV_PIPELINE = JSON.stringify(
  {
    type: PipelineType.CSV,
    timeCreated: new Date().toISOString(),
    timeUpdated: new Date().toISOString(),
    editorUserIds: [],
    options: {
      csv: getSampleCSVData(CSVPipelineOutputType.Message),
      outputType: CSVPipelineOutputType.Message,
      feedOptions: {
        feedId: "0",
        feedDisplayName: "Podbox Weeks",
        feedDescription: "Feed of animals - one for each week of Podbox",
        feedFolder: "podbox-weeks"
      }
    }
  } satisfies Partial<CSVPipelineDefinition>,
  null,
  2
);
