import { ObjectArgument, PCD, StringArgument } from "@pcd/pcd-types";
import { PODPCD } from "@pcd/pod-pcd";

/**
 * The globally unique type name of the {@link PODTicketPCD}.
 */
export const PODTicketPCDTypeName = "pod-ticket-pcd";

/**
 * Copied from {@link TicketCategory} in {@link EdDSATicketPCD}.
 */
export enum TicketCategory {
  ZuConnect = 0,
  Devconnect = 1,
  PcdWorkingGroup = 2,
  Zuzalu = 3,
  Generic = 4
}

/**
 * Copied from {@link ITicketData} in {@link EdDSATicketPCD}.
 * @todo how much do we want these to diverge?
 */
export interface IPODTicketData {
  eventName: string;
  ticketName: string;
  checkerEmail: string | undefined;
  imageUrl?: string | undefined;
  imageAltText?: string | undefined;
  ticketId: string; // The ticket ID is a unique identifier of the ticket.
  eventId: string; // The event ID uniquely identifies an event.
  productId: string; // The product ID uniquely identifies the type of ticket (e.g. General Admission, Volunteer etc.).
  timestampConsumed: number;
  timestampSigned: number;
  attendeeSemaphoreId: string;
  isConsumed: boolean;
  isRevoked: boolean;
  ticketCategory: TicketCategory;
  attendeeName: string;
  attendeeEmail: string;
}

/**
 * Defines the essential parameters required for creating an {@link PODTicketPCD}.
 */
export type PODTicketPCDArgs = {
  /**
   * The EdDSA private key is a 32-byte value used to sign the message.
   * {@link newEdDSAPrivateKey} is recommended for generating highly secure private keys.
   */
  privateKey: StringArgument;

  /**
   * A {@link IPODTicketData} object containing ticket information that is encoded into this PCD.
   */
  ticket: ObjectArgument<IPODTicketData>;

  /**
   * A string that uniquely identifies an {@link PODTicketPCD}. If this argument is not specified a random
   * id will be generated.
   */
  id: StringArgument;
};

export interface PODTicketPCDClaim {
  ticket: IPODTicketData;
}

export interface PODTicketPCDProof {
  podPCD: PODPCD;
}

export class PODTicketPCD implements PCD<PODTicketPCDClaim, PODTicketPCDProof> {
  type = PODTicketPCDTypeName;
  claim: PODTicketPCDClaim;
  proof: PODTicketPCDProof;
  id: string;

  /**
   * Create a PCD to encapsulate the given ID and POD object.
   */
  public constructor(
    id: string,
    claim: PODTicketPCDClaim,
    proof: PODTicketPCDProof
  ) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}

export function isPODTicketPCD(pcd: PCD): pcd is PODTicketPCD {
  return pcd.type === PODTicketPCDTypeName;
}
