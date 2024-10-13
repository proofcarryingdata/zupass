import { EdDSAPCD } from "@pcd/eddsa-pcd";
import { ObjectArgument, PCD, StringArgument } from "@pcd/pcd-types";

/**
 * The globally unique type name of the {@link EdDSATicketPCD}.
 */
export const EdDSATicketPCDTypeName = "eddsa-ticket-pcd";

/**
 * Assigns each currently supported category a unique value.
 */
export enum TicketCategory {
  ZuConnect = 0,
  Devconnect = 1,
  PcdWorkingGroup = 2,
  Zuzalu = 3,
  Generic = 4
}

/**
 * The ticket data here is based on passport-server's ticket data model,
 * which is in turn based on the data model from Pretix.
 *
 * In this model, a Ticket represents the purchase of a Product, which is
 * associated with an Event.
 *
 * Events may have many Products, such as subsidized tickets, sponsor tickets,
 * organizer tickets, or time-restricted passes. A given Product can only be
 * associated with one Event.
 *
 * In general, consumers of this data will want to be aware of both the event
 * ID and product ID. If providing a service that should be accessible to
 * ticket-holders for an event, and using this PCD as proof of ticket-holding,
 * the consumer should check that both the event ID and product ID match a
 * list of known ticket types, and that the public key (in `proof.eddsaPCD`)
 * matches the public key of the known issuer of the tickets.
 *
 * An example of how this might be done is shown in {@link verifyTicket} in
 * passport-server's issuance service, which is requested by passport-client
 * when verifying tickets.
 */
export interface ITicketData {
  // The fields below are not signed and are used for display purposes.
  eventName: string;
  ticketName: string;
  checkerEmail?: string | undefined;
  imageUrl?: string | undefined;
  imageAltText?: string | undefined;
  ticketSecret?: string | undefined;
  // The fields below are signed using the passport-server's private EdDSA key
  // and can be used by 3rd parties to represent their own tickets.
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
  qrCodeOverrideImageUrl?: string;
  eventLocation?: string;
  eventStartDate?: string;
  isAddOn?: boolean;
}

/**
 * Defines the essential parameters required for creating an {@link EdDSATicketPCD}.
 */
export type EdDSATicketPCDArgs = {
  /**
   * The EdDSA private key is a 32-byte value used to sign the message.
   * {@link newEdDSAPrivateKey} is recommended for generating highly secure private keys.
   */
  privateKey: StringArgument;

  /**
   * A {@link ITicketData} object containing ticket information that is encoded into this PCD.
   */
  ticket: ObjectArgument<ITicketData>;

  /**
   * A string that uniquely identifies an {@link EdDSATicketPCD}. If this argument is not specified a random
   * id will be generated.
   */
  id: StringArgument;
};

/**
 * Defines the EdDSA Ticket PCD claim. The claim contains a ticket that was signed
 * with the private key corresponding to the given public key stored in the proof.
 */
export interface EdDSATicketPCDClaim {
  ticket: ITicketData;
}

/**
 * Defines the EdDSA Ticket PCD proof. The proof is an EdDSA PCD whose message
 * is the encoded ticket.
 */
export interface EdDSATicketPCDProof {
  eddsaPCD: EdDSAPCD;
}

/**
 * The EdDSA Ticket PCD enables the verification that a specific ticket ({@link EdDSATicketPCDClaim})
 * has been signed with an EdDSA private key. The {@link EdDSATicketPCDProof} contains a EdDSA
 * PCD and serves as the signature.
 */
export class EdDSATicketPCD
  implements PCD<EdDSATicketPCDClaim, EdDSATicketPCDProof>
{
  type = EdDSATicketPCDTypeName;
  claim: EdDSATicketPCDClaim;
  proof: EdDSATicketPCDProof;
  id: string;

  public constructor(
    id: string,
    claim: EdDSATicketPCDClaim,
    proof: EdDSATicketPCDProof
  ) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}

/**
 * Returns true if a PCD is an EdDSA Ticket PCD, or false otherwise.
 */
export function isEdDSATicketPCD(pcd: PCD): pcd is EdDSATicketPCD {
  return pcd.type === EdDSATicketPCDTypeName;
}

/**
 * Throws if {@link pcd} is not an {@link EdDSATicketPCD}.
 */
export function expectIsEdDSATicketPCD(
  pcd: PCD
): asserts pcd is EdDSATicketPCD {
  if (pcd.type !== EdDSATicketPCDTypeName) {
    throw new Error("Expected EdDSATicketPCD");
  }
}
