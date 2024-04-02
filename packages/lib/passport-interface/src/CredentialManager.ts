import { PCDCollection } from "@pcd/pcd-collection";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import {
  SemaphoreSignaturePCD,
  SemaphoreSignaturePCDPackage
} from "@pcd/semaphore-signature-pcd";
import { ONE_HOUR_MS } from "@pcd/util";
import { Identity } from "@semaphore-protocol/identity";
import { CredentialPayload, createCredentialPayload } from "./Credential";
import { CredentialRequest } from "./SubscriptionManager";
import { StorageBackedMap } from "./util/StorageBackedMap";

export interface CredentialManagerAPI {
  canGenerateCredential(req: CredentialRequest): boolean;
  requestCredential(req: CredentialRequest): Promise<SerializedPCD>;
  prepareCredentials(reqs: CredentialRequest[]): Promise<void>;
}

export type CredentialCache = Map<string, CacheEntry>;

interface CacheEntry {
  timestamp: number;
  value: SerializedPCD;
  request: CredentialRequest;
}

const CACHE_TTL = ONE_HOUR_MS;

// Creates an in-memory cache with a TTL of one hour.
// Use this where local storage is not available, e.g. in tests
export function createCredentialCache(): CredentialCache {
  return new Map();
}

// Creates an in-memory cache with a TTL of one hour, backed by localStorage
export function createStorageBackedCredentialCache(): CredentialCache {
  return new StorageBackedMap("credential-cache");
}

/**
 * Handles generation of credentials for feeds.
 */
export class CredentialManager implements CredentialManagerAPI {
  private readonly identity: Identity;
  private readonly pcds: PCDCollection;
  private readonly cache: CredentialCache;

  public constructor(
    identity: Identity,
    pcds: PCDCollection,
    cache: CredentialCache
  ) {
    this.identity = identity;
    this.pcds = pcds;
    this.cache = cache;
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

  /**
   * Before doing a parallel fetching of subscriptions, it can be helpful to
   * prepare the credentials to avoid race conditions.
   */
  public async prepareCredentials(reqs: CredentialRequest[]): Promise<void> {
    for (const req of reqs) {
      if (!this.getCachedCredential(req.pcdType)) {
        try {
          this.setCachedCredential(req, await this.generateCredential(req));
        } catch (e) {
          // It can be possible for credential generation to fail if the user
          // does not have the right kind of PCD. Because we are only
          // pre-generating credentials here, we don't need to take any action
          // if a single credential fails to generate.
        }
      }
    }
  }

  // Get a credential from the local cache, if it exists
  private getCachedCredential(type?: string): SerializedPCD | undefined {
    const cacheKey = type ?? "none";
    const res = this.cache.get(cacheKey);
    if (res) {
      if (Date.now() - res.timestamp < CACHE_TTL) {
        return res.value;
      } else {
        this.cache.delete(cacheKey);
      }
    }
    return undefined;
  }

  // Adds a credential to the cache
  private setCachedCredential(
    request: CredentialRequest,
    value: SerializedPCD
  ): void {
    const cacheKey = request.pcdType ?? "none";
    this.cache.set(cacheKey, { value, timestamp: Date.now(), request });
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
    const cachedCredential = this.getCachedCredential(req.pcdType);
    if (cachedCredential) {
      return cachedCredential;
    }

    const credential = await this.generateCredential(req);
    this.setCachedCredential(req, credential);

    return credential;
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
      // In future we might want to support multiple email PCDs, but this
      // works for now
      const pcd = pcds[0];
      const serializedPCD = await this.pcds.serialize(pcd);
      return this.semaphoreSignPayload(createCredentialPayload(serializedPCD));
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
  ): Promise<SerializedPCD<SemaphoreSignaturePCD>> {
    // In future we might support other types of signature here
    const signaturePCD = await SemaphoreSignaturePCDPackage.prove({
      identity: {
        argumentType: ArgumentTypeName.PCD,
        value: await SemaphoreIdentityPCDPackage.serialize(
          await SemaphoreIdentityPCDPackage.prove({
            identity: this.identity
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
