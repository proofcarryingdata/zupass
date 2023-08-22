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
import { getTicketData, ticketDataToBigInts } from "./utils";

export const EdDSAPCDTypeName = "eddsa-ticket-pcd";

export interface ITicketData {
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

export interface EdDSATicketPCDInitArgs {
  makeEncodedVerifyLink?: (encodedPCD: string) => string;
}

export let initArgs: EdDSATicketPCDInitArgs;
async function init(args: EdDSATicketPCDInitArgs): Promise<void> {
  initArgs = args;
}

// expect(await verify(pcd)).to.be.true;

export interface EdDSATicketPCDArgs {
  // The EdDSA private key to sign the message with, as a hex string
  privateKey: StringArgument;
  // ticket information that is encoded into this pcd
  ticket: ObjectArgument<ITicketData>;
  // A unique string identifying the PCD
  id: StringArgument;
}

export interface EdDSATicketPCDClaim {
  ticket: ITicketData;
}

export interface EdDSATicketPCDProof {
  eddsaPCD: EdDSAPCD;
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

  const ticketData = getTicketData(pcd);

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
    displayName: "ticket-" + pcd.id.substring(0, 4)
  };
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
