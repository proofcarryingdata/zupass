import {
  EdDSATicketPCDPackage,
  ITicketData,
  TicketCategory
} from "@pcd/eddsa-ticket-pcd";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import { v5 as uuidv5 } from "uuid";
import { logger } from "../../../../util/logger";
import { traced } from "../../../telemetryService";

export function summarizeEventAndProductIds(
  pipelineId: string,
  ticketRows: Record<string, string>[]
): string {
  const tickets = ticketRows
    .map((r) => rowToTicket(r, "", pipelineId))
    .filter((t) => !!t) as ITicketData[];

  const summary: Record<string, { eventId: string; productId: string }> = {};

  tickets.forEach((t) => {
    summary[`${t.eventName} (${t.ticketName})`] = {
      eventId: t.eventId,
      productId: t.productId
    };
  });

  return JSON.stringify(summary, null, 2);
}

export function rowToTicket(
  row: Record<string, string>,
  attendeeSemaphoreId: string,
  pipelineId: string
): ITicketData | undefined {
  try {
    const eventName: string = row.eventName;
    const ticketName: string = row.ticketName;
    const attendeeName: string = row.attendeeName;
    const attendeeEmail: string = row.attendeeEmail;
    const imageUrl: string = row.imageUrl;
    const id: string = row.id ?? "";

    const eventId: string = uuidv5(`${eventName}-${ticketName}`, pipelineId);
    const productId: string = uuidv5(`product-${eventId}`, pipelineId);
    const ticketId: string = uuidv5(
      `${eventId}-${productId}-${attendeeEmail}-${id}`,
      pipelineId
    );

    return {
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
    } satisfies ITicketData;
  } catch (e) {
    logger(
      `rowToTicket`,
      `failed to convert csv ticket row to ticket data`,
      row,
      e
    );
    return undefined;
  }
}

export async function makeTicketPCD(
  inputRow: Record<string, string>,
  eddsaPrivateKey: string,
  requesterEmail: string | undefined,
  requesterSemaphoreId: string | undefined,
  pipelineId: string,
  issueToUnmatchedEmail: boolean | undefined
): Promise<SerializedPCD | undefined> {
  return traced("", "makeEdDSAMessageCSVPCD", async () => {
    if (!requesterEmail || !requesterSemaphoreId) {
      return undefined;
    }

    const ticket = rowToTicket(inputRow, requesterSemaphoreId, pipelineId);

    if (!ticket) {
      return undefined;
    }

    if (!issueToUnmatchedEmail && ticket.attendeeEmail !== requesterEmail) {
      return undefined;
    }

    const pcd = await EdDSATicketPCDPackage.prove({
      id: {
        argumentType: ArgumentTypeName.String,
        value: ticket.ticketId
      },
      privateKey: {
        argumentType: ArgumentTypeName.String,
        value: eddsaPrivateKey
      },
      ticket: {
        argumentType: ArgumentTypeName.Object,
        value: ticket
      }
    });

    const serialized = await EdDSATicketPCDPackage.serialize(pcd);
    return serialized;
  });
}
