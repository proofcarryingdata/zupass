import {
  ArgumentTypeName,
  DisplayOptions,
  PCDPackage,
  SerializedPCD
} from "@pcd/pcd-types";
import { PODContent } from "@pcd/pod";
import { PODEntries, PODPCDPackage } from "@pcd/pod-pcd";
import JSONBig from "json-bigint";
import { v4 as uuid } from "uuid";
import {
  IPODTicketData,
  PODTicketPCD,
  PODTicketPCDArgs,
  PODTicketPCDClaim,
  PODTicketPCDProof,
  PODTicketPCDTypeName
} from "./PODTicketPCD";

function ticketDataToEntries(ticket: IPODTicketData): PODEntries {
  return {
    attendeeEmail: {
      type: "string",
      value: ticket.attendeeEmail
    },
    attendeeName: {
      type: "string",
      value: ticket.attendeeName
    },
    ticketId: {
      type: "string", // should we convert UUIDs to bigints here?
      value: ticket.ticketId
    },
    eventId: {
      type: "string",
      value: ticket.eventId
    },
    productId: {
      type: "string",
      value: ticket.productId
    },
    attendeeSemaphoreId: {
      type: "cryptographic",
      value: BigInt(ticket.attendeeSemaphoreId)
    },
    eventName: {
      type: "string",
      value: ticket.eventName
    },
    ticketName: {
      type: "string",
      value: ticket.ticketName
    },
    isConsumed: {
      type: "int",
      value: ticket.isConsumed ? 1n : 0n
    },
    isRevoked: {
      type: "int",
      value: ticket.isRevoked ? 1n : 0n
    },
    checkerEmail: {
      type: "string",
      value: ticket.checkerEmail ?? ""
    },
    timestampConsumed: {
      type: "int",
      value: BigInt(ticket.timestampConsumed)
    },
    timestampSigned: {
      type: "int",
      value: BigInt(ticket.timestampSigned)
    },
    imageUrl: {
      type: "string",
      value: ticket.imageUrl ?? ""
    },
    imageAltText: {
      type: "string",
      value: ticket.imageAltText ?? ""
    },
    ticketCategory: {
      type: "int",
      value: BigInt(ticket.ticketCategory)
    }
  };
}

/**
 * Creates a new {@link PODTicketPCD} by generating an {@link PODTicketPCDProof}
 * and deriving an {@link PODTicketPCDClaim} from the given {@link PODTicketPCDArgs}.
 */
export async function prove(args: PODTicketPCDArgs): Promise<PODTicketPCD> {
  if (!args.privateKey.value) {
    throw new Error("missing private key");
  }

  if (!args.ticket.value) {
    throw new Error("missing ticket value");
  }

  const ticket = args.ticket.value;

  const podPCD = await PODPCDPackage.prove({
    privateKey: args.privateKey,
    id: {
      value: undefined,
      argumentType: ArgumentTypeName.String
    },
    entries: {
      value: ticketDataToEntries(ticket),
      argumentType: ArgumentTypeName.Object
    }
  });

  const id = args.id.value ?? uuid();

  return new PODTicketPCD(id, { ticket }, { podPCD });
}

/**
 * Verifies a POD Ticket PCD by checking that its {@link PODTicketPCDClaim} corresponds to
 * its {@link PODTicketPCDProof}. If they match, the function returns true, otherwise false.
 * In most cases, verifying the validity of the PCD with this function is not enough.
 * It may also be necessary to ensure that the parameters of the ticket, such as the
 * productId and eventId, match the expected values, and that the public key of the
 * entity that signed the ticket is indeed the authority for that event.
 */
export async function verify(pcd: PODTicketPCD): Promise<boolean> {
  const content = PODContent.fromEntries(ticketDataToEntries(pcd.claim.ticket));

  if (content.contentID !== pcd.proof.podPCD.pod.contentID) {
    return false;
  }

  return PODPCDPackage.verify(pcd.proof.podPCD);
}

/**
 * Serializes a {@link PODTicketPCD}.
 * @param pcd The POD Ticket PCD to be serialized.
 * @returns The serialized version of the POD Ticket PCD.
 */
export async function serialize(
  pcd: PODTicketPCD
): Promise<SerializedPCD<PODTicketPCD>> {
  const serializedPODPCD = await PODPCDPackage.serialize(pcd.proof.podPCD);

  return {
    type: PODTicketPCDTypeName,
    pcd: JSONBig().stringify({
      id: pcd.id,
      podPCD: serializedPODPCD,
      ticket: pcd.claim.ticket
    })
  } as SerializedPCD<PODTicketPCD>;
}

/**
 * Deserializes a serialized {@link PODTicketPCD}.
 * @param serialized The serialized PCD to deserialize.
 * @returns The deserialized version of the POD Ticket PCD.
 */
export async function deserialize(serialized: string): Promise<PODTicketPCD> {
  const deserializedWrapper = JSONBig().parse(serialized);
  const deserializedPODPCD = await PODPCDPackage.deserialize(
    deserializedWrapper.podPCD.pcd
  );
  return new PODTicketPCD(
    deserializedWrapper.id,
    { ticket: deserializedWrapper.ticket },
    { podPCD: deserializedPODPCD }
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
 * Provides the information about the {@link PODTicketPCD} that will be displayed
 * to users on Zupass.
 * @param pcd The POD Ticket PCD instance.
 * @returns The information to be displayed, specifically `header` and `displayName`.
 */
export function getDisplayOptions(pcd: PODTicketPCD): DisplayOptions {
  const ticketData = pcd.claim.ticket;
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
    header = `[CANCELED] ${displayName}`;
  } else if (ticketData.isConsumed) {
    header = `[SCANNED] ${displayName}`;
  }

  return {
    header,
    displayName
  };
}

/**
 * The PCD package of the POD Ticket PCD. It exports an object containing
 * the code necessary to operate on this PCD data.
 */
export const PODTicketPCDPackage: PCDPackage<
  PODTicketPCDClaim,
  PODTicketPCDProof,
  PODTicketPCDArgs
> = {
  name: PODTicketPCDTypeName,
  getDisplayOptions,
  prove,
  verify,
  serialize,
  deserialize
};
