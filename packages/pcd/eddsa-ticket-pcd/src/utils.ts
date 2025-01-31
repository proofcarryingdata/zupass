import { EdDSAPublicKey } from "@pcd/eddsa-pcd";
import {
  booleanToBigInt,
  generateSnarkMessageHash,
  numberToBigInt,
  uuidToBigInt
} from "@pcd/util";
import { Buffer } from "buffer";
import urlJoin from "url-join";
import { EdDSATicketPCD, ITicketData } from "./EdDSATicketPCD";

/**
 * A serialized ticket is a list of big integers, where each one is a field in {@link ITicketData}. It needs to be a list of big integers so that it can be passed into {@link EdDSAPCD} to be signed.
 */
export type SerializedTicket = [
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  // These three fields are currently not typed or being used, but are kept
  // as reserved fields that are hardcoded to zero and included in the preimage
  // of the hashed signature.
  bigint,
  bigint,
  bigint
];

export function semaphoreIdToBigInt(v: string): bigint {
  return BigInt(v);
}

/**
 * Converts the property values of the {@link ITicketData} object to
 * a list of big integers ({@link SerializedTicket}).
 */
export function ticketDataToBigInts(data: ITicketData): SerializedTicket {
  return [
    uuidToBigInt(data.ticketId),
    uuidToBigInt(data.eventId),
    uuidToBigInt(data.productId),
    numberToBigInt(data.timestampConsumed),
    numberToBigInt(data.timestampSigned),
    semaphoreIdToBigInt(data.attendeeSemaphoreId),
    booleanToBigInt(data.isConsumed),
    booleanToBigInt(data.isRevoked),
    numberToBigInt(data.ticketCategory),
    generateSnarkMessageHash(data.attendeeEmail),
    generateSnarkMessageHash(data.attendeeName),
    numberToBigInt(0)
  ];
}

/**
 * Returns the ticket inside of this PCD if it exists.
 */
export function getEdDSATicketData(
  pcd?: EdDSATicketPCD
): ITicketData | undefined {
  return pcd?.claim?.ticket;
}

/**
 * Returns the public key this PCD was signed with if it exists.
 */
export function getPublicKey(pcd?: EdDSATicketPCD): EdDSAPublicKey | undefined {
  return pcd?.proof?.eddsaPCD?.claim?.publicKey;
}

const INVALID_TICKET_QR_CODE_COLOR = "#d3d3d3";

/**
 * The QR code's color to be shown when a ticket is
 * not valid, i.e. undefined, consumed or revoked.
 */
export function getQRCodeColorOverride(
  pcd: EdDSATicketPCD
): string | undefined {
  const ticketData = getEdDSATicketData(pcd);

  if (!ticketData || ticketData.isRevoked) {
    return INVALID_TICKET_QR_CODE_COLOR;
  }

  // Otherwise, don't override and use default.
  return undefined;
}

function makeIdBasedVerifyLink(baseUrl: string, ticketId: string): string {
  return urlJoin(baseUrl, `?id=${ticketId}`);
}

export function linkToTicket(
  baseUrl: string,
  ticketId: string,
  eventId: string
): string {
  const encodedId = Buffer.from(
    JSON.stringify({
      ticketId: ticketId,
      eventId: eventId,
      timestamp: Date.now().toString()
    })
  ).toString("base64");
  return makeIdBasedVerifyLink(baseUrl, encodedId);
}
