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
import { EdDSATicketCardBody } from "./CardBody";
import { getEdDSATicketData, ticketDataToBigInts } from "./utils";

export const EdDSAPCDTypeName = "eddsa-ticket-pcd";

export enum TicketCategory {
  ZuConnect = 0,
  Devconnect = 1,
  PcdWorkingGroup = 2,
  Zuzalu = 3
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
  // the fields below are not signed and are used for display purposes

  attendeeName: string;
  attendeeEmail: string;
  eventName: string;
  ticketName: string;
  checkerEmail: string | undefined;

  // the fields below are signed using the server's private eddsa key

  ticketId: string; // primary key uuid of the ticket's `devconnect_pretix_tickets` entry
  eventId: string; // primary key uuid of the event's `pretix_events_config` entry
  productId: string; // primary key uuid of the ticket's `devconnect_pretix_items_info` entry
  timestampConsumed: number;
  timestampSigned: number;
  attendeeSemaphoreId: string; // stringified big int
  isConsumed: boolean;
  isRevoked: boolean;
  ticketCategory: TicketCategory;
}

export interface EdDSATicketPCDInitArgs {
  makeEncodedVerifyLink?: (encodedPCD: string) => string;
}

export let initArgs: EdDSATicketPCDInitArgs;
async function init(args: EdDSATicketPCDInitArgs): Promise<void> {
  initArgs = args;
}

export type EdDSATicketPCDArgs = {
  // The EdDSA private key to sign the message with, as a hex string
  privateKey: StringArgument;
  // ticket information that is encoded into this pcd
  ticket: ObjectArgument<ITicketData>;
  // A unique string identifying the PCD
  id: StringArgument;
};

export interface EdDSATicketPCDClaim {
  ticket: ITicketData;
}

export interface EdDSATicketPCDProof {
  eddsaPCD: EdDSAPCD; // eddsa signature of {@link EdDSATicketPCDClaim.ticket}
}

export class EdDSATicketPCD
  implements PCD<EdDSATicketPCDClaim, EdDSATicketPCDProof>
{
  type = EdDSAPCDTypeName;
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

export async function prove(args: EdDSATicketPCDArgs): Promise<EdDSATicketPCD> {
  if (!initArgs) {
    throw new Error("package not initialized");
  }

  if (!args.privateKey.value) {
    throw new Error("missing private key");
  }

  if (!args.ticket.value) {
    throw new Error("missing ticket value");
  }

  const serializedTicket = ticketDataToBigInts(args.ticket.value);

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

export async function verify(pcd: EdDSATicketPCD): Promise<boolean> {
  if (!initArgs) {
    throw new Error("package not initialized");
  }

  const messageDerivedFromClaim = ticketDataToBigInts(pcd.claim.ticket);

  if (!_.isEqual(messageDerivedFromClaim, pcd.proof.eddsaPCD.claim.message)) {
    throw new Error(`ticket data does not match proof`);
  }

  try {
    const valid = await EdDSAPCDPackage.verify(pcd.proof.eddsaPCD);
    return valid;
  } catch (e) {
    return false;
  }
}

export async function serialize(
  pcd: EdDSATicketPCD
): Promise<SerializedPCD<EdDSATicketPCD>> {
  if (!initArgs) {
    throw new Error("package not initialized");
  }

  const serializedEdDSAPCD = await EdDSAPCDPackage.serialize(
    pcd.proof.eddsaPCD
  );

  return {
    type: EdDSAPCDTypeName,
    pcd: JSONBig().stringify({
      id: pcd.id,
      eddsaPCD: serializedEdDSAPCD,
      ticket: pcd.claim.ticket
    })
  } as SerializedPCD<EdDSATicketPCD>;
}

export async function deserialize(serialized: string): Promise<EdDSATicketPCD> {
  if (!initArgs) {
    throw new Error("package not initialized");
  }

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

export function getDisplayOptions(pcd: EdDSATicketPCD): DisplayOptions {
  if (!initArgs) {
    throw new Error("package not initialized");
  }

  const ticketData = getEdDSATicketData(pcd);
  if (!ticketData) {
    return {
      header: "Ticket",
      displayName: "ticket-" + pcd.id.substring(0, 4)
    };
  }

  let header = "Ticket";

  if (ticketData.isRevoked) {
    header = `[CANCELED] ${ticketData.eventName} (${ticketData.ticketName})`;
  } else if (ticketData.isConsumed) {
    header = `[SCANNED] ${ticketData.eventName} (${ticketData.ticketName})`;
  } else if (ticketData.eventName && ticketData.ticketName) {
    header = `${ticketData.eventName} (${ticketData.ticketName})`;
  }

  return {
    header: header,
    displayName: `${ticketData.eventName} (${ticketData.ticketName})`
  };
}

export function isEdDSATicketPCD(pcd: PCD): pcd is EdDSATicketPCD {
  return pcd.type === EdDSAPCDTypeName;
}

/**
 * PCD-conforming wrapper to sign messages using an EdDSA keypair,
 * representing a Devconnect ticket.
 */
export const EdDSATicketPCDPackage: PCDPackage<
  EdDSATicketPCDClaim,
  EdDSATicketPCDProof,
  EdDSATicketPCDArgs,
  EdDSATicketPCDInitArgs
> = {
  name: EdDSAPCDTypeName,
  renderCardBody: EdDSATicketCardBody,
  getDisplayOptions,
  init,
  prove,
  verify,
  serialize,
  deserialize
};
