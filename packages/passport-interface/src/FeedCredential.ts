import { EmailPCD } from "@pcd/email-pcd";
import { SerializedPCD } from "@pcd/pcd-types";
import {
  SemaphoreSignaturePCD,
  SemaphoreSignaturePCDPackage
} from "@pcd/semaphore-signature-pcd";

// Timestamps last for one hour
const TIMESTAMP_RESOLUTION = 1000 * 60 * 60;

// Timestamps have a grace period of one minute to prevent hard cut-offs
// around the hour mark.
const TIMESTAMP_GRACE_PERIOD = 1000 * 60 * 1;

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
function validateFeedCredentialTimestamp(timestamp: number): boolean {
  const now = Date.now();
  // How far we are into the current TIMESTAMP_RESOLUTION period
  const offset = now % TIMESTAMP_RESOLUTION;

  const thisTimestampPeriod = now - offset;

  // A timestamp matched to the start of the current period is always valid
  const validTimestamps = [thisTimestampPeriod];

  // If we are close to the start of a new period, a credential from the
  // previous period is also acceptable
  if (offset <= TIMESTAMP_GRACE_PERIOD) {
    validTimestamps.push(thisTimestampPeriod - TIMESTAMP_RESOLUTION);
  }

  // If we are close to the end of a period, accept a credential whose
  // timestamp is in the next period, to allow for some clock skew
  if (TIMESTAMP_RESOLUTION - offset <= TIMESTAMP_GRACE_PERIOD) {
    validTimestamps.push(thisTimestampPeriod + TIMESTAMP_RESOLUTION);
  }

  return validTimestamps.includes(timestamp);
}

async function deserializeAndVerify(
  serializedPCD: SerializedPCD<SemaphoreSignaturePCD>
): Promise<boolean> {
  const pcd = await SemaphoreSignaturePCDPackage.deserialize(serializedPCD.pcd);

  return await SemaphoreSignaturePCDPackage.verify(pcd);
}

export async function verifyFeedCredential(
  serializedPCD: SerializedPCD<SemaphoreSignaturePCD>,
  pcdVerifier?: (pcd: SerializedPCD<SemaphoreSignaturePCD>) => Promise<boolean>
) {
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
