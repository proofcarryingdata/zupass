import { EDdSAPublicKey } from "@pcd/eddsa-pcd";
import { booleanToBigInt, numberToBigInt, uuidToBigInt } from "@pcd/util";
import { EdDSATicketPCD, ITicketData } from "./EdDSATicketPCD";

/**
 * One big int for each signed field in {@link ITicketData}
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
    numberToBigInt(0),
    numberToBigInt(0),
    numberToBigInt(0)
  ];
}

export function getEdDSATicketData(
  pcd?: EdDSATicketPCD
): ITicketData | undefined {
  return pcd?.claim?.ticket;
}

export function getPublicKey(pcd?: EdDSATicketPCD): EDdSAPublicKey | undefined {
  return pcd?.proof?.eddsaPCD?.claim?.publicKey;
}

const INVALID_TICKET_QR_CODE_COLOR = "#d3d3d3";

export function getQRCodeColorOverride(
  pcd: EdDSATicketPCD
): string | undefined {
  const ticketData = getEdDSATicketData(pcd);
  if (!ticketData || ticketData.isConsumed || ticketData.isRevoked) {
    return INVALID_TICKET_QR_CODE_COLOR;
  }
  // otherwise, don't override and use default
  return undefined;
}
