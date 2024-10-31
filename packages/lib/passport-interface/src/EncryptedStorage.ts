import { getHash } from "@pcd/passport-crypto";
import {
  FallbackDeserializeFunction,
  PCDCollection
} from "@pcd/pcd-collection";
import { PCDPackage, SerializedPCD } from "@pcd/pcd-types";
import stringify from "fast-json-stable-stringify";
import { NetworkFeedApi } from "./FeedAPI";
import { FeedSubscriptionManager } from "./SubscriptionManager";
import { User } from "./zuzalu";

export interface SyncedEncryptedStorageV1 {
  self: {
    uuid: string;
    commitment: string;
    email: string;
    salt: string | null;
    terms_agreed: number;
  };
  pcds: SerializedPCD[];
}

export interface SyncedEncryptedStorageV2 {
  self: {
    uuid: string;
    commitment: string;
    email: string;
    salt: string | null;
    terms_agreed: number;
  };

  /**
   * Serialized {@link PCDCollection}.
   */
  pcds: string;
  _storage_version: "v2";
}

export interface SyncedEncryptedStorageV3 {
  // Copied from SyncedEncryptedStorageV2
  self: {
    uuid: string;
    commitment: string;
    email: string;
    salt: string | null;
    terms_agreed: number;
  };

  /**
   * Serialized {@link PCDCollection}.
   */
  pcds: string;

  /**
   * Serialized {@link FeedSubscriptionManager}
   */
  subscriptions: string;
  _storage_version: "v3";
}

export interface SyncedEncryptedStorageV4 {
  // Copied from SyncedEncryptedStorageV3
  // changed: emails is an array of emails, rather than a single email
  self: {
    uuid: string;
    commitment: string;
    emails: string[];
    salt: string | null;
    terms_agreed: number;
  };

  /**
   * Serialized {@link PCDCollection}.
   */
  pcds: string;

  /**
   * Serialized {@link FeedSubscriptionManager}
   */
  subscriptions: string;
  _storage_version: "v4";
}

export interface SyncedEncryptedStorageV5 {
  // Copied from SyncedEncryptedStorageV4
  // changed: added semaphore v4 identity
  self: {
    uuid: string;
    commitment: string;
    emails: string[];
    salt: string | null;
    terms_agreed: number;
    semaphore_v4_commitment?: string | null;
    semaphore_v4_pubkey?: string | null;
  };

  /**
   * Serialized {@link PCDCollection}.
   */
  pcds: string;

  /**
   * Serialized {@link FeedSubscriptionManager}
   */
  subscriptions: string;
  _storage_version: "v5";
}

export type SyncedEncryptedStorage =
  | SyncedEncryptedStorageV1
  | SyncedEncryptedStorageV2
  | SyncedEncryptedStorageV3
  | SyncedEncryptedStorageV4
  | SyncedEncryptedStorageV5;

export function isSyncedEncryptedStorageV1(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  storage: any
): storage is SyncedEncryptedStorageV1 {
  return storage._storage_version === undefined;
}

export function isSyncedEncryptedStorageV2(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  storage: any
): storage is SyncedEncryptedStorageV2 {
  return storage._storage_version === "v2";
}

export function isSyncedEncryptedStorageV3(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  storage: any
): storage is SyncedEncryptedStorageV3 {
  return storage._storage_version === "v3";
}

export function isSyncedEncryptedStorageV4(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  storage: any
): storage is SyncedEncryptedStorageV4 {
  return storage._storage_version === "v4";
}

export function isSyncedEncryptedStorageV5(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  storage: any
): storage is SyncedEncryptedStorageV5 {
  return storage._storage_version === "v5";
}

/**
 * Deserialize a decrypted storage object and set up the PCDCollection and
 * FeedSubscriptionManager to manage its data.  If the storage comes from
 * an older format which doesn't include subscriptions, then the
 * FeedSubscriptionManager will be empty.
 */
export async function deserializeStorage(
  storage: SyncedEncryptedStorage,
  pcdPackages: PCDPackage[],
  fallbackDeserializeFunction?: FallbackDeserializeFunction
): Promise<{
  pcds: PCDCollection;
  subscriptions: FeedSubscriptionManager;
  storageHash: string;
}> {
  let pcds: PCDCollection;
  let subscriptions: FeedSubscriptionManager;

  if (isSyncedEncryptedStorageV5(storage)) {
    pcds = await PCDCollection.deserialize(pcdPackages, storage.pcds, {
      fallbackDeserializeFunction
    });
    subscriptions = FeedSubscriptionManager.deserialize(
      new NetworkFeedApi(),
      storage.subscriptions
    );
  } else if (isSyncedEncryptedStorageV4(storage)) {
    pcds = await PCDCollection.deserialize(pcdPackages, storage.pcds, {
      fallbackDeserializeFunction
    });
    subscriptions = FeedSubscriptionManager.deserialize(
      new NetworkFeedApi(),
      storage.subscriptions
    );
  } else if (isSyncedEncryptedStorageV3(storage)) {
    pcds = await PCDCollection.deserialize(pcdPackages, storage.pcds, {
      fallbackDeserializeFunction
    });
    subscriptions = FeedSubscriptionManager.deserialize(
      new NetworkFeedApi(),
      storage.subscriptions
    );
  } else if (isSyncedEncryptedStorageV2(storage)) {
    pcds = await PCDCollection.deserialize(pcdPackages, storage.pcds, {
      fallbackDeserializeFunction
    });
    subscriptions = new FeedSubscriptionManager(new NetworkFeedApi());
  } else if (isSyncedEncryptedStorageV1(storage)) {
    pcds = new PCDCollection(pcdPackages);
    await pcds.deserializeAllAndAdd(storage.pcds, {
      fallbackDeserializeFunction
    });
    subscriptions = new FeedSubscriptionManager(new NetworkFeedApi());
  } else {
    throw new Error(
      `Unknown SyncedEncryptedStorage version 
      ${storage["_storage_version"]}`
    );
  }

  return {
    pcds,
    subscriptions,
    storageHash: await getStorageHash(storage)
  };
}

/**
 * Serializes a user's PCDs and relates state for storage.  The result is
 * unencrypted, and always uses the latest format.  The hash uniquely identifies
 * the content, as described in getStorageHash.
 */
export async function serializeStorage(
  user: User,
  pcds: PCDCollection,
  subscriptions: FeedSubscriptionManager
): Promise<{ serializedStorage: SyncedEncryptedStorage; storageHash: string }> {
  const serializedStorage: SyncedEncryptedStorage = {
    pcds: await pcds.serializeCollection(),
    self: user,
    subscriptions: subscriptions.serialize(),
    _storage_version: "v4"
  };
  return {
    serializedStorage: serializedStorage,
    storageHash: await getStorageHash(serializedStorage)
  };
}

/**
 * Calculates a hash to uniquely identify the given seralized storage.
 */
export async function getStorageHash(
  storage: SyncedEncryptedStorage
): Promise<string> {
  return await getHash(stringify(storage));
}
