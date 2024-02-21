import { EdDSATicketPCDPackage, TicketCategory } from "@pcd/eddsa-ticket-pcd";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import { v4 as uuid } from "uuid";
import { traced } from "../../../telemetryService";

export async function makeTicketPCD(
  inputRow: string[],
  eddsaPrivateKey: string,
  requesterEmail: string | undefined,
  requesterSemaphoreId: string | undefined
): Promise<SerializedPCD | undefined> {
  return traced("", "makeEdDSAMessageCSVPCD", async () => {
    if (!requesterEmail || !requesterSemaphoreId) {
      return undefined;
    }

    const eventName: string = inputRow[0];
    const ticketName: string = inputRow[1];
    const attendeeName: string = inputRow[2];
    const attendeeEmail: string = inputRow[3];
    const imageUrl: string = inputRow[4];

    const ticketId: string = uuid();
    const eventId: string = uuid();
    const productId: string = uuid();
    const attendeeSemaphoreId: string = requesterSemaphoreId;

    if (attendeeEmail !== requesterEmail) {
      return undefined;
    }

    const pcd = await EdDSATicketPCDPackage.prove({
      id: {
        argumentType: ArgumentTypeName.String,
        value: uuid()
      },
      privateKey: {
        argumentType: ArgumentTypeName.String,
        value: eddsaPrivateKey
      },
      ticket: {
        argumentType: ArgumentTypeName.Object,
        value: {
          // The fields below are not signed and are used for display purposes.
          eventName,
          ticketName,
          checkerEmail: undefined, // change if checkin feature enabled for csv pipelines
          imageUrl,
          imageAltText: undefined,
          // The fields below are signed using the passport-server's private EdDSA key
          // and can be used by 3rd parties to represent their own tickets.
          ticketId, // The ticket ID is a unique identifier of the ticket.
          eventId, // The event ID uniquely identifies an event.
          productId, // The product ID uniquely identifies the type of ticket (e.g. General Admission, Volunteer etc.).
          timestampConsumed: 0, // change if checkin feature enabled for csv pipelines
          timestampSigned: Date.now(),
          attendeeSemaphoreId,
          isConsumed: false, // change if checkin feature enabled for csv pipelines
          isRevoked: false,
          ticketCategory: TicketCategory.Generic,
          attendeeName,
          attendeeEmail
        }
      }
    });
    const serialized = await EdDSATicketPCDPackage.serialize(pcd);
    return serialized;
  });
}
