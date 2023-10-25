import { FeedSubscriptionManager, User } from "@pcd/passport-interface";
import { NetworkFeedApi } from "@pcd/passport-interface/src/FeedAPI";
import { PCDCollection } from "@pcd/pcd-collection";
import { Identity } from "@semaphore-protocol/identity";
import { getPackages } from "./pcdPackages";

const OLD_PCDS_KEY = "pcds"; // deprecated
const COLLECTION_KEY = "pcd_collection";

export async function savePCDs(pcds: PCDCollection): Promise<void> {
  const serialized = await pcds.serializeCollection();
  window.localStorage[COLLECTION_KEY] = serialized;
}

export async function loadPCDs(): Promise<PCDCollection> {
  const oldPCDs = window.localStorage[OLD_PCDS_KEY];
  if (oldPCDs) {
    const collection = new PCDCollection(await getPackages());
    await collection.deserializeAllAndAdd(JSON.parse(oldPCDs ?? "[]"));
    await savePCDs(collection);
    window.localStorage.removeItem(OLD_PCDS_KEY);
  }

  const serializedCollection = window.localStorage[COLLECTION_KEY];
  return await PCDCollection.deserialize(
    await getPackages(),
    serializedCollection ?? "{}"
  );
}

export async function saveSubscriptions(
  subscriptions: FeedSubscriptionManager
): Promise<void> {
  window.localStorage["subscriptions"] = subscriptions.serialize();
}

export async function loadSubscriptions(): Promise<FeedSubscriptionManager> {
  return FeedSubscriptionManager.deserialize(
    new NetworkFeedApi(),
    window.localStorage["subscriptions"] ?? "{}"
  );
}

export function saveEncryptionKey(key: string): void {
  window.localStorage["encryption_key"] = key;
}

export function loadEncryptionKey(): string | undefined {
  return window.localStorage["encryption_key"];
}

export function loadSelf(): User | undefined {
  const self = window.localStorage["self"];
  if (self != null && self !== "") {
    return JSON.parse(self);
  }
}

export function saveSelf(self: User): void {
  window.localStorage["self"] = JSON.stringify(self);
}

export function loadIdentity(): Identity | null {
  const str = window.localStorage["identity"];
  return str ? new Identity(str) : null;
}

export function saveIdentity(identity: Identity): void {
  window.localStorage["identity"] = identity.toString();
}

export function loadPrivacyNoticeAgreed(): number | null {
  const stored = window.localStorage["privacy_notice_agreed"];
  return stored ? parseInt(stored) : null;
}

export function savePrivacyNoticeAgreed(version: number): void {
  window.localStorage["privacy_notice_agreed"] = version.toString();
}

/**
 * Holds the persistent status of the state-machine for E2EE storage.
 * This should be kept up-to-date with the other storage-related fields
 * such as encryption key, PCDs, and subscription feeds.  This object is
 * intended to leave room for more fields to be added later, which can be
 * loaded/stored atomically.
 */
export interface PersistentSyncStatus {
  /**
   * Represents the most recent revision returned by the server when
   * downloading E2EE storage.  Should change once that download has been
   * integrated and saved into local storage.  Can be used to detect changes
   * on future download, and conflicts on future upload.
   */
  serverStorageRevision?: string;
}

export function savePersistentSyncStatus(status: PersistentSyncStatus): void {
  window.localStorage["sync_status"] = JSON.stringify(status);
}

export function loadPersistentSyncStatus(): PersistentSyncStatus {
  const statusString = window.localStorage["sync_status"];
  try {
    return JSON.parse(statusString);
  } catch (e) {
    console.error("Local storage PersistentSyncStatus is malformed.", e);
    return {};
  }
}
