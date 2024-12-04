import { getActiveSpan } from "@opentelemetry/api/build/src/trace/context-utils";
import { EdDSAPublicKey, isEqualEdDSAPublicKey } from "@pcd/eddsa-pcd";
import {
  Credential,
  VerificationError,
  VerifiedCredential,
  verifyCredential
} from "@pcd/passport-interface";
import { LRUCache } from "lru-cache";
import { Pool } from "postgres-pool";
import { loadZupassEdDSAPublicKey } from "../../issuanceService";
import { MultiProcessService } from "../../multiProcessService";
import { traced } from "../../telemetryService";

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
  private multiProcessService: MultiProcessService;

  public constructor(
    zupassPublicKey: EdDSAPublicKey,
    multiProcessService: MultiProcessService,
    dbPool?: Pool
  ) {
    this.verificationCache = new LRUCache({ max: 20000 });
    this.zupassPublicKey = zupassPublicKey;
    this.dbPool = dbPool;
    this.multiProcessService = multiProcessService;
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
    const promise = verifyCredential(
      credential,
      this.multiProcessService.verifySignaturePCD
    ).catch((err) => {
      this.verificationCache.delete(key);
      throw err;
    });
    this.verificationCache.set(key, promise);
    return promise;
  }

  /**
   * Performs normal verification, but also checks to ensure that the EmailPCD
   * exists, and that it was signed by Zupass. Returns a modified
   * {@link VerifiedCredential} type, indicating that `emailClaim` and
   * `emailSignatureClaim` cannot be undefined.
   */
  public async verifyAndExpectZupassEmail(
    credential: Credential
  ): Promise<VerifiedCredential> {
    return traced(
      "CredentialSubservice",
      "verifyAndExpectZupassEmail",
      async () => {
        const verifiedCredential = await this.verify(credential);

        if (
          !verifiedCredential.emails ||
          verifiedCredential.emails.length === 0
        ) {
          throw new VerificationError("Missing Email PCDs");
        }

        for (const signedEmail of verifiedCredential.emails) {
          const { email, semaphoreId, signer } = signedEmail;

          if (!email || !semaphoreId) {
            throw new VerificationError("Missing email PCD in credential");
          }
          if (!verifiedCredential.authKey && !this.isZupassPublicKey(signer)) {
            throw new VerificationError(
              `Email PCD not signed by Zupass. expected ${this.zupassPublicKey} but got ${signer}`
            );
          }
        }

        return { ...verifiedCredential, emails: verifiedCredential.emails };
      }
    );
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
  dbPool: Pool,
  multiProcessService: MultiProcessService
): Promise<CredentialSubservice> {
  const zupassEddsaPublicKey = await loadZupassEdDSAPublicKey();

  if (!zupassEddsaPublicKey) {
    throw new Error("Missing generic issuance zupass public key");
  }

  return new CredentialSubservice(
    zupassEddsaPublicKey,
    multiProcessService,
    dbPool
  );
}
