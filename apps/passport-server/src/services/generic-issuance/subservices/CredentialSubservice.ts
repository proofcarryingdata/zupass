import { getActiveSpan } from "@opentelemetry/api/build/src/trace/context-utils";
import {
  EdDSAPublicKey,
  getEdDSAPublicKey,
  isEqualEdDSAPublicKey
} from "@pcd/eddsa-pcd";
import {
  Credential,
  VerificationError,
  VerifiedCredential,
  verifyCredential
} from "@pcd/passport-interface";
import { LRUCache } from "lru-cache";
import { Pool } from "postgres-pool";
import { loadEdDSAPrivateKey } from "../../issuanceService";

/**
 * Manages server-side verification of credential PCDs.
 *
 * Maintains a cache of verifications, similar to that used by
 * {@link IssuanceService}. This ensures that both concurrent and serial
 * verifications of the same credential will be resolved from a cache.
 */
export class CredentialSubservice {
  private verificationCache: LRUCache<string, Promise<VerifiedCredential>>;
  private zupassPublicKey: EdDSAPublicKey;
  private dbPool: Pool | undefined;

  public constructor(zupassPublicKey: EdDSAPublicKey, dbPool?: Pool) {
    this.verificationCache = new LRUCache({ max: 1000 });
    this.zupassPublicKey = zupassPublicKey;
    this.dbPool = dbPool;
  }

  public tryVerify(
    credential: Credential
  ): Promise<VerifiedCredential | undefined> {
    return this.verify(credential).catch(() => undefined);
  }

  /**
   * Verify a credential, ideally using a cached verification.
   */
  public verify(credential: Credential): Promise<VerifiedCredential> {
    const key = JSON.stringify(credential);
    const cached = this.verificationCache.get(key);
    const span = getActiveSpan();
    span?.setAttribute("credential_verification_cache_hit", !!cached);
    if (cached) {
      return cached;
    }
    const promise = verifyCredential(credential).catch((err) => {
      this.verificationCache.delete(key);
      throw err;
    });
    this.verificationCache.set(key, promise);
    return promise;
  }

  /**
   * Performs normal verification, but also checks to ensure any emails
   * included in the credential were signed by the Zupass EdDSA key.
   * {@link VerifiedCredential} type, indicating that `emailClaim` and
   * `emailSignatureClaim` cannot be undefined.
   */
  public async verifyAndExpectZupassEmail(
    credential: Credential | undefined,
    allowMissingEmail?: boolean
  ): Promise<VerifiedCredential> {
    if (!credential) {
      throw new VerificationError("Missing credential");
    }

    const verifiedCredential = await this.verify(credential);

    if (
      !allowMissingEmail &&
      (!verifiedCredential.emails || verifiedCredential.emails.length === 0)
    ) {
      throw new VerificationError("Missing email PCD in credential");
    }

    for (const signedEmail of verifiedCredential.emails ?? []) {
      const { email, semaphoreId, signer } = signedEmail;

      if (!email || !semaphoreId) {
        throw new VerificationError("Missing email PCD in credential");
      }
      if (!this.isZupassPublicKey(signer)) {
        throw new VerificationError("Email PCD not signed by Zupass");
      }
    }

    return { ...verifiedCredential, emails: verifiedCredential.emails };
  }

  /**
   * Utility function for checking if an EmailPCD was signed by Zupass.
   */
  private isZupassPublicKey(eddsaPubKey: EdDSAPublicKey | undefined): boolean {
    return (
      !!eddsaPubKey && isEqualEdDSAPublicKey(eddsaPubKey, this.zupassPublicKey)
    );
  }
}

export async function startCredentialSubservice(
  dbPool: Pool
): Promise<CredentialSubservice> {
  const zupassEddsaKey = loadEdDSAPrivateKey();

  if (!zupassEddsaKey) {
    throw new Error("Missing environment variable SERVER_EDDSA_PRIVATE_KEY");
  }

  const zupassPublicKey = await getEdDSAPublicKey(zupassEddsaKey);

  return new CredentialSubservice(zupassPublicKey, dbPool);
}
