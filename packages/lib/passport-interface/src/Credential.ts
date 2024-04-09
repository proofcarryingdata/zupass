import { EdDSAPCDClaim } from "@pcd/eddsa-pcd";
import { EmailPCD, EmailPCDClaim, EmailPCDPackage } from "@pcd/email-pcd";
import { SerializedPCD } from "@pcd/pcd-types";
import {
  SemaphoreSignaturePCD,
  SemaphoreSignaturePCDClaim,
  SemaphoreSignaturePCDPackage
} from "@pcd/semaphore-signature-pcd";
import { ONE_HOUR_MS, ONE_MINUTE_MS } from "@pcd/util";

// Timestamps last for one hour and 20 minutes
// Compare to CACHE_TTL in CredentialManager.ts, which is one hour, meaning
// that client-side cached credentials will be refreshed before they expire
const TIMESTAMP_MAX_AGE = ONE_HOUR_MS + 20 * ONE_MINUTE_MS;

// To avoid writing `SerializedPCD<SemaphoreSignaturePCD>`, and also to make
// the `Credential` type a bit less tightly-bound to the implementation details
// of serialiazation and Semaphore signatures, we use this type.
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
 *
 * We do not need to return whole PCDs here, because the proofs have been
 * verified, and since we expect to cache these in memory, we can avoid wasting
 * memory on caching large PCD objects.
 */
export interface VerifiedCredential {
  // Every credential has a signature
  signatureClaim: SemaphoreSignaturePCDClaim;
  // Not all credentials have Email PCDs, so these claims are optional:
  emailClaim?: EmailPCDClaim;
  emailSignatureClaim?: EdDSAPCDClaim;
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

export class VerificationError extends Error {}

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
    throw new VerificationError(`Credential is not a Semaphore Signature PCD`);
  }
  // Ensure that the signature part of the credential verifies.
  const pcd = await SemaphoreSignaturePCDPackage.deserialize(credential.pcd);
  if (!(await SemaphoreSignaturePCDPackage.verify(pcd))) {
    throw new VerificationError(`Could not verify signature PCD`);
  }

  // Parse data from the Semaphore Signature claim. Will throw if the message
  // is not valid JSON.
  const payload: CredentialPayload = JSON.parse(pcd.claim.signedMessage);

  // The payload should have a timestamp, which should also be a number within
  // certain bounds.
  if (!validateCredentialTimestamp(payload.timestamp)) {
    throw new VerificationError("Credential timestamp out of bounds");
  }

  // If the payload contains a PCD, verify it
  if (payload.pcd) {
    // Only EmailPCD is supported here
    if (payload.pcd.type !== EmailPCDPackage.name) {
      throw new VerificationError(`Payload PCD is not an EmailPCD`);
    }

    // EmailPCD must verify
    const emailPCD = await EmailPCDPackage.deserialize(payload.pcd.pcd);
    if (!(await EmailPCDPackage.verify(emailPCD))) {
      throw new VerificationError(`Could not verify email PCD`);
    }

    // EmailPCD contains a Semaphore ID in its claim, which must match that of
    // the signature.
    if (emailPCD.claim.semaphoreId !== pcd.claim.identityCommitment) {
      throw new VerificationError(
        `Email PCD and Signature PCD do not have matching identities`
      );
    }

    // Everything passes, return the verified credential with email claims
    return {
      signatureClaim: pcd.claim,
      emailClaim: emailPCD.claim,
      emailSignatureClaim: emailPCD.proof.eddsaPCD.claim
    };
  } else {
    // Return a verified credential, without email claims since no EmailPCD
    // was present
    return { signatureClaim: pcd.claim };
  }
}
