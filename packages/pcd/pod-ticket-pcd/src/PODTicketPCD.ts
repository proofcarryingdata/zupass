import { ObjectArgument, PCD, StringArgument } from "@pcd/pcd-types";
import type { PODPCDProof } from "@pcd/pod-pcd";
import type { IPODTicketData } from "./schema";

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
  signerPublicKey: string;
}

export type PODTicketPCDProof = PODPCDProof;

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
