import { EdDSAPCD, EdDSAPCDPackage } from "@pcd/eddsa-pcd";
import {
  ArgumentTypeName,
  DisplayOptions,
  ObjectArgument,
  PCD,
  PCDPackage,
  SerializedPCD,
  StringArgument
} from "@pcd/pcd-types";
import JSONBig from "json-bigint";
import _ from "lodash";
import { v4 as uuid } from "uuid";
import { getEdDSATicketData, ticketDataToBigInts } from "./utils";

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
  checkerEmail: string | undefined;
  imageUrl?: string | undefined;
  imageAltText?: string | undefined;
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
 * Creates a new {@link EdDSATicketPCD} by generating an {@link EdDSATicketPCDProof}
 * and deriving an {@link EdDSATicketPCDClaim} from the given {@link EdDSATicketPCDArgs}.
 */
export async function prove(args: EdDSATicketPCDArgs): Promise<EdDSATicketPCD> {
  if (!args.privateKey.value) {
    throw new Error("missing private key");
  }

  if (!args.ticket.value) {
    throw new Error("missing ticket value");
  }

  const serializedTicket = ticketDataToBigInts(args.ticket.value);

  // Creates an EdDSA PCD where the message is a serialized ticket,
  const eddsaPCD = await EdDSAPCDPackage.prove({
    message: {
      value: serializedTicket.map((b) => b.toString()),
      argumentType: ArgumentTypeName.StringArray
    },
    privateKey: {
      value: args.privateKey.value,
      argumentType: ArgumentTypeName.String
    },
    id: {
      value: undefined,
      argumentType: ArgumentTypeName.String
    }
  });

  const id = args.id.value ?? uuid();

  return new EdDSATicketPCD(id, { ticket: args.ticket.value }, { eddsaPCD });
}

/**
 * Verifies an EdDSA Ticket PCD by checking that its {@link EdDSATicketPCDClaim} corresponds to
 * its {@link EdDSATicketPCDProof}. If they match, the function returns true, otherwise false.
 * In most cases, verifying the validity of the PCD with this function is not enough.
 * It may also be necessary to ensure that the parameters of the ticket, such as the
 * productId and eventId, match the expected values, and that the public key of the
 * entity that signed the ticket is indeed the authority for that event.
 */
export async function verify(pcd: EdDSATicketPCD): Promise<boolean> {
  const messageDerivedFromClaim = ticketDataToBigInts(pcd.claim.ticket);

  if (!_.isEqual(messageDerivedFromClaim, pcd.proof.eddsaPCD.claim.message)) {
    return false;
  }

  return EdDSAPCDPackage.verify(pcd.proof.eddsaPCD);
}

/**
 * Serializes an {@link EdDSATicketPCD}.
 * @param pcd The EdDSA Ticket PCD to be serialized.
 * @returns The serialized version of the EdDSA Ticket PCD.
 */
export async function serialize(
  pcd: EdDSATicketPCD
): Promise<SerializedPCD<EdDSATicketPCD>> {
  const serializedEdDSAPCD = await EdDSAPCDPackage.serialize(
    pcd.proof.eddsaPCD
  );

  return {
    type: EdDSATicketPCDTypeName,
    pcd: JSONBig().stringify({
      id: pcd.id,
      eddsaPCD: serializedEdDSAPCD,
      ticket: pcd.claim.ticket
    })
  } as SerializedPCD<EdDSATicketPCD>;
}

/**
 * Deserializes a serialized {@link EdDSATicketPCD}.
 * @param serialized The serialized PCD to deserialize.
 * @returns The deserialized version of the EdDSA Ticket PCD.
 */
export async function deserialize(serialized: string): Promise<EdDSATicketPCD> {
  const deserializedWrapper = JSONBig().parse(serialized);
  const deserializedEdDSAPCD = await EdDSAPCDPackage.deserialize(
    deserializedWrapper.eddsaPCD.pcd
  );
  return new EdDSATicketPCD(
    deserializedWrapper.id,
    { ticket: deserializedWrapper.ticket },
    { eddsaPCD: deserializedEdDSAPCD }
  );
}

export function ticketDisplayName(
  eventName?: string,
  ticketName?: string
): string {
  let displayName = "";

  if (eventName && eventName?.length > 0) {
    displayName += eventName;
  }

  if (ticketName && ticketName?.length > 0) {
    if (displayName.length === 0) {
      displayName = ticketName;
    } else {
      displayName += ` (${ticketName})`;
    }
  }

  return displayName.length === 0 ? "untitled" : displayName;
}
/**
 * Provides the information about the {@link EdDSATicketPCD} that will be displayed
 * to users on Zupass.
 * @param pcd The EdDSA Ticket PCD instance.
 * @returns The information to be displayed, specifically `header` and `displayName`.
 */
export function getDisplayOptions(pcd: EdDSATicketPCD): DisplayOptions {
  const ticketData = getEdDSATicketData(pcd);
  if (!ticketData) {
    return {
      header: "Ticket",
      displayName: "ticket-" + pcd.id.substring(0, 4)
    };
  }

  const displayName = ticketDisplayName(
    ticketData.eventName,
    ticketData.ticketName
  );

  let header = displayName;
  if (ticketData.isRevoked) {
    header = `[CANCELED] ${displayName})`;
  } else if (ticketData.isConsumed) {
    header = `[SCANNED] ${displayName})`;
  }

  return {
    header,
    displayName
  };
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
  if (pcd.type !== EdDSATicketPCDPackage.name) {
    throw new Error("Expected EdDSATicketPCD");
  }
}

/**
 * The PCD package of the EdDSA Ticket PCD. It exports an object containing
 * the code necessary to operate on this PCD data.
 */
export const EdDSATicketPCDPackage: PCDPackage<
  EdDSATicketPCDClaim,
  EdDSATicketPCDProof,
  EdDSATicketPCDArgs
> = {
  name: EdDSATicketPCDTypeName,
  getDisplayOptions,
  prove,
  verify,
  serialize,
  deserialize
};
