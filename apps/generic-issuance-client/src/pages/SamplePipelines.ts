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
      feedOptions: DEFAULT_FEED_OPTIONS,
      manualTickets: []
    }
  } satisfies Partial<LemonadePipelineDefinition>,
  null,
  2
);

export const SAMPLE_CSV_EDSDA_MESSAGE = `


Title,Message
Frogville Bake Off,Join the annual Frogville Bake Off this weekend. Sweet treats and community fun! ![View more](https://i.ibb.co/R2sYtTS/1.webp).
Tech Toad Talks,Dive into the latest in lily pad tech at the Tech Toad Talks. Innovation leaps ahead! ![View more](https://i.ibb.co/WcWXJbc/2.webp).
Croak Choir Concert,Experience the harmonies of the Croak Choir under the moonlight. A symphony of sounds! ![View more](https://i.ibb.co/1KTCJwc/3.webp).
Hopscotch Championship,Compete or cheer in the Frogville Hopscotch Championship. Who will be the leap champion? ![View more](https://i.ibb.co/djdmRfP/4.webp).
Green Thumb Gardeners,Share tips and seeds at the Green Thumb Gardeners meet. Grow your garden dreams! ![View more](https://i.ibb.co/4t06pct/5.webp).
Froglet Film Festival,"Watch the best in amphibian cinema at the Froglet Film Festival. Lights, camera, croak! ![View more](https://i.ibb.co/YDMFQhq/6.webp)."
Mystic Pond Meditation,Find peace and tranquility at the Mystic Pond Meditation session. Serenity in nature. ![View more](https://i.ibb.co/BZxXKM3/7.webp).
Bug Brew Crafters,Sample the finest in bug brews at our local crafters meet. A taste adventure! ![View more](https://i.ibb.co/qBBpwyH/8.webp).
Starlight Storytelling,Gather for magical tales at the Starlight Storytelling night. Dreams under the stars. ![View more](https://i.ibb.co/tpnXb4h/9.webp).


`
  .split("\n")
  .filter((l) => l.length > 0)
  .join("\n");

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
      return MESSAGE_CSV_FEED_OPTS;
    case CSVPipelineOutputType.Ticket:
      return TICKET_FEED_OPTS;
    default:
      throw new Error("not implemented");
  }
}

export const MESSAGE_CSV_FEED_OPTS = {
  feedId: "0",
  feedDisplayName: "frogville_bulletin_board.csv",
  feedDescription: "frogville_bulletin_board",
  feedFolder: "frogville XD/announcements"
} satisfies FeedIssuanceOptions;

export const TICKET_FEED_OPTS = {
  feedId: "0",
  feedDisplayName: "frogville_ball_tickets",
  feedDescription: "frogville_ball_tickets",
  feedFolder: "frogville XD/frog ball"
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
      feedOptions: TICKET_FEED_OPTS
    }
  } satisfies Partial<CSVPipelineDefinition>,
  null,
  2
);
