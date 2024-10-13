import { EdDSATicketPCD, EdDSATicketPCDTypeName } from "@pcd/eddsa-ticket-pcd";
import { PODTicketPCD, PODTicketPCDTypeName } from "@pcd/pod-ticket-pcd";

export type TicketType = EdDSATicketPCD | PODTicketPCD;
const TypeNames = [EdDSATicketPCDTypeName, PODTicketPCDTypeName] as const;
export type TicketTypeName = (typeof TypeNames)[number];
export type TicketPack = {
  eventTicket: TicketType;
  addOns: TicketType[];
  attendeeEmail: string;
  eventName: string;
  packType: TicketTypeName;
};
