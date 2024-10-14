import {
  CSVTicketPipelineDefinition,
  PipelineType
} from "@pcd/passport-interface";
import { randomUUID } from "@pcd/util";

/**
 * Creates test info required to test {@link CSVPipeline}.
 */
export function setupTestCSVTicketPipelineDefinition(
  ownerId: string
): CSVTicketPipelineDefinition {
  return {
    type: PipelineType.CSVTicket,
    ownerUserId: ownerId,
    timeCreated: new Date().toISOString(),
    timeUpdated: new Date().toISOString(),
    id: randomUUID(),
    editorUserIds: [],
    options: {
      eventName: "My Event",
      products: {
        GA: randomUUID(),
        Speaker: randomUUID()
      },
      pcdTypes: ["EdDSATicketPCD", "PODTicketPCD"],
      csv: `ticketName,attendeeName,attendeeEmail,imageUrl
GA,Gabe,gabe@gmail.com,https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Europe_map.png/598px-Europe_map.png
Speakers,Spencer,spencer@gmail.com,https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Europe_map.png/598px-Europe_map.png
`,
      feedOptions: {
        feedDescription: "My Event ticket feed",
        feedDisplayName: "My Event Tickets",
        feedFolder: "My Event",
        feedId: "tickets"
      }
    }
  } satisfies CSVTicketPipelineDefinition;
}
