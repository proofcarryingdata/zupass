import { EdDSAPCD, EdDSAPCDPackage } from "@pcd/eddsa-pcd";
import {
  ArgumentTypeName,
  DisplayOptions,
  PCD,
  PCDPackage,
  SerializedPCD
} from "@pcd/pcd-types";
import JSONBig from "json-bigint";
import _ from "lodash";
import { v4 as uuid } from "uuid";
import {
  EdDSATicketPCDArgs,
  EdDSATicketPCDTypeName,
  ITicketData
} from "./meta";
import { getEdDSATicketData, ticketDataToBigInts } from "./utils";

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
