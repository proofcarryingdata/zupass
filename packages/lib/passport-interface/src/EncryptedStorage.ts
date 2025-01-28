import { getHash } from "@pcd/passport-crypto";
import {
  FallbackDeserializeFunction,
  PCDCollection
} from "@pcd/pcd-collection";
import { PCDPackage, SerializedPCD } from "@pcd/pcd-types";
import * as base64 from "base64-js";
import stringify from "fast-json-stable-stringify";
import pako from "pako";
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

export interface SyncedEncryptedStorageV6 {
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
   * Serialized {@link FeedSubscriptionManager}
   */
  subscriptions: string;

  /**
   * Serialized {@link PCDCollection}, gzipped if compressedPCDs is true.
   */
  pcds: string;
  compressedPCDs: boolean;
  _storage_version: "v6";
}

export type SyncedEncryptedStorage =
  | SyncedEncryptedStorageV1
  | SyncedEncryptedStorageV2
  | SyncedEncryptedStorageV3
  | SyncedEncryptedStorageV4
  | SyncedEncryptedStorageV5
  | SyncedEncryptedStorageV6;

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

export function isSyncedEncryptedStorageV6(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  storage: any
): storage is SyncedEncryptedStorageV6 {
  return storage._storage_version === "v6";
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

  if (isSyncedEncryptedStorageV6(storage)) {
    const serializedPCDs = storage.compressedPCDs
      ? decompressStringFromBase64(storage.pcds)
      : storage.pcds;
    pcds = await PCDCollection.deserialize(pcdPackages, serializedPCDs, {
      fallbackDeserializeFunction
    });
    subscriptions = FeedSubscriptionManager.deserialize(
      new NetworkFeedApi(),
      storage.subscriptions
    );
  } else if (isSyncedEncryptedStorageV5(storage)) {
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
 * Options for serializing storage.
 */
interface SerializationOptions {
  /**
   * The number of bytes above which PCDs will be compressed.
   */
  pcdCompressionThresholdBytes: number;
}

/**
 * Serializes a user's PCDs and relates state for storage.  The result is
 * unencrypted, and always uses the latest format.  The hash uniquely identifies
 * the content, as described in getStorageHash.
 *
 * Sets a default compression threshold of 500,000 bytes. Callers may override
 * with a different value. The `compressedPCDs` flag in {@link SyncedEncryptedStorageV6}
 * will enable {@link deserializeStorage} to process either compressed or uncompressed
 * PCDs.
 */
export async function serializeStorage(
  user: User,
  pcds: PCDCollection,
  subscriptions: FeedSubscriptionManager,
  options: SerializationOptions = { pcdCompressionThresholdBytes: 500_000 }
): Promise<{ serializedStorage: SyncedEncryptedStorage; storageHash: string }> {
  const serializedPCDs = await pcds.serializeCollection();
  const shouldCompress =
    new Blob([serializedPCDs]).size >= options.pcdCompressionThresholdBytes;

  const serializedStorage: SyncedEncryptedStorage = {
    pcds: shouldCompress
      ? compressStringAndEncodeAsBase64(serializedPCDs)
      : serializedPCDs,
    subscriptions: subscriptions.serialize(),
    compressedPCDs: shouldCompress,
    self: user,
    _storage_version: "v6"
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

/**
 * Compresses a string and encodes it as a base64 string.
 * @param str the string to compress
 * @returns the compressed string encoded as a base64 string
 */
export function compressStringAndEncodeAsBase64(str: string): string {
  return base64.fromByteArray(pako.deflate(str));
}

/**
 * Decompresses a base64 string and decodes it as a string.
 * @param base64Str the base64 string to decompress
 * @returns the decompressed string
 */
export function decompressStringFromBase64(base64Str: string): string {
  return new TextDecoder().decode(pako.inflate(base64.toByteArray(base64Str)));
}
