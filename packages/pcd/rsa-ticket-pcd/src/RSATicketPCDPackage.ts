import { DisplayOptions, PCDPackage, SerializedPCD } from "@pcd/pcd-types";
import { RSAPCDPackage } from "@pcd/rsa-pcd";
import JSONBig from "json-bigint";
import { v4 as uuid } from "uuid";
import {
  RSATicketPCD,
  RSATicketPCDArgs,
  RSATicketPCDClaim,
  RSATicketPCDInitArgs,
  RSATicketPCDProof,
  RSATicketPCDTypeName
} from "./RSATicketPCD.js";
import { getTicketData } from "./utils.js";

export let initArgs: RSATicketPCDInitArgs;

async function init(args: RSATicketPCDInitArgs): Promise<void> {
  initArgs = args;
}

export async function prove(args: RSATicketPCDArgs): Promise<RSATicketPCD> {
  if (!initArgs) {
    throw new Error("package not initialized");
  }

  if (!args.rsaPCD.value?.pcd) {
    throw new Error("missing rsa pcd");
  }

  const deserialized = await RSAPCDPackage.deserialize(args.rsaPCD.value?.pcd);
  const valid = await RSAPCDPackage.verify(deserialized);

  if (!valid) {
    throw new Error("supplied rsa pcd is not valid");
  }

  const id = args.id.value ?? uuid();

  return new RSATicketPCD(id, {}, { rsaPCD: deserialized });
}

export async function verify(pcd: RSATicketPCD): Promise<boolean> {
  if (!initArgs) {
    throw new Error("package not initialized");
  }

  try {
    const valid = await RSAPCDPackage.verify(pcd.proof.rsaPCD);
    return valid;
  } catch (e) {
    return false;
  }
}

export async function serialize(
  pcd: RSATicketPCD
): Promise<SerializedPCD<RSATicketPCD>> {
  if (!initArgs) {
    throw new Error("package not initialized");
  }

  const serializedRSAPCD = await RSAPCDPackage.serialize(pcd.proof.rsaPCD);

  return {
    type: RSATicketPCDTypeName,
    pcd: JSONBig().stringify({
      id: pcd.id,
      rsaPCD: serializedRSAPCD
    })
  } as SerializedPCD<RSATicketPCD>;
}

export async function deserialize(serialized: string): Promise<RSATicketPCD> {
  if (!initArgs) {
    throw new Error("package not initialized");
  }

  const deserializedWrapper = JSONBig().parse(serialized);
  const deserializedRSAPCD = await RSAPCDPackage.deserialize(
    deserializedWrapper.rsaPCD.pcd
  );
  return new RSATicketPCD(
    deserializedWrapper.id,
    {},
    { rsaPCD: deserializedRSAPCD }
  );
}

export function getDisplayOptions(pcd: RSATicketPCD): DisplayOptions {
  if (!initArgs) {
    throw new Error("package not initialized");
  }

  const ticketData = getTicketData(pcd);
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
 * PCD-conforming wrapper to sign messages using an RSA keypair.
 */
export const RSATicketPCDPackage: PCDPackage<
  RSATicketPCDClaim,
  RSATicketPCDProof,
  RSATicketPCDArgs,
  RSATicketPCDInitArgs
> = {
  name: RSATicketPCDTypeName,
  getDisplayOptions,
  init,
  prove,
  verify,
  serialize,
  deserialize
};
