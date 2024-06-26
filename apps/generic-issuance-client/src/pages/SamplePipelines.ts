import {
  CSVPipelineDefinition,
  CSVPipelineOutputType,
  FeedIssuanceOptions,
  LemonadePipelineDefinition,
  PipelineType
} from "@pcd/passport-interface";

export const DEFAULT_FEED_OPTIONS = {
  feedId: "default-feed",
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
      manualTickets: [],
      semaphoreGroups: []
    }
  } satisfies Partial<LemonadePipelineDefinition>,
  null,
  2
);

export const SAMPLE_CSV_EDDSA_MESSAGE = `


Title,Message
Art Museum Visit,"Explore the **Denver Art Museum** to discover a world of art ranging from indigenous works to contemporary exhibits. With bold architecture and interactive installations, it's a cultural journey. The museum's diverse collections ensure there's something for everyone. ![](https://i.ibb.co/1LwGxwP/1.webp)"
Larimer Square Lights,"Walk through **Larimer Square** at dusk, where the lights create a magical atmosphere perfect for exploring Denver's most historic block. Enjoy boutique shopping, gourmet dining, and vibrant nightlife all in one place. ![xd](https://i.ibb.co/GkjHhs4/2.webp)"
Nuggets Game Night,"Experience the thrill of a **Denver Nuggets** game at the Ball Arena. Feel the energy of the crowd as you watch top-tier basketball, making for an unforgettable night of sports in Denver. ![xd](https://i.ibb.co/yFVwGK6/3.webp)"
Brewery Tour Fun,"Take a **brewery tour** in the RiNo District, where the craft beer scene thrives. Sample some of Denver's finest ales and lagers, and learn about the brewing process from passionate local brewers. ![xd](https://i.ibb.co/Zm5CKCf/4.webp)"
Snowshoeing Rockies,"Enjoy a serene **snowshoeing adventure** in the nearby Rocky Mountains. Traverse through snow-covered trails, breathe in the crisp mountain air, and marvel at the stunning winter landscapes. ![xd](https://i.ibb.co/fn5wSQs/5.webp)"
Red Rocks Concert,Attend a **live music performance** at Red Rocks Amphitheatre. This iconic venue offers an unparalleled acoustic experience set against the backdrop of breathtaking natural beauty. ![xd](https://i.ibb.co/ynRHfS7/10.webp)
Culinary Delights,"Indulge in a **culinary experience** in Denver's food scene, featuring farm-to-table restaurants and innovative chefs. Taste the local flavors through dishes crafted with the freshest ingredients. ![xd](https://i.ibb.co/zGC0Z27/6.webp)"
Botanic Gardens Peace,"Explore the **Denver Botanic Gardens**, a tranquil oasis in the city. Even in winter, the gardens offer a peaceful retreat with indoor conservatories showcasing exotic plants from around the world. ![xd](https://i.ibb.co/vVNrDty/7.webp)"
Ghostly Capitol Hill,"Join a **ghost tour** in the historic Capitol Hill neighborhood. Dive into Denver's spooky side with stories of hauntings and mysteries that lurk in the city's oldest buildings. ![xd](https://i.ibb.co/XJ0BPgb/8.webp)"
Winter Hike Views,"Take a **winter hike** in the Denver Mountain Parks. Embrace the beauty of the season with trails that offer spectacular views and a chance to spot local wildlife in their natural habitat. ![xd](https://i.ibb.co/T4P4Ssf/9.webp)"


`
  .split("\n")
  .filter((l) => l.length > 0)
  .join("\n");

export const SAMPLE_CSV_EDDSA_TICKET = `


eventName,ticketName,attendeeName,attendeeEmail,imageUrl,id
Europe,GA,Ivan,ivan@0xparc.org,https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Europe_orthographic_Caucasus_Urals_boundary_%28with_borders%29.svg/440px-Europe_orthographic_Caucasus_Urals_boundary_%28with_borders%29.svg.png,optional
Europe,GA,Richard,richard@pcd.team,https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Europe_orthographic_Caucasus_Urals_boundary_%28with_borders%29.svg/440px-Europe_orthographic_Caucasus_Urals_boundary_%28with_borders%29.svg.png,Not necessary
Europe,VIP,Ivan,ivan@0xparc.org,https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Europe_orthographic_Caucasus_Urals_boundary_%28with_borders%29.svg/440px-Europe_orthographic_Caucasus_Urals_boundary_%28with_borders%29.svg.png,"Used to dedupe tickets that have duplicate (eventName, ticketName, attendeeEmail) tuples"
Europe,GA,Richard,richard@pcd.team,https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Europe_orthographic_Caucasus_Urals_boundary_%28with_borders%29.svg/440px-Europe_orthographic_Caucasus_Urals_boundary_%28with_borders%29.svg.png,
America,GA,Ivan,ivan@0xparc.org,https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/USA_orthographic.svg/440px-USA_orthographic.svg.png,
America,GA,Richard,richard@pcd.team,https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/USA_orthographic.svg/440px-USA_orthographic.svg.png,



`
  .split("\n")
  .filter((l) => l.length > 0)
  .join("\n");

export const SAMPLE_CSV_PODS = `

email,title,description,imageUrl
mail@robknight.org.uk,Testing,A test POD,https://images.unsplash.com/photo-1495615080073-6b89c9839ce0?q=80&w=400&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D
richard@0xparc.org,Testing,A test POD,https://images.unsplash.com/photo-1495615080073-6b89c9839ce0?q=80&w=400&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D
ivan@0xparc.org,Testing,A test POD,https://images.unsplash.com/photo-1495615080073-6b89c9839ce0?q=80&w=400&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D

`
  .split("\n")
  .filter((l) => l.length > 0)
  .join("\n");

export function getSampleCSVData(
  outputType = CSVPipelineOutputType.Message
): string {
  switch (outputType) {
    case CSVPipelineOutputType.Message:
      return SAMPLE_CSV_EDDSA_MESSAGE;
    case CSVPipelineOutputType.Ticket:
    case CSVPipelineOutputType.PODTicket:
      return SAMPLE_CSV_EDDSA_TICKET;
    case CSVPipelineOutputType.POD:
      return SAMPLE_CSV_PODS;
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
    case CSVPipelineOutputType.PODTicket:
      return TICKET_FEED_OPTS;
    case CSVPipelineOutputType.POD:
      return POD_FEED_OPTS;
    default:
      throw new Error("not implemented");
  }
}

export const MESSAGE_CSV_FEED_OPTS = {
  feedId: "0",
  feedDisplayName: "denver_activities.csv",
  feedDescription: "Denver Activities",
  feedFolder: "EthDenver/activities.csv"
} satisfies FeedIssuanceOptions;

export const TICKET_FEED_OPTS = {
  feedId: "0",
  feedDisplayName: "eth_denver_tickets.csv",
  feedDescription: "eth_denver_tickets",
  feedFolder: "EthDenver"
} satisfies FeedIssuanceOptions;

export const POD_FEED_OPTS = {
  feedId: "0",
  feedDisplayName: "pods.csv",
  feedDescription: "CSV pods",
  feedFolder: "CSV PODs"
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
