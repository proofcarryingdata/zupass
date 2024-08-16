import { getActiveSpan } from "@opentelemetry/api/build/src/trace/context-utils";
import {
  EdDSAPublicKey,
  getEdDSAPublicKey,
  isEqualEdDSAPublicKey
} from "@pcd/eddsa-pcd";
import { ObjPCDPackage, ObjPCDTypeName } from "@pcd/obj-pcd";
import {
  Credential,
  VerificationError,
  VerifiedCredential,
  verifyCredential
} from "@pcd/passport-interface";
import { LRUCache } from "lru-cache";
import { Pool } from "postgres-pool";
import { fetchUserByAuthKey } from "../../../database/queries/users";
import { PCDHTTPError } from "../../../routing/pcdHttpError";
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
    if (credential.type === ObjPCDTypeName) {
      return (async (): Promise<VerifiedCredential> => {
        if (!this.dbPool) {
          throw new Error(
            "missing database pool - can't authenticate authKey PCD"
          );
        }
        const pcd = await ObjPCDPackage.deserialize(credential.pcd);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const authKey = (pcd.proof.obj as any)["authKey"];
        if (!authKey) {
          throw new Error("auth key pcd missing authKey entry");
        }
        const user = await fetchUserByAuthKey(this.dbPool, authKey);
        if (!user) {
          throw new PCDHTTPError(401, `no user for auth key ${authKey} found`);
        }

        return {
          semaphoreId: user.commitment,
          emails: user.emails.map((e) => ({
            email: e,
            semaphoreId: user.commitment,
            signer: this.zupassPublicKey
          })),
          authKey
        };
      })();
    }

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
   * Performs normal verification, but also checks to ensure that the EmailPCD
   * exists, and that it was signed by Zupass. Returns a modified
   * {@link VerifiedCredential} type, indicating that `emailClaim` and
   * `emailSignatureClaim` cannot be undefined.
   */
  public async verifyAndExpectZupassEmail(
    credential: Credential
  ): Promise<VerifiedCredential> {
    const verifiedCredential = await this.verify(credential);

    if (!verifiedCredential.emails || verifiedCredential.emails.length === 0) {
      throw new VerificationError("Missing Email PCDs");
    }

    for (const signedEmail of verifiedCredential.emails) {
      const { email, semaphoreId, signer } = signedEmail;

      if (!email || !semaphoreId) {
        throw new VerificationError("Missing email PCD in credential");
      }
      if (!verifiedCredential.authKey && !this.isZupassPublicKey(signer)) {
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
