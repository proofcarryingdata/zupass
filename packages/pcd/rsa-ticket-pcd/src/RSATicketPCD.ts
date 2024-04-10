import { PCD, PCDArgument, StringArgument } from "@pcd/pcd-types";
import { RSAPCD } from "@pcd/rsa-pcd";

export const RSATicketPCDTypeName = "rsa-ticket-pcd";

export interface IRSATicketData {
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

export interface RSATicketPCDInitArgs {
  makeEncodedVerifyLink?: (encodedPCD: string) => string;
}

export type RSATicketPCDArgs = {
  id: StringArgument;
  rsaPCD: PCDArgument<RSATicketPCD>;
};

export interface RSATicketPCDClaim {}

export interface RSATicketPCDProof {
  rsaPCD: RSAPCD;
}

export class RSATicketPCD implements PCD<RSATicketPCDClaim, RSATicketPCDProof> {
  type = RSATicketPCDTypeName;
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
