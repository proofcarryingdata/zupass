import { EdDSAPublicKey } from "@pcd/eddsa-pcd";
import {
  booleanToBigInt,
  generateSnarkMessageHash,
  numberToBigInt,
  uuidToBigInt
} from "@pcd/util";
import stableStringify from "safe-stable-stringify";
import {
  EdDSATicketPCD,
  ITicketData,
  ITicketDisplayFields
} from "./EdDSATicketPCD";

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
    generateSnarkMessageHash(stableStringify(data))
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

  if (!ticketData || ticketData.isConsumed || ticketData.isRevoked) {
    return INVALID_TICKET_QR_CODE_COLOR;
  }

  // Otherwise, don't override and use default.
  return undefined;
}

/**
 * Extract display fields from the ticket's data.
 */
export function getTicketDisplayFields(
  ticketData: ITicketData
): ITicketDisplayFields {
  return {
    ticketName: ticketData.ticketName,
    eventName: ticketData.eventName,
    imageUrl: ticketData.imageUrl
  };
}
