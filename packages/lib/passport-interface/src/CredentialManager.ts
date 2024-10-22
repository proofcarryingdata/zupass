import { EmailPCD, EmailPCDTypeName } from "@pcd/email-pcd";
import { PCDCollection } from "@pcd/pcd-collection";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import {
  IdentityV3,
  SemaphoreIdentityPCDPackage
} from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { ONE_HOUR_MS } from "@pcd/util";
import {
  Credential,
  CredentialPayload,
  createCredentialPayload
} from "./Credential";
import { CredentialRequest } from "./SubscriptionManager";
import { StorageBackedMap } from "./util/StorageBackedMap";

export interface CredentialManagerAPI {
  canGenerateCredential(req: CredentialRequest): boolean;
  requestCredential(req: CredentialRequest): Promise<SerializedPCD>;
}

export type CredentialCache = Map<string, CacheEntry>;

interface CacheEntry {
  timestamp: number;
  value: SerializedPCD;
  request: CredentialRequest;
  cacheId: string;
}

const CACHE_TTL = ONE_HOUR_MS;

/**
 * These constants are convenient values for credential requests.
 * PODBOX_CREDENTIAL_REQUEST requires an EmailPCD, since this is commonly
 * required for Podbox requests.
 * ZUPASS_CREDENTIAL_REQUEST does not, as Zupass can identify users by their
 * Semaphore ID alone.
 */
export const PODBOX_CREDENTIAL_REQUEST: CredentialRequest = {
  pcdType: "email-pcd",
  signatureType: "sempahore-signature-pcd"
};

export const ZUPASS_CREDENTIAL_REQUEST: CredentialRequest = {
  signatureType: "sempahore-signature-pcd"
};

// Creates an in-memory cache with a TTL of one hour.
// Use this where local storage is not available, e.g. in tests
export function createCredentialCache(): CredentialCache {
  return new Map();
}

// Creates an in-memory cache with a TTL of one hour, backed by localStorage
export function createStorageBackedCredentialCache(): CredentialCache {
  return new StorageBackedMap("credential-cache-multi-email-with-v4");
}

/**
 * Handles generation of credentials for feeds.
 */
export class CredentialManager implements CredentialManagerAPI {
  private readonly identityV3: IdentityV3;
  private readonly pcds: PCDCollection;
  private readonly cache: CredentialCache;
  private readonly credentialPromises: Map<
    CredentialRequest["pcdType"],
    { timestamp: number; credential: Promise<SerializedPCD>; cacheId: string }
  >;

  public constructor(
    identity: IdentityV3,
    pcds: PCDCollection,
    cache: CredentialCache
  ) {
    this.identityV3 = identity;
    this.pcds = pcds;
    this.cache = cache;
    this.credentialPromises = new Map();
  }

  // Can we get a credential containing a given PCD type?
  public canGenerateCredential(req: CredentialRequest): boolean {
    if (req.pcdType === "email-pcd") {
      return this.pcds.getPCDsByType(req.pcdType).length !== 0;
    } else if (req.pcdType === undefined) {
      return true;
    } else {
      // We can't generate credentials containing any other PCD type yet
      return false;
    }
  }

  // Get a credential from the local cache, if it exists
  private getCachedCredentials(
    type: string | undefined,
    cacheId: string
  ): SerializedPCD | undefined {
    const cacheKey = type ?? "none";
    const res = this.cache.get(cacheKey);
    if (res) {
      if (Date.now() - res.timestamp < CACHE_TTL && res.cacheId === cacheId) {
        return res.value;
      } else {
        this.cache.delete(cacheKey);
      }
    }
    return undefined;
  }

  private getCurrentCacheId(): string {
    return (this.pcds.getPCDsByType(EmailPCDTypeName) as EmailPCD[])
      .map((p) => p.claim.emailAddress)
      .join(":");
  }

  // Adds a credential to the cache
  private setCachedCredentials(
    request: CredentialRequest,
    value: SerializedPCD
  ): void {
    const cacheKey = request.pcdType ?? "none";
    const cacheId = this.getCurrentCacheId();

    this.cache.set(cacheKey, {
      value,
      timestamp: Date.now(),
      request,
      cacheId
    });

    // This can happen asynchronously, so don't await on the promise
    this.purgeExpiredCredentials();
  }

  // Purges expired items from the cache
  private async purgeExpiredCredentials(): Promise<void> {
    const keysToRemove: string[] = [];
    this.cache.forEach((v, k) => {
      if (Date.now() - v.timestamp >= CACHE_TTL) {
        keysToRemove.push(k);
      }
    });

    keysToRemove.forEach((key) => this.cache.delete(key));
  }

  /**
   * Returns a requested credential, either from the cache or by generating it.
   */
  public async requestCredential(
    req: CredentialRequest
  ): Promise<SerializedPCD> {
    const cachedCredential = this.getCachedCredentials(
      req.pcdType,
      this.getCurrentCacheId()
    );
    if (cachedCredential) {
      return cachedCredential;
    }

    const credentialPromise = this.credentialPromises.get(req.pcdType);
    if (
      credentialPromise &&
      credentialPromise.cacheId === this.getCurrentCacheId()
    ) {
      if (Date.now() - credentialPromise.timestamp < CACHE_TTL) {
        return credentialPromise.credential;
      } else {
        this.credentialPromises.delete(req.pcdType);
      }
    }

    const newPromise = this.generateCredential(req);
    newPromise.then((credential) => {
      this.setCachedCredentials(req, credential);
    });
    this.credentialPromises.set(req.pcdType, {
      credential: newPromise,
      timestamp: Date.now(),
      cacheId: this.getCurrentCacheId()
    });

    return newPromise;
  }

  /**
   * Generates the requested credential, if possible.
   * Takes a {@link CredentialRequest} and produces a serialized PCD which
   * consists of a signature PCD (e.g. a semaphore signature PCD) which wraps
   * a {@link FeedCredentialPayload}. This payload contains a timestamp, and
   * may contain a PCD if a) the feed requests one and b) CredentialManager
   * can find a matching PCD.
   */
  private async generateCredential(
    req: CredentialRequest
  ): Promise<SerializedPCD> {
    if (req.pcdType === "email-pcd") {
      const pcds = this.pcds.getPCDsByType(req.pcdType);
      if (pcds.length === 0) {
        throw new Error(
          `Could not find a PCD of type ${req.pcdType} for credential payload`
        );
      }

      const emailPCDs: SerializedPCD<EmailPCD>[] = await Promise.all(
        pcds.map((pcd) => this.pcds.serialize(pcd))
      );

      return this.semaphoreSignPayload(createCredentialPayload(emailPCDs));
    } else if (req.pcdType === undefined) {
      return this.semaphoreSignPayload(createCredentialPayload());
    } else {
      throw new Error(
        `Cannot issue credential containing a PCD of type ${req.pcdType}`
      );
    }
  }

  // Takes a payload and wraps it in a signature PCD.
  private async semaphoreSignPayload(
    payload: CredentialPayload
  ): Promise<Credential> {
    // In future we might support other types of signature here
    const signaturePCD = await SemaphoreSignaturePCDPackage.prove({
      identity: {
        argumentType: ArgumentTypeName.PCD,
        value: await SemaphoreIdentityPCDPackage.serialize(
          await SemaphoreIdentityPCDPackage.prove({
            identityV3: this.identityV3
          })
        )
      },
      signedMessage: {
        argumentType: ArgumentTypeName.String,
        value: JSON.stringify(payload)
      }
    });

    return await SemaphoreSignaturePCDPackage.serialize(signaturePCD);
  }
}
