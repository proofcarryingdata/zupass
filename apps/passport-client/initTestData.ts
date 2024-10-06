import { newEdDSAPrivateKey } from "@pcd/eddsa-pcd";
import { EdDSATicketPCDPackage, TicketCategory } from "@pcd/eddsa-ticket-pcd";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { randomUUID } from "@pcd/util";
import { AppState } from "./src/state";

export interface EventInfo {
  start: string;
  end: string;
  image?: string;
}

const testData = {
  tickets: [
    "Devcon",
    "ProgCrypto",
    "EthDenver",
    "Edge City",
    "ETH Berlin 04",
    "ETH Prague 2024",
    "Old Event 1",
    "Old Event 2",
    "0xPARC Summer '24"
  ]
} as const;
export const EVENTS: Record<string, EventInfo> = {
  "ETH Berlin 04": {
    start: "2024-05-24",
    end: "2024-05-26",
    image:
      "https://ethberlin.org/static/ligi-mask-2cf891892bc3a7e7b3fa7d18d27edf9c.jpg"
  },
  "0xPARC Summer '24": {
    start: "2024-06-17",
    end: "2024-08-25",
    image: "https://pbs.twimg.com/media/F_F2axBXQAAx9V7?format=jpg&name=large"
  },
  "ETH Prague 2024": {
    start: "2024-05-31",
    end: "2024-06-02",
    image:
      "https://lp-cms-production.imgix.net/2023-08/PRAGUE-GettyImages-1182432355.jpg?w=1920&h=640&fit=crop&crop=faces%2Cedges&auto=format&q=75"
  },
  "Edge City": {
    start: "2023-10-18",
    end: "2023-10-21",
    image:
      "https://cdn.prod.website-files.com/65b2cb5abdecf7cd7747e170/65c139390d09b586db66b032_bg-image_v01.png"
  },
  EthDenver: {
    start: "2024-02-23",
    end: "2024-03-03",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Denver_Skyline_in_Winter.JPG/800px-Denver_Skyline_in_Winter.JPG"
  },
  Devcon: {
    start: "2024-11-12",
    end: "2024-11-15",
    image:
      "https://devcon.org/_next/image/?url=/_next/static/media/backdrop.f0972b01.png&w=3840&q=75"
  },
  "Old Event 1": {
    start: "2022-11-12",
    end: "2022-11-12",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Burg_Hohenzollern_ak.jpg/640px-Burg_Hohenzollern_ak.jpg"
  },
  "Old Event 2": {
    start: "2022-9-12",
    end: "2022-9-12",
    image:
      "https://cdn1.epicgames.com/ue/product/Screenshot/1-1920x1080-44e1108ee2deef769c9dde9c957c1087.jpg?resize=1&w=1920"
  },
  ProgCrypto: {
    start: "2024-11-13",
    end: "2024-11-13",
    image:
      "https://cdn1.epicgames.com/ue/product/Screenshot/1-1920x1080-44e1108ee2deef769c9dde9c957c1087.jpg?resize=1&w=1920"
  }
};

export function isEvent(folder: string): folder is keyof typeof EVENTS {
  return EVENTS[folder] !== undefined;
}

export async function initTestData(
  state: AppState,
  force = false
): Promise<void> {
  if (!state.self) {
    return;
  }

  const pcds = state.pcds;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any)["appstate"] = state;

  if (state.pcds.getAllFolderNames().includes("Devcon") && !force) {
    return;
  }

  const pkey = newEdDSAPrivateKey();

  for (const [_i, ticket] of testData.tickets.entries()) {
    const eventName = ticket;
    const ticketName = "GA";
    const ticketId = randomUUID();
    const eventId = randomUUID();
    const productId = randomUUID();
    const eventData = EVENTS[eventName];
    const pcd = await EdDSATicketPCDPackage.prove({
      id: {
        argumentType: ArgumentTypeName.String,
        value: ticketId
      },
      privateKey: {
        argumentType: ArgumentTypeName.String,
        value: pkey
      },
      ticket: {
        argumentType: ArgumentTypeName.Object,
        value: {
          eventName: eventName,
          ticketName: ticketName,
          checkerEmail: undefined,
          eventId,
          productId,
          ticketId,
          timestampConsumed: 0,
          timestampSigned: Date.now(),
          attendeeSemaphoreId: state.identityV3.commitment.toString(),
          isConsumed: false,
          isRevoked: false,
          ticketCategory: TicketCategory.Generic,
          attendeeName: "Johnny cash",
          attendeeEmail: state.self?.emails[0] ?? "test@test.com",
          imageUrl: eventData?.image
        }
      }
    });

    pcds.add(pcd, { upsert: true });
    pcds.setFolder(pcd.id, "tickets/eventTickets");
  }
}
