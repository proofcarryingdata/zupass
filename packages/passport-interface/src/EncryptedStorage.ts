import { SerializedPCD } from "@pcd/pcd-types";
import { User } from "./zuzalu";

export interface SyncedEncryptedStorageV1 {
  self: User;
  pcds: SerializedPCD[];
}

export interface SyncedEncryptedStorageV2 {
  self: User;

  /**
   * Serialized {@link PCDCollection}.
   */
  pcds: string;
  _storage_version: "v2";
}

export interface SyncedEncryptedStorageV3 {
  // Copied from SyncedEncryptedStorageV2
  self: User;

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

export type SyncedEncryptedStorage =
  | SyncedEncryptedStorageV1
  | SyncedEncryptedStorageV2
  | SyncedEncryptedStorageV3;

export function isSyncedEncryptedStorageV2(
  storage: any
): storage is SyncedEncryptedStorageV2 {
  return storage._storage_version === "v2";
}

export function isSyncedEncryptedStorageV3(
  storage: any
): storage is SyncedEncryptedStorageV3 {
  return storage._storage_version === "v3";
}
