import {
  DisplayOptions,
  PCD,
  PCDArgument,
  PCDPackage,
  SerializedPCD,
  StringArgument,
} from "@pcd/pcd-types";
import { RSAPCD, RSAPCDPackage } from "@pcd/rsa-pcd";
import JSONBig from "json-bigint";
import { v4 as uuid } from "uuid";
import { RSATicketCardBody } from "./CardBody";

export const RSAPCDTypeName = "rsa-ticket-pcd";

export interface RSATicketPCDArgs {
  id: StringArgument;
  rsaPCD: PCDArgument<RSATicketPCD>;
}

export interface RSATicketPCDClaim {}

export interface RSATicketPCDProof {
  rsaPCD: RSAPCD;
}

export class RSATicketPCD implements PCD<RSATicketPCDClaim, RSATicketPCDProof> {
  type = RSAPCDTypeName;
  claim: RSATicketPCDClaim;
  proof: RSATicketPCDProof;
  id: string;

  public constructor(
    id: string,
    claim: RSATicketPCDClaim,
    proof: RSATicketPCDProof
  ) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}

export async function prove(args: RSATicketPCDArgs): Promise<RSATicketPCD> {
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
  const serializedRSAPCD = await RSAPCDPackage.serialize(pcd.proof.rsaPCD);

  return {
    type: RSAPCDTypeName,
    pcd: JSONBig().stringify({
      id: pcd.id,
      rsaPCD: serializedRSAPCD,
    }),
  } as SerializedPCD<RSATicketPCD>;
}

export async function deserialize(serialized: string): Promise<RSATicketPCD> {
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
  return {
    header: "Ticket ZZZ",
    displayName: "ticket-" + pcd.id.substring(0, 4),
  };
}

/**
 * PCD-conforming wrapper to sign messages using an RSA keypair.
 */
export const RSATicketPCDPackage: PCDPackage<
  RSATicketPCDClaim,
  RSATicketPCDProof,
  RSATicketPCDArgs,
  undefined
> = {
  name: RSAPCDTypeName,
  renderCardBody: RSATicketCardBody,
  getDisplayOptions,
  prove,
  verify,
  serialize,
  deserialize,
};
