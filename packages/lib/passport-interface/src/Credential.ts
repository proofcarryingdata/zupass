import { EmailPCD, EmailPCDPackage } from "@pcd/email-pcd";
import { SerializedPCD } from "@pcd/pcd-types";
import {
  SemaphoreSignaturePCD,
  SemaphoreSignaturePCDPackage
} from "@pcd/semaphore-signature-pcd";
import { ONE_HOUR_MS, ONE_MINUTE_MS } from "@pcd/util";

// Timestamps last for one hour and 20 minutes
// Compare to CACHE_TTL in CredentialManager.ts, which is one hour, meaning
// that client-side cached credentials will be refreshed before they expire
const TIMESTAMP_MAX_AGE = ONE_HOUR_MS + 20 * ONE_MINUTE_MS;

export type Credential = SerializedPCD<SemaphoreSignaturePCD>;

/*
 * The payload encoded in the message of the SemaphoreSignaturePCD passed
 * as a credential to feeds.
 */
export interface CredentialPayload {
  // The only type of PCD that can appear here is EmailPCD.
  pcd?: SerializedPCD<EmailPCD>;
  timestamp: number;
}

/**
 * The result of successfully verifying a credential.
 */
export interface VerifiedCredential {
  signatureClaim: SemaphoreSignaturePCD["claim"];
  emailClaim?: EmailPCD["claim"];
  emailSignatureClaim?: EmailPCD["proof"]["eddsaPCD"]["claim"];
}

/**
 * Creates a feed credential payload with timestamp.
 */
export function createCredentialPayload(
  pcd: SerializedPCD<EmailPCD> | undefined = undefined
): CredentialPayload {
  return {
    pcd: pcd,
    timestamp: Date.now()
  };
}

/**
 * Validates a credential timestamp.
 */
function validateCredentialTimestamp(timestamp: number): boolean {
  const now = Date.now();
  return now - timestamp < TIMESTAMP_MAX_AGE;
}

/*
 * Verifies that a credential has a valid Semaphore signature and a non-expired
 * timestamp.
 *
 * If the credential payload contains a serialized EmailPCD, also verifies it
 * and checks that the Semaphore identity in the EmailPCD's claim matches that
 * of the signature.
 *
 * Does *not* check if the EmailPCD was signed by Zupass.
 */
export async function verifyCredential(
  credential: Credential
): Promise<VerifiedCredential> {
  if (credential.type !== SemaphoreSignaturePCDPackage.name) {
    throw new Error(`Credential is not a Semaphore Signature PCD`);
  }
  // Ensure that the signature part of the credential verifies.
  const pcd = await SemaphoreSignaturePCDPackage.deserialize(credential.pcd);
  if (!(await SemaphoreSignaturePCDPackage.verify(pcd))) {
    throw new Error(`Could not verify signature PCD`);
  }

  // Parse data from the Semaphore Signature claim. Will throw if the message
  // is not valid JSON.
  const payload: CredentialPayload = JSON.parse(pcd.claim.signedMessage);

  // The payload should have a timestamp, which should also be a number within
  // certain bounds.
  if (!validateCredentialTimestamp(payload.timestamp)) {
    throw new Error("Credential timestamp out of bounds");
  }

  // If the payload contains a PCD, verify it
  if (payload.pcd) {
    // Only EmailPCD is supported here
    if (payload.pcd.type !== EmailPCDPackage.name) {
      throw new Error(`Payload PCD is not an EmailPCD`);
    }

    // EmailPCD must verify
    const emailPCD = await EmailPCDPackage.deserialize(payload.pcd.pcd);
    if (!(await EmailPCDPackage.verify(emailPCD))) {
      throw new Error(`Could not verify email PCD`);
    }

    // EmailPCD contains a Semaphore ID in its claim, which must match that of
    // the signature.
    if (emailPCD.claim.semaphoreId !== pcd.claim.identityCommitment) {
      throw new Error(
        `Email PCD and Signature PCD do not have matching identities`
      );
    }

    // Everything passes, return the payload
    return {
      signatureClaim: pcd.claim,
      emailClaim: emailPCD.claim,
      emailSignatureClaim: emailPCD.proof.eddsaPCD.claim
    };
  } else {
    // Return the payload, without an EmailPCD as none was present
    return { signatureClaim: pcd.claim };
  }
}
