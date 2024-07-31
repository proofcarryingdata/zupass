import { GPCBoundConfig, GPCPCDInitArgs } from "@pcd/gpc-pcd";
import {
  BooleanArgument,
  PCD,
  PCDArgument,
  RevealListArgument,
  StringArgument
} from "@pcd/pcd-types";
import { PODValue } from "@pcd/pod";
import { IPODTicketData, PODTicketPCD } from "@pcd/pod-ticket-pcd";
import { SemaphoreIdentityPCD } from "@pcd/semaphore-identity-pcd";
import { Groth16Proof } from "snarkjs";

export const ZKPODTicketPCDTypeName = "zk-pod-ticket-pcd";

/**
 * Initialization is delegated to GPCPCD.
 */
export type ZKPODTicketPCDInitArgs = GPCPCDInitArgs;

/**
 * Specifies which fields of a PODTicketPCD should be revealed in a proof.
 */
export type PODTicketFieldsToReveal = {
  revealTicketId?: boolean;
  revealEventId?: boolean;
  revealProductId?: boolean;
  revealTimestampConsumed?: boolean;
  revealTimestampSigned?: boolean;
  revealAttendeeSemaphoreId?: boolean;
  revealIsConsumed?: boolean;
  revealIsRevoked?: boolean;
  revealTicketCategory?: boolean;
  revealAttendeeEmail?: boolean;
  revealAttendeeName?: boolean;
};

/**
 * We can match tickets against patterns consisting of either:
 * - A list of signerPublicKeys
 * - A list of signerPublicKeys and eventIds
 * - A list of signerPublicKeys and eventIds and productIds
 * It is not possible for the array to contain a mix where some patterns
 * have different numbers or types of elements. This is because this structure
 * will be transformed into an array of either single values or two-or-three
 * element tuples, depending on the presence of 'events' and 'products'
 * respectively.
 * See {@link patternsToPODValueTuples} for more details and
 * {@link checkPatterns} for validation rules.
 */
export type TicketMatchPatterns =
  | {
      signerPublicKey: string;
      events?: undefined;
    }[]
  | {
      signerPublicKey: string;
      events: { id: string; productIds: undefined }[];
    }[]
  | {
      signerPublicKey: string;
      events: { id: string; productIds: string[] }[];
    }[];

/**
 * Arguments to request a new proof.
 */
export type ZKPODTicketPCDArgs = {
  // generally, `ticket` and `identity` are user-provided
  ticket: PCDArgument<
    PODTicketPCD,
    {
      // patterns to match tickets against
      ticketPatterns: TicketMatchPatterns;
      // user friendly message when no valid ticket is found
      notFoundMessage: string;
    }
  >;
  identity: PCDArgument<SemaphoreIdentityPCD>;

  // `fieldsToReveal`, `externalNullifier`, `watermark` are usually app-specified
  fieldsToReveal: RevealListArgument<PODTicketFieldsToReveal>;
  revealSignerPublicKey: BooleanArgument;
  watermark: StringArgument;

  // provide externalNullifier field as input to a nullifier hash
  externalNullifier: StringArgument;
};

/**
 * Defines the ZKPODTicketPCD's claim. Includes the GPC configuration, and a
 * partial set of data provided as input to the proof.
 */
export interface ZKPODTicketPCDClaim {
  /**
   * GPC configuration.
   */
  config: GPCBoundConfig;
  /**
   * Partial ticket data in object form.
   */
  partialTicket: Partial<IPODTicketData>;
  /**
   * Ticket match patterns. See {@link TicketMatchPatterns}.
   */
  ticketPatterns: TicketMatchPatterns;
  /**
   * Signer public key. See {@link checkPublicKeyFormat} for format details.
   */
  signerPublicKey: string;
  /**
   * Nullifier hash computed during proving.
   */
  nullifierHash: bigint;
  /**
   * External nullifier provided in proof args.
   */
  externalNullifier: PODValue;
  /**
   * Watermark provided in proof args.
   */
  watermark: PODValue;
}

/**
 * Defines the ZKPODTicketPCD proof.  The proof is a Groth16 proof from a
 * specific circuit in the supported family of circuits.
 */
export interface ZKPODTicketPCDProof {
  /**
   * Groth16 proof which can be used to cryptographically verify the
   * {@link ZKPODTicketPCDClaim}.
   */
  groth16Proof: Groth16Proof;
}

/**
 * ZKPODTicketPCD PCD type representation.
 */
export class ZKPODTicketPCD
  implements PCD<ZKPODTicketPCDClaim, ZKPODTicketPCDProof>
{
  type = ZKPODTicketPCDTypeName;

  public constructor(
    readonly id: string,
    readonly claim: ZKPODTicketPCDClaim,
    readonly proof: ZKPODTicketPCDProof
  ) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}
