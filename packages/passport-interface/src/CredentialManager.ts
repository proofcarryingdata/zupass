import { PCDCollection } from "@pcd/pcd-collection";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { MemoryCache } from "cache-manager";
import {
  FeedCredentialPayload,
  createFeedCredentialPayload
} from "./FeedCredential";
import { CredentialRequest } from "./SubscriptionManager";

export interface CredentialManagerAPI {
  canGenerateCredential(req: CredentialRequest): boolean;
  requestCredential(req: CredentialRequest): Promise<SerializedPCD>;
}

/**
 * Handles generation of credentials for feeds.
 */
export class CredentialManager implements CredentialManagerAPI {
  private readonly identity: Identity;
  private readonly pcds: PCDCollection;
  private readonly cache: MemoryCache;

  public constructor(identity: Identity, pcds: PCDCollection, cache: MemoryCache) {
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

  // Get a credential from the local cache, if it exists
  private async getCachedCredential(type?: string): Promise<SerializedPCD | undefined> {
    const cacheKey = type ?? "none";
    return await this.cache.get<SerializedPCD>(cacheKey);
  }

  private setCachedCredential(
    type: string | undefined,
    value: SerializedPCD
  ): void {
    const cacheKey = type ?? "none";
    this.cache.set(cacheKey, value);
  }

  /**
   * Generates the requested credential, if possible.
   * Takes a {@link CredentialRequest} and produces a serialized PCD which
   * consists of a signature PCD (e.g. a semaphore signature PCD) which wraps
   * a {@link FeedCredentialPayload}. This payload contains a timestamp, and
   * may contain a PCD if a) the feed requests one and b) CredentialManager
   * can find a matching PCD.
   */
  public async requestCredential(
    req: CredentialRequest
  ): Promise<SerializedPCD> {
    const cachedCredential = await this.getCachedCredential(req.pcdType);
    if (cachedCredential) {
      return cachedCredential;
    }

    // This is currently the only supported PCD for credential embedding
    if (req.pcdType === "email-pcd") {
      const cachedCredential = await this.getCachedCredential(req.pcdType);
      if (cachedCredential) {
        return cachedCredential;
      }

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
      const result = await this.signPayload(
        createFeedCredentialPayload(serializedPCD)
      );
      this.setCachedCredential(req.pcdType, result);
      return result;
    } else if (req.pcdType === undefined) {
      const result = await this.signPayload(createFeedCredentialPayload());
      this.setCachedCredential(req.pcdType, result);
      return result;
    } else {
      throw new Error(
        `Cannot issue credential containing a PCD of type ${req.pcdType}`
      );
    }
  }

  // Takes a payload and wraps it in a signature PCD.
  private async signPayload(
    payload: FeedCredentialPayload
  ): Promise<SerializedPCD> {
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
