import {
  CSVPipelineDefinition,
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

export const SAMPLE_CSV_DATA = `Title,Image
Ant,https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Bullant_head_detail.jpg/440px-Bullant_head_detail.jpg
Bat,https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Flying_fox_at_botanical_gardens_in_Sydney_%28cropped_and_flipped%29.jpg/160px-Flying_fox_at_botanical_gardens_in_Sydney_%28cropped_and_flipped%29.jpg
Cat,https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Cat_August_2010-4.jpg/362px-Cat_August_2010-4.jpg
Dodo,https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Dronte_17th_Century_color_corrected.jpg/272px-Dronte_17th_Century_color_corrected.jpg
Eel,https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/FMIB_35739_Anguilla_vulgaris_--_Anguilla.jpeg/443px-FMIB_35739_Anguilla_vulgaris_--_Anguilla.jpeg
Fox,https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Vulpes_vulpes_ssp_fulvus.jpg/440px-Vulpes_vulpes_ssp_fulvus.jpg
Gator,https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/AmericanAlligator.JPG/240px-AmericanAlligator.JPG
Hippo,https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Portrait_Hippopotamus_in_the_water.jpg/440px-Portrait_Hippopotamus_in_the_water.jpg
Inchworm,https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Geometrid_Moths_%28Geometridae%29_caterpillar_-2.jpg/346px-Geometrid_Moths_%28Geometridae%29_caterpillar_-2.jpg
Jackrabbit,https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Brooklyn_Museum_-_California_Hare_-_John_J._Audubon.jpg/440px-Brooklyn_Museum_-_California_Hare_-_John_J._Audubon.jpg`;

export const SAMPLE_CSV_FEED_OPTIONS = {
  feedId: "0",
  feedDisplayName: "Podbox Weeks",
  feedDescription: "Feed of animals - one for each week of Podbox",
  feedFolder: "podbox-weeks"
} satisfies FeedIssuanceOptions;

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
        feedDisplayName: "Podbox Weeks",
        feedDescription: "Feed of animals - one for each week of Podbox",
        feedFolder: "podbox-weeks"
      }
    }
  } satisfies Partial<CSVPipelineDefinition>,
  null,
  2
);
