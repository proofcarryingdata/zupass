import { EdDSAPublicKey, isEqualEdDSAPublicKey } from "@pcd/eddsa-pcd";
import { EmailPCDClaim } from "@pcd/email-pcd";
import {
  Credential,
  VerifiedCredential,
  verifyCredential
} from "@pcd/passport-interface";
import { LRUCache } from "lru-cache";

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
    const key = JSON.stringify(credential);
    const cached = this.verificationCache.get(key);
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

  public async getZupassEmailClaimFromCredential(
    credential: Credential
  ): Promise<EmailPCDClaim> {
    const { emailClaim, emailSignatureClaim } = await this.verify(credential);

    if (!emailClaim || !emailSignatureClaim) {
      throw new Error("Missing email PCD in credential");
    }
    if (!this.isZupassPublicKey(emailSignatureClaim.publicKey)) {
      throw new Error("Email PCD not signed by Zupass");
    }

    return emailClaim;
  }

  /**
   * Utility function for checking if an EmailPCD was signed by Zupass.
   */
  private isZupassPublicKey(eddsaPubKey: EdDSAPublicKey): boolean {
    return isEqualEdDSAPublicKey(eddsaPubKey, this.zupassPublicKey);
  }
}
