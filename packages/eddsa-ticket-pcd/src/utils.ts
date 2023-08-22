import { parse as uuidParse } from "uuid";
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
  bigint
];

export function numberToBigInt(v: number): bigint {
  return BigInt(v);
}

export function booleanToBigInt(v: boolean): bigint {
  return BigInt(v ? 1 : 0);
}

export function semaphoreIdToBigInt(v: string): bigint {
  return BigInt(v);
}

export function uuidToBigInt(v: string): bigint {
  // a uuid is just a particular representation of 16 bytes
  const bytes = uuidParse(v);
  const hex = "0x" + Buffer.from(bytes).toString("hex");
  return BigInt(hex);
}

export function ticketDataToBigInts(data: ITicketData): SerializedTicket {
  return [
    uuidToBigInt(data.ticketId),
    uuidToBigInt(data.eventId),
    uuidToBigInt(data.productId),
    numberToBigInt(data.timestampConsumed),
    numberToBigInt(data.timestampSigned),
    semaphoreIdToBigInt(data.attendeeSemaphoreId),
    semaphoreIdToBigInt(data.checkerSemaphoreId),
    booleanToBigInt(data.isConsumed),
    booleanToBigInt(data.isRevoked)
  ];
}

export function getEdDSATicketData(
  pcd?: EdDSATicketPCD
): ITicketData | undefined {
  return pcd?.claim?.ticket;
}

export function getPublicKey(
  pcd?: EdDSATicketPCD
): [string, string] | undefined {
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
