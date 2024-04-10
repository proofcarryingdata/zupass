import { EdDSATicketPCD } from "@pcd/eddsa-ticket-pcd";
import {
  BigIntArgument,
  PCDArgument,
  RevealListArgument,
  StringArrayArgument
} from "@pcd/pcd-types";
import { SemaphoreIdentityPCD } from "@pcd/semaphore-identity-pcd";

export const ZKEdDSAEventTicketPCDTypeName = "zk-eddsa-event-ticket-pcd";

/**
 * Specifies which fields of an EdDSATicket should be revealed in a proof.
 */
export type EdDSATicketFieldsToReveal = {
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
 * Arguments to request a new proof.
 */
export type ZKEdDSAEventTicketPCDArgs = {
  // generally, `ticket` and `identity` are user-provided
  ticket: PCDArgument<
    EdDSATicketPCD,
    {
      /**
       * used only in proof screen validation
       *
       * dev should implement additional constraints either in the proof level (e.g. validEventIds)
       * or in the app level (e.g. check revealed eventId or productId)
       *
       * If both `eventIds` and `productIds` are provided, they must be of the same length and
       * they will be checked as pairs. Pass empty array to skip the check.
       */
      eventIds: string[];
      productIds: string[];
      // user friendly message when no valid ticket is found
      notFoundMessage: string;
    }
  >;
  identity: PCDArgument<SemaphoreIdentityPCD>;

  // `validEventIds` is usually app-specified.  It is optional, and if included
  // the PCD proves that the ticket's event ID is in this list.  This is a list of
  // UUIDs with max length VALID_EVENT_IDS_MAX_LEN (20).
  validEventIds: StringArrayArgument;

  // `fieldsToReveal`, `externalNullifier`, `watermark` are usually app-specified
  fieldsToReveal: RevealListArgument<EdDSATicketFieldsToReveal>;
  watermark: BigIntArgument;

  // provide externalNullifier field to request a nullifierHash
  // if you don't provide this field, no nullifierHash will be outputted
  externalNullifier: BigIntArgument;
};
