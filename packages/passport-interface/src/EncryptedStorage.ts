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

export type SyncedEncryptedStorage =
  | SyncedEncryptedStorageV1
  | SyncedEncryptedStorageV2;

export function isSyncedEncryptedStorageV2(
  storage: any
): storage is SyncedEncryptedStorageV2 {
  return storage._storage_version === "v2";
}
