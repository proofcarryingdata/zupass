import { isEqualEdDSAPublicKey } from "@pcd/eddsa-pcd";
import { ITicketData } from "@pcd/eddsa-ticket-pcd";
import {
  EdDSATicketFieldsToReveal,
  ZKEdDSAEventTicketPCD,
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
  { watermark, config, fieldsToReveal, externalNullifier }: ZuAuthArgs
): Promise<ZKEdDSAEventTicketPCD> {
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

  // Check if the external nullifier matches
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

  // For each of the fields configured to be revealed, check that the claim
  // contains values.
  for (const [revealedField, fieldName] of Object.entries(revealedFields)) {
    if (fieldsToReveal[revealedField as keyof EdDSATicketFieldsToReveal]) {
      checkIsDefined(pcd.claim.partialTicket[fieldName], fieldName);
    }
  }

  const publicKeys = config.map((em) => em.publicKey);
  const eventIds = new Set(config.map((em) => em.eventId));
  const productIds = new Set(
    // Product ID is optional, so it's important to filter out undefined values
    config
      .map((em) => em.productId)
      .filter((productId) => productId !== undefined)
  );

  if (eventIds.size > 0 && eventIds.size <= 20) {
    if (pcd.claim.validEventIds === undefined) {
      throw new ZuAuthAuthenticationError("validEventIds is not defined");
    }
    if (
      pcd.claim.validEventIds.length !== eventIds.size ||
      pcd.claim.validEventIds.some((eventId) => !eventIds.has(eventId))
    ) {
      throw new ZuAuthAuthenticationError(
        "validEventIds does not match configured event IDs"
      );
    }
  }

  if (eventIds.size > 20 && pcd.claim.validEventIds !== undefined) {
    throw new ZuAuthAuthenticationError(
      "validEventIds is defined but there are too many event IDs configured"
    );
  }

  if (
    publicKeys.length > 0 &&
    !publicKeys.find((pubKey) =>
      isEqualEdDSAPublicKey(pubKey, pcd.claim.signer)
    )
  ) {
    throw new ZuAuthAuthenticationError(
      "Signing key does not match any of the configured public keys"
    );
  }

  if (
    eventIds.size > 0 &&
    fieldsToReveal.revealEventId === true &&
    checkIsDefined<string>(pcd.claim.partialTicket.eventId, "eventId") &&
    !eventIds.has(pcd.claim.partialTicket.eventId)
  ) {
    throw new ZuAuthAuthenticationError(
      "Event ID does not match any of the configured event IDs"
    );
  }

  if (
    productIds.size > 0 &&
    pcd.claim.partialTicket.productId &&
    checkIsDefined<string>(pcd.claim.partialTicket.productId, "productId") &&
    !productIds.has(pcd.claim.partialTicket.productId)
  ) {
    throw new ZuAuthAuthenticationError(
      "Product ID does not match any of the configured product IDs"
    );
  }

  return pcd;
}
