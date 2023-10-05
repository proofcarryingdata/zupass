import { EmailPCD } from "@pcd/email-pcd";
import { SerializedPCD } from "@pcd/pcd-types";

const TIMESTAMP_RESOLUTION = 1000 * 60 * 60;

/*
 * The payload encoded in the message of the SemaphoreSignaturePCD passed
 * as a credential to feeds.
 */
export interface FeedCredentialPayload {
  // The only type of PCD that can appear here is EmailPCD.
  pcd?: SerializedPCD<EmailPCD>;
  timestamp: number;
}

/**
 * Creates a feed credential payload with timestamp.
 *
 * If TIMESTAMP_RESOLUTION is one hour, then timestamps will be created for
 * 00:00, 01:00, 02:00 and so on. This ensures that for a given credential,
 * only 24 possible timestamps can be created in one day, which gives us a
 * good chance of being able to cache credentials, while still ensuring that
 * credentials expire quickly enough that long-term re-use is prevented.
 */
export function createFeedCredentialPayload(
  pcd?: SerializedPCD<EmailPCD>
): FeedCredentialPayload {
  const now = Date.now();
  return {
    pcd: pcd,
    // Rounds down to the nearest TIMESTAMP_RESOLUTION
    timestamp: now - (now % TIMESTAMP_RESOLUTION)
  };
}

/**
 * Validates a feed credential timestamp. Ensures that the timestamp was
 * created in the same TIMESTAMP_RESOLUTION period that we are currently in.
 */
export function validateFeedCredentialTimestamp(timestamp: number): boolean {
  const now = Date.now();
  return timestamp === now - (now % TIMESTAMP_RESOLUTION);
}
