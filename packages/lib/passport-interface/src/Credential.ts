import { getEdDSAPublicKey } from "@pcd/eddsa-pcd";
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

/*
 * The payload encoded in the message of the SemaphoreSignaturePCD passed
 * as a credential to feeds.
 */
export interface CredentialPayload {
  // The only type of PCD that can appear here is EmailPCD.
  pcd?: SerializedPCD<EmailPCD>;
  timestamp: number;
}

export interface VerifiedCredentialPayload {
  pcd: SemaphoreSignaturePCD;
  payload: CredentialPayload;
}

/**
 * Creates a feed credential payload with timestamp.
 */
export function createCredentialPayload(
  pcd?: SerializedPCD
): CredentialPayload {
  return {
    pcd: pcd,
    timestamp: Date.now()
  };
}

/**
 * Validates a credential timestamp.
 */
export function validateCredentialTimestamp(timestamp: number): boolean {
  const now = Date.now();
  return now - timestamp < TIMESTAMP_MAX_AGE;
}

type CredentialVerificationOptions =
  | {
      requireEmailPCD: false;
    }
  | {
      requireEmailPCD: true;
      eddsaPrivateKey: string;
    };

/**
 * Verifies that a credential has a valid Semaphore signature and a non-expired
 * timestamp.
 *
 * Optionally requires a verifiable Email PCD that shares a Semaphore identity
 * with the signature wrapper, and was signed by a given EdDSA private key.
 */
export async function verifyCredential(
  serializedPCD: SerializedPCD<SemaphoreSignaturePCD>,
  options: CredentialVerificationOptions
): Promise<VerifiedCredentialPayload> {
  if (serializedPCD.type !== SemaphoreSignaturePCDPackage.name) {
    throw new Error(`Credential is not a Semaphore Signature PCD`);
  }
  const pcd = await SemaphoreSignaturePCDPackage.deserialize(serializedPCD.pcd);
  if (!(await SemaphoreSignaturePCDPackage.verify(pcd))) {
    throw new Error(`Could not verify signature PCD`);
  }

  const payload: CredentialPayload = JSON.parse(pcd.claim.signedMessage);

  if (!validateCredentialTimestamp(payload.timestamp)) {
    throw new Error("Credential timestamp out of bounds");
  }

  if (options.requireEmailPCD) {
    if (!payload.pcd || payload.pcd.type !== EmailPCDPackage.name) {
      throw new Error(`Required Email PCD is missing`);
    }

    const emailPCD = await EmailPCDPackage.deserialize(payload.pcd.pcd);

    if (!(await EmailPCDPackage.verify(emailPCD))) {
      throw new Error(`Could not verify email PCD`);
    }

    if (emailPCD.claim.semaphoreId !== pcd.claim.identityCommitment) {
      throw new Error(
        `Email PCD and Signature PCD do not have matching identities`
      );
    }

    if (
      emailPCD.proof.eddsaPCD.claim.publicKey !==
      (await getEdDSAPublicKey(options.eddsaPrivateKey))
    ) {
      throw new Error(`Email PCD was not signed by expected private key`);
    }
  }

  return { pcd, payload };
}
