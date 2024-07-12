import { isEqualEdDSAPublicKey } from "@pcd/eddsa-pcd";
import { ITicketData } from "@pcd/eddsa-ticket-pcd";
import { PipelineZuAuthConfig } from "@pcd/passport-interface";
import {
  EdDSATicketFieldsToReveal,
  ZKEdDSAEventTicketPCD,
  ZKEdDSAEventTicketPCDClaim,
  ZKEdDSAEventTicketPCDPackage,
  ZKEdDSAEventTicketPCDTypeName
} from "@pcd/zk-eddsa-event-ticket-pcd";
import { ZuAuthArgs } from ".";

export class ZuAuthAuthenticationError extends Error {}

/**
 * Check if a given field is defined.
 */
function checkIsDefined<T>(
  field: T | undefined,
  fieldName: string
): field is T {
  if (field === undefined || field === null) {
    throw new ZuAuthAuthenticationError(
      `Field "${fieldName}" is undefined and should have a revealed value`
    );
  }
  return true;
}

/**
 * Check if a given field is undefined.
 */
function checkIsUndefined(field: unknown, fieldName: string): boolean {
  if (field !== undefined) {
    throw new ZuAuthAuthenticationError(
      `Field "${fieldName}" is defined and should not have a revealed value`
    );
  }
  return true;
}

/**
 * Check if an individual configuration matches the claim from the PCD.
 */
function claimMatchesConfiguration(
  claim: ZKEdDSAEventTicketPCDClaim,
  config: PipelineZuAuthConfig
): boolean {
  return (
    isEqualEdDSAPublicKey(claim.signer, config.publicKey) &&
    claim.partialTicket.eventId === config.eventId &&
    !!config.productId &&
    claim.partialTicket.productId === config.productId
  );
}

const revealedFields: Record<
  keyof EdDSATicketFieldsToReveal,
  keyof ITicketData
> = {
  revealAttendeeEmail: "attendeeEmail",
  revealAttendeeName: "attendeeName",
  revealAttendeeSemaphoreId: "attendeeSemaphoreId",
  revealEventId: "eventId",
  revealIsConsumed: "isConsumed",
  revealIsRevoked: "isRevoked",
  revealProductId: "productId",
  revealTicketCategory: "ticketCategory",
  revealTicketId: "ticketId",
  revealTimestampConsumed: "timestampConsumed",
  revealTimestampSigned: "timestampSigned"
} as const;

/**
 * Authenticates a ticket PCD.
 *
 * Receives a JSON-encoded serialized PCD string, where the PCD must be a
 * ZKEdDSAEventTicketPCD. This is deserialized and verified, throwing an
 * exception if either fails.
 *
 * The watermark in the PCD is compared against the value provided, and an
 * exception is thrown if they do not match.
 *
 * Finally, the PCD is compared against the metadata provided
 */
export async function authenticate(
  pcdStr: string,
  {
    watermark,
    config,
    fieldsToReveal,
    externalNullifier,
    checkEventIdWithoutRevealing = false
  }: ZuAuthArgs
): Promise<ZKEdDSAEventTicketPCD> {
  /**
   * Check to see if our inputs are valid, beginning with the PCD.
   */
  const serializedPCD = JSON.parse(pcdStr);
  if (serializedPCD.type !== ZKEdDSAEventTicketPCDTypeName) {
    throw new ZuAuthAuthenticationError(
      "PCD is malformed or of the incorrect type"
    );
  }

  const pcd = await ZKEdDSAEventTicketPCDPackage.deserialize(serializedPCD.pcd);

  if (!(await ZKEdDSAEventTicketPCDPackage.verify(pcd))) {
    throw new ZuAuthAuthenticationError("ZK ticket PCD is not valid");
  }

  /**
   * The configuration array must not be empty.
   */
  if (config.length === 0) {
    throw new ZuAuthAuthenticationError("Configuration is empty");
  }

  /**
   * Check if the external nullifier matches the configuration.
   */
  if (externalNullifier !== undefined) {
    if (pcd.claim.externalNullifier === undefined) {
      throw new ZuAuthAuthenticationError(
        "PCD is missing external nullifier when one was provided"
      );
    }
    if (
      pcd.claim.externalNullifier.toString() !== externalNullifier.toString()
    ) {
      throw new ZuAuthAuthenticationError(
        "External nullifier does not match the provided value"
      );
    }
  } else if (pcd.claim.externalNullifier !== undefined) {
    throw new ZuAuthAuthenticationError(
      "PCD contains an external nullifier when none was provided"
    );
  }

  if (pcd.claim.watermark !== watermark.toString()) {
    throw new ZuAuthAuthenticationError("PCD watermark does not match");
  }

  /**
   * Check that the revealed fields in the PCD match the expectations set out
   * in {@link revealedFields}. This is to ensure the consistency between the
   * configuration passed to this function, and the configuration used on the
   * client-side when generating the PCD.
   */
  for (const [revealedField, fieldName] of Object.entries(revealedFields)) {
    if (fieldsToReveal[revealedField as keyof EdDSATicketFieldsToReveal]) {
      checkIsDefined(pcd.claim.partialTicket[fieldName], fieldName);
    } else {
      checkIsUndefined(pcd.claim.partialTicket[fieldName], fieldName);
    }
  }

  /**
   * If {@link checkEventWithoutRevealing} is set to true, then the claim
   * should also include `validEventIds`, and these should match the events
   * contained in the configuration. There should also be a maximum of 20
   * configured events.
   */
  if (checkEventIdWithoutRevealing) {
    if (pcd.claim.validEventIds === undefined) {
      throw new ZuAuthAuthenticationError(
        "checkEventIdWithoutRevealing is enabled but validEventIds is not defined"
      );
    }
    const eventIds = new Set(config.map((em) => em.eventId));
    if (eventIds.size > 20) {
      throw new ZuAuthAuthenticationError(
        "checkEventIdWithoutRevealing is enabled but there are too many event IDs configured (maximum 20)"
      );
    }
    if (
      pcd.claim.validEventIds.length !== config.length ||
      pcd.claim.validEventIds.some((eventId) => !eventIds.has(eventId))
    ) {
      throw new ZuAuthAuthenticationError(
        "validEventIds does not match configured event IDs"
      );
    }
  } else {
    /**
     * If {@link checkEventWithoutRevealing} is false, `validEventIds` should
     * not be set.
     */
    if (pcd.claim.validEventIds) {
      throw new ZuAuthAuthenticationError(
        "validEventIds is defined but checkEventIdWithoutRevealing is not enabled"
      );
    }
  }

  /**
   * Our inputs are formally valid. Now we check to see if any of the
   * configuration patterns match the claim in the PCD.
   */
  let match = false;

  for (const em of config) {
    if (claimMatchesConfiguration(pcd.claim, em)) {
      match = true;
      break;
    }
  }

  if (!match) {
    throw new ZuAuthAuthenticationError(
      "PCD does not match any of the configured patterns"
    );
  }

  return pcd;
}
