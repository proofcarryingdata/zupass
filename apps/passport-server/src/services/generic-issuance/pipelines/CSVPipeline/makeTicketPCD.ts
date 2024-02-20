import { EdDSATicketPCDPackage, TicketCategory } from "@pcd/eddsa-ticket-pcd";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import { randomUUID } from "crypto";
import { v4 as uuid } from "uuid";
import { traced } from "../../../telemetryService";

export async function makeTicketPCD(
  inputRow: string[],
  eddsaPrivateKey: string
): Promise<SerializedPCD> {
  return traced("", "makeEdDSAMessageCSVPCD", async () => {
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
          eventName: "a",
          ticketName: "b",
          checkerEmail: undefined, // change if checkin feature enabled for csv pipelines
          imageUrl: undefined,
          imageAltText: undefined,
          // The fields below are signed using the passport-server's private EdDSA key
          // and can be used by 3rd parties to represent their own tickets.
          ticketId: randomUUID(), // The ticket ID is a unique identifier of the ticket.
          eventId: randomUUID(), // The event ID uniquely identifies an event.
          productId: randomUUID(), // The product ID uniquely identifies the type of ticket (e.g. General Admission, Volunteer etc.).
          timestampConsumed: 0, // change if checkin feature enabled for csv pipelines
          timestampSigned: Date.now(),
          attendeeSemaphoreId: randomUUID(),
          isConsumed: false, // change if checkin feature enabled for csv pipelines
          isRevoked: false,
          ticketCategory: TicketCategory.Generic,
          attendeeName: "test name",
          attendeeEmail: "test@test.com"
        }
      }
    });
    const serialized = await EdDSATicketPCDPackage.serialize(pcd);
    return serialized;
  });
}
