import {
  EdDSATicketPCD,
  EdDSATicketPCDPackage,
  ITicketData
} from "@pcd/eddsa-ticket-pcd";
import {
  FeedHost,
  PollFeedRequest,
  PollFeedResponseValue,
  verifyCredential
} from "@pcd/passport-interface";
import {
  DeleteFolderPermission,
  PCDAction,
  PCDActionType,
  PCDPermissionType,
  ReplaceInFolderPermission
} from "@pcd/pcd-collection";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import path from "path";
import { Ticket, loadTickets } from "./config";

const fullPath = path.join(__dirname, "../artifacts/");
SemaphoreSignaturePCDPackage.init?.({
  zkeyFilePath: fullPath + "16.zkey",
  wasmFilePath: fullPath + "16.wasm"
});

export let feedHost: FeedHost;

export async function initFeedHost() {
  const tickets = await loadTickets();
  const folders = Object.keys(tickets);
  feedHost = new FeedHost(
    [
      {
        feed: {
          id: "1",
          name: "First feed",
          description: "First test feed",
          permissions: folders.flatMap((folder) => {
            return [
              {
                folder,
                type: PCDPermissionType.ReplaceInFolder
              } as ReplaceInFolderPermission,
              {
                folder,
                type: PCDPermissionType.DeleteFolder
              } as DeleteFolderPermission
            ];
          }),
          credentialRequest: {
            signatureType: "sempahore-signature-pcd",
            pcdType: "email-pcd"
          }
        },
        handleRequest: async (
          req: PollFeedRequest
        ): Promise<PollFeedResponseValue> => {
          if (req.pcd === undefined) {
            throw new Error(`Missing credential`);
          }
          const { email, semaphoreId } = await verifyCredential(req.pcd);
          if (email) {
            return {
              actions: await feedActionsForEmail(email, semaphoreId)
            };
          }
          return { actions: [] };
        }
      }
    ],
    "http://localhost:3100/feeds",
    "Test Feed Server"
  );
}

async function feedActionsForEmail(
  emailAddress: string,
  semaphoreId: string
): Promise<PCDAction[]> {
  const ticketsForUser: Record<string, Ticket[]> = {};

  const tickets = await loadTickets();

  for (const [folder, folderTickets] of Object.entries(tickets)) {
    for (const ticket of folderTickets) {
      if (ticket.attendeeEmail === emailAddress) {
        if (!ticketsForUser[folder]) {
          ticketsForUser[folder] = [];
        }
        ticketsForUser[folder].push(ticket);
      }
    }
  }

  const actions = [];

  for (const [folder, tickets] of Object.entries(ticketsForUser)) {
    // Clear out the folder
    actions.push({
      type: PCDActionType.DeleteFolder,
      folder,
      recursive: false
    });

    actions.push({
      type: PCDActionType.ReplaceInFolder,
      folder,
      pcds: await Promise.all(
        tickets.map((ticket) => issueTicketPCD(ticket, semaphoreId))
      )
    });
  }

  return actions;
}

async function issueTicketPCD(
  ticket: Ticket,
  semaphoreId: string
): Promise<SerializedPCD<EdDSATicketPCD>> {
  const ticketData: ITicketData = {
    ...ticket,
    checkerEmail: "",
    isConsumed: false,
    isRevoked: false,
    attendeeSemaphoreId: semaphoreId,
    timestampConsumed: 0,
    timestampSigned: Date.now()
  };

  const pcd = await EdDSATicketPCDPackage.prove({
    ticket: {
      value: ticketData,
      argumentType: ArgumentTypeName.Object
    },
    privateKey: {
      value: process.env.SERVER_PRIVATE_KEY,
      argumentType: ArgumentTypeName.String
    },
    id: {
      value: undefined,
      argumentType: ArgumentTypeName.String
    }
  });

  return EdDSATicketPCDPackage.serialize(pcd);
}
