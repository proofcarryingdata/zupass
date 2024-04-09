import { EdDSAPublicKey, isEqualEdDSAPublicKey } from "@pcd/eddsa-pcd";
import {
  Credential,
  VerifiedCredential,
  verifyCredential
} from "@pcd/passport-interface";
import { LRUCache } from "lru-cache";
import { traced } from "../../telemetryService";

export const SERVICE_NAME = "CREDENTIAL_SUBSERVICE";

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

  public constructor(zupassPublicKey: EdDSAPublicKey) {
    this.verificationCache = new LRUCache({ max: 1000 });
    this.zupassPublicKey = zupassPublicKey;
  }

  /**
   * Verify a credential, ideally using a cached verification.
   */
  public verify(credential: Credential): Promise<VerifiedCredential> {
    return traced(SERVICE_NAME, "verify", async (span) => {
      const key = JSON.stringify(credential);
      const cached = this.verificationCache.get(key);
      span?.setAttribute("cache_hit", !!cached);
      if (cached) {
        return cached;
      }
      const promise = verifyCredential(credential).catch((err) => {
        this.verificationCache.delete(key);
        throw err;
      });
      this.verificationCache.set(key, promise);
      return promise;
    });
  }

  /**
   * Performs normal verification, but also checks to ensure that the EmailPCD
   * exists, and that it was signed by Zupass. Returns a modified
   * {@link VerifiedCredential} type, indicating that `emailClaim` and
   * `emailSignatureClaim` cannot be undefined.
   */
  public async verifyAndExpectZupassEmail(
    credential: Credential
  ): Promise<
    VerifiedCredential &
      Required<Pick<VerifiedCredential, "emailClaim" | "emailSignatureClaim">>
  > {
    const verifiedCredential = await this.verify(credential),
      { emailClaim, emailSignatureClaim } = verifiedCredential;

    if (!emailClaim || !emailSignatureClaim) {
      throw new Error("Missing email PCD in credential");
    }
    if (!this.isZupassPublicKey(emailSignatureClaim.publicKey)) {
      throw new Error("Email PCD not signed by Zupass");
    }

    return { emailClaim, emailSignatureClaim, ...verifiedCredential };
  }

  /**
   * Utility function for checking if an EmailPCD was signed by Zupass.
   */
  private isZupassPublicKey(eddsaPubKey: EdDSAPublicKey): boolean {
    return isEqualEdDSAPublicKey(eddsaPubKey, this.zupassPublicKey);
  }
}
