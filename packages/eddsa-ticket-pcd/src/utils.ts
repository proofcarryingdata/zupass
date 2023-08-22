import { EdDSATicketPCD, ITicketData } from "./EdDSATicketPCD";

export type SerializedTicket = [bigint, bigint];

export function ticketDataToBigInts(data: ITicketData): SerializedTicket {
  return [BigInt(1), BigInt(2)];
}

export function getTicketData(pcd?: EdDSATicketPCD): ITicketData | undefined {
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
  const ticketData = getTicketData(pcd);
  if (!ticketData || ticketData.isConsumed || ticketData.isRevoked) {
    return INVALID_TICKET_QR_CODE_COLOR;
  }
  // otherwise, don't override and use default
  return undefined;
}
