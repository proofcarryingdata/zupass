import { EmailPCD } from "@pcd/email-pcd";
import { SerializedPCD } from "@pcd/pcd-types";
import {
  SemaphoreSignaturePCD,
  SemaphoreSignaturePCDPackage
} from "@pcd/semaphore-signature-pcd";
import { ONE_HOUR_MS } from "@pcd/util";

// Timestamps last for one hour
const TIMESTAMP_MAX_AGE = ONE_HOUR_MS;

/*
 * The payload encoded in the message of the SemaphoreSignaturePCD passed
 * as a credential to feeds.
 */
export interface FeedCredentialPayload {
  // The only type of PCD that can appear here is EmailPCD.
  pcd?: SerializedPCD<EmailPCD>;
  timestamp: number;
}

/*
 * The payload encoded in the message of the SemaphoreSignaturePCD passed
 * as a credential to the checkin api within the Generic Issuance backend.
 *
 * TODO: move to a different file.
 */
export interface GenericCheckinCredentialPayload {
  emailPCD: SerializedPCD<EmailPCD>;
  ticketIdToCheckIn: string;
  eventId: string;
  timestamp: number;
}

/**
 * Creates a feed credential payload with timestamp.
 */
export function createFeedCredentialPayload(
  pcd?: SerializedPCD
): FeedCredentialPayload {
  return {
    pcd: pcd,
    timestamp: Date.now()
  };
}

/**
 * Creates a credential payload for use in the Generic Issuance checkin API.
 *
 * TODO: move to a different file.
 */
export function createGenericCheckinCredentialPayload(
  emailPCD: SerializedPCD<EmailPCD>,
  ticketId: string,
  eventId: string
): GenericCheckinCredentialPayload {
  return {
    emailPCD: emailPCD,
    ticketIdToCheckIn: ticketId,
    eventId,
    timestamp: Date.now()
  };
}

/**
 * Validates a feed credential timestamp.
 */
function validateFeedCredentialTimestamp(timestamp: number): boolean {
  const now = Date.now();
  return now - timestamp < TIMESTAMP_MAX_AGE;
}

async function deserializeAndVerify(
  serializedPCD: SerializedPCD<SemaphoreSignaturePCD>
): Promise<boolean> {
  const pcd = await SemaphoreSignaturePCDPackage.deserialize(serializedPCD.pcd);

  return await SemaphoreSignaturePCDPackage.verify(pcd);
}

/**
 * For use on the server-side, verifies a PCD and checks that the timestamp
 * is within bounds.
 */
export async function verifyFeedCredential(
  serializedPCD: SerializedPCD<SemaphoreSignaturePCD>,
  pcdVerifier?: (pcd: SerializedPCD<SemaphoreSignaturePCD>) => Promise<boolean>
): Promise<{ pcd: SemaphoreSignaturePCD; payload: FeedCredentialPayload }> {
  if (pcdVerifier === undefined) {
    pcdVerifier = deserializeAndVerify;
  }

  if (!(await pcdVerifier(serializedPCD))) {
    throw new Error(`Could not verify SemaphoreSignaturePCD`);
  }

  // pcdVerifier doesn't actually give us the deserialized PCD back
  const pcd = await SemaphoreSignaturePCDPackage.deserialize(serializedPCD.pcd);

  const payload: FeedCredentialPayload = JSON.parse(pcd.claim.signedMessage);

  if (!validateFeedCredentialTimestamp(payload.timestamp)) {
    throw new Error("Credential timestamp out of bounds");
  }

  return { pcd, payload };
}
