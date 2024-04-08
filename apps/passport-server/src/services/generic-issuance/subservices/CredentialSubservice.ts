import { EdDSAPublicKey, isEqualEdDSAPublicKey } from "@pcd/eddsa-pcd";
import { EmailPCD } from "@pcd/email-pcd";
import {
  Credential,
  VerifiedCredentialPayload,
  verifyCredential
} from "@pcd/passport-interface";
import { LRUCache } from "lru-cache";

/**
 * Manages server-side verification of credential PCDs.
 */
export class CredentialSubservice {
  private verificationCache: LRUCache<
    string,
    Promise<VerifiedCredentialPayload>
  >;
  private zupassPublicKey: EdDSAPublicKey;

  public constructor(zupassPublicKey: EdDSAPublicKey) {
    this.verificationCache = new LRUCache({ max: 1000 });
    this.zupassPublicKey = zupassPublicKey;
  }

  public verify(credential: Credential): Promise<VerifiedCredentialPayload> {
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

  public isZupassEmailPCD(emailPCD: EmailPCD): boolean {
    return isEqualEdDSAPublicKey(
      emailPCD.proof.eddsaPCD.claim.publicKey,
      this.zupassPublicKey
    );
  }
}
