import { PCDArgument, StringArgument } from "@pcd/pcd-types";
import { RSAPCD } from "@pcd/rsa-pcd";

export const RSATicketPCDTypeName = "rsa-ticket-pcd";

export interface IRSATicketData {
  timestamp?: number;
  eventName?: string;
  eventConfigId?: string;
  ticketName?: string;
  attendeeName?: string;
  attendeeEmail?: string;
  ticketId?: string;
  isConsumed?: boolean;
  isRevoked?: boolean;
}

export type RSATicketPCDArgs = {
  id: StringArgument;
  rsaPCD: PCDArgument<RSAPCD>;
};
