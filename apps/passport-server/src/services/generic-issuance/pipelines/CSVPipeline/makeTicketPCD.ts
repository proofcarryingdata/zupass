import {
  EdDSATicketPCDPackage,
  ITicketData,
  TicketCategory
} from "@pcd/eddsa-ticket-pcd";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import { IPODTicketData } from "@pcd/pod-ticket-pcd/src/schema";
import { v5 as uuidv5 } from "uuid";
import { logger } from "../../../../util/logger";
import { traced } from "../../../telemetryService";

export function summarizeEventAndProductIds(
  pipelineId: string,
  ticketRows: string[][]
): string {
  const tickets = ticketRows
    .map((r) => csvRowToEdDSATicketData(r, "", pipelineId))
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

export function csvRowToEdDSATicketData(
  row: string[],
  attendeeSemaphoreId: string,
  pipelineId: string
): ITicketData | undefined {
  try {
    const eventName: string = row[0];
    const ticketName: string = row[1];
    const attendeeName: string = row[2];
    const attendeeEmail: string = row[3];
    const imageUrl: string = row[4];
    const id: string = row[5] ?? "";

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

export function csvRowToPODTicketData(
  row: string[],
  attendeeSemaphoreId: string,
  owner: string,
  pipelineId: string
): IPODTicketData | undefined {
  try {
    const eventName: string = row[0];
    const ticketName: string = row[1];
    const attendeeName: string = row[2];
    const attendeeEmail: string = row[3];
    const imageUrl: string = row[4];
    const id: string = row[5] ?? "";

    const eventId: string = uuidv5(`${eventName}-${ticketName}`, pipelineId);
    const productId: string = uuidv5(`product-${eventId}`, pipelineId);
    const ticketId: string = uuidv5(
      `${eventId}-${productId}-${attendeeEmail}-${id}`,
      pipelineId
    );

    return {
      eventName,
      ticketName,
      checkerEmail: undefined, // changes if checkin feature enabled for csv pipelines
      imageUrl,
      imageAltText: undefined,
      ticketId, // The ticket ID is a unique identifier of the ticket.
      eventId, // The event ID uniquely identifies an event.
      productId, // The product ID uniquely identifies the type of ticket (e.g. General Admission, Volunteer etc.).
      timestampConsumed: undefined, // change if checkin feature enabled for csv pipelines
      timestampSigned: Date.now(),
      attendeeSemaphoreId,
      ticketSecret: undefined,
      owner,
      isConsumed: false, // change if checkin feature enabled for csv pipelines
      isRevoked: undefined, // change if revocation feature changes to not just delete tickets
      ticketCategory: undefined, // change if we ever support multiple categories for csv pipelines
      attendeeName,
      attendeeEmail
    } satisfies IPODTicketData;
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
  inputRow: string[],
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

    const ticket = csvRowToEdDSATicketData(
      inputRow,
      requesterSemaphoreId,
      pipelineId
    );

    if (!ticket) {
      return undefined;
    }

    if (
      !issueToUnmatchedEmail &&
      ticket.attendeeEmail.toLowerCase() !== requesterEmail.toLowerCase()
    ) {
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
