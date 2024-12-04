import { EdDSAPublicKey } from "@pcd/eddsa-pcd";
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

// To avoid writing `SerializedPCD<SemaphoreSignaturePCD>`, and also to make
// the `Credential` type a bit less tightly-bound to the implementation details
// of serialization and Semaphore signatures, we use this type.
export type Credential = SerializedPCD<SemaphoreSignaturePCD>;

/*
 * The payload encoded in the message of the SemaphoreSignaturePCD passed
 * as a credential to feeds.
 */
export interface CredentialPayload {
  // The only type of PCD that can appear here is EmailPCD.
  pcd?: SerializedPCD<EmailPCD>;
  // Caller can optionally supply multiple emails. in the case
  // just one email is supplied via the `pcd` field, the request
  // representation is upgraded to a list stored in this `pcds`
  // field
  pcds?: SerializedPCD<EmailPCD>[];
  timestamp: number;
}

/**
 * The result of successfully verifying a credential, as determined by
 * verifyCredential() below. To be verified, the credential must be wrapped in
 * a verifiable signature PCD, and must contain a payload that includes a
 * timestamp and an optional additional PCD (currently only EmailPCD is
 * supported for this purpose). The timestamp must be within certain bounds,
 * and the embedded PCD must be tied to the same identity that signed the
 * wrapper PCD.
 *
 * If the credential is verified, then this data is extracted from the claims
 * contained within it, and can be implicitly trusted without need for further
 * verification.
 *
 * We do not need to return whole PCDs here, because the proofs have been
 * verified, and since we expect to cache these in memory, we can avoid wasting
 * memory on caching large PCD objects.
 */
export interface VerifiedCredential {
  emails?: SignedEmail[];
  semaphoreId: string;
  semaphoreV4Id?: string;
  authKey?: string;
}

export interface SignedEmail {
  signer: EdDSAPublicKey;
  email: string;
  semaphoreId: string;
  semaphoreV4Id?: string;
}

/**
 * Creates a feed credential payload with timestamp.
 */
export function createCredentialPayload(
  pcds:
    | SerializedPCD<EmailPCD>
    | SerializedPCD<EmailPCD>[]
    | undefined = undefined
): CredentialPayload {
  return {
    pcds:
      pcds instanceof Array ? pcds : pcds !== undefined ? [pcds] : undefined,
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
 * This function only proves that the credential is formally valid. It does
 * *not* check if the EmailPCD was signed by Zupass. In both IssuanceService
 * and in CredentialSubservice (part of Podbox), this additional check is
 * performed, because those servies have higher context on what might be a
 * valid signing key (e.g. one specified in an environment variable, which
 * application code has access to but library code such as this does not).
 */
export async function verifyCredential(
  credential: Credential,
  verifySignature?: (
    signature: SerializedPCD<SemaphoreSignaturePCD>
  ) => Promise<boolean>
): Promise<VerifiedCredential> {
  if (credential.type !== SemaphoreSignaturePCDPackage.name) {
    throw new VerificationError(`Credential is not a Semaphore Signature PCD`);
  }

  const pcd = await SemaphoreSignaturePCDPackage.deserialize(credential.pcd);

  // Ensure that the signature part of the credential verifies.
  if (verifySignature) {
    if (!(await verifySignature(credential))) {
      throw new VerificationError(`Could not verify signature PCD`);
    }
  } else {
    if (!(await SemaphoreSignaturePCDPackage.verify(pcd))) {
      throw new VerificationError(`Could not verify signature PCD`);
    }
  }

  // Parse data from the Semaphore Signature claim. Will throw if the message
  // is not valid JSON.
  const payload: CredentialPayload = JSON.parse(pcd.claim.signedMessage);

  // The payload should have a timestamp, which should also be a number within
  // certain bounds.
  if (!validateCredentialTimestamp(payload.timestamp)) {
    throw new VerificationError("Credential timestamp out of bounds");
  }

  const emailPCDs = (payload.pcd ? [payload.pcd] : payload.pcds) ?? [];

  // If the payload contains a PCD, verify it
  if (emailPCDs) {
    // Only EmailPCD is supported here
    if (emailPCDs.find((e) => e.type !== EmailPCDPackage.name)) {
      throw new VerificationError(`all pcds in the payload must be email PCDs`);
    }

    const signedEmails: SignedEmail[] = await Promise.all(
      emailPCDs.map(async (e) => {
        // EmailPCD must verify
        const emailPCD = await EmailPCDPackage.deserialize(e.pcd);
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

        return {
          email: emailPCD.claim.emailAddress,
          signer: emailPCD.proof.eddsaPCD.claim.publicKey,
          semaphoreId: emailPCD.claim.semaphoreId,
          semaphoreV4Id: emailPCD.claim.semaphoreV4Id
        } satisfies SignedEmail;
      })
    );

    // a bit hacky
    const semaphoreV4Id = signedEmails.find((e) => e.semaphoreV4Id)
      ?.semaphoreV4Id;

    // Everything passes, return the verified credential with email claims
    return {
      emails: signedEmails,
      semaphoreId: pcd.claim.identityCommitment,
      semaphoreV4Id
    };
  } else {
    // Return a verified credential, without email claims since no EmailPCD
    // was present
    return { semaphoreId: pcd.claim.identityCommitment };
  }
}
