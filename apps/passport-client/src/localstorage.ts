import {
  FeedSubscriptionManager,
  NetworkFeedApi,
  User
} from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
import { Identity } from "@semaphore-protocol/identity";
import * as localForage from "localforage";
import { z } from "zod";
import { fallbackDeserializeFunction, getPackages } from "./pcdPackages";
import { validateAndLogRunningAppState } from "./validateState";

const OLD_PCDS_KEY = "pcds"; // deprecated
const COLLECTION_KEY = "pcd_collection";

export async function savePCDs(pcds: PCDCollection): Promise<void> {
  if (
    !validateAndLogRunningAppState("savePCDs", undefined, undefined, pcds, true)
  ) {
    console.error(
      "PCD Collection failed to validate - not writing it to localstorage"
    );
    return;
  }

  const serialized = await pcds.serializeCollection();
  await localForage.setItem(COLLECTION_KEY, serialized);
}

/**
 * {@link self} argument used only to modify validation behavior.
 */
export async function loadPCDs(self?: User): Promise<PCDCollection> {
  const oldPCDs = await localForage.getItem<string>(OLD_PCDS_KEY);
  if (oldPCDs) {
    const collection = new PCDCollection(await getPackages());
    await collection.deserializeAllAndAdd(JSON.parse(oldPCDs) ?? []);
    await savePCDs(collection);
    await localForage.removeItem(OLD_PCDS_KEY);
  }

  const serializedCollection =
    await localForage.getItem<string>(COLLECTION_KEY);
  const collection = await PCDCollection.deserialize(
    await getPackages(),
    serializedCollection ?? "{}",
    { fallbackDeserializeFunction }
  );

  if (
    !validateAndLogRunningAppState(
      "loadPCDs",
      undefined,
      undefined,
      collection,
      self !== undefined
    )
  ) {
    console.error(
      "PCD Collection failed to validate when loading from localstorage"
    );
  }

  return collection;
}

export async function saveSubscriptions(
  subscriptions: FeedSubscriptionManager
): Promise<void> {
  await localForage.setItem("subscriptions", subscriptions.serialize());
}

export async function loadSubscriptions(): Promise<FeedSubscriptionManager> {
  const data = await localForage.getItem<string>("subscriptions");
  return FeedSubscriptionManager.deserialize(
    new NetworkFeedApi(),
    data ?? "{}"
  );
}

export async function saveEncryptionKey(key: string): Promise<void> {
  await localForage.setItem("encryption_key", key);
}

export async function loadEncryptionKey(): Promise<string | undefined> {
  const key = await localForage.getItem<string>("encryption_key");
  return key ?? undefined;
}

export async function loadSelf(): Promise<User | undefined> {
  const self = await localForage.getItem<string>("self");
  if (self && self !== "") {
    const parsedSelf = JSON.parse(self);

    // this upgrades the storage representation of an account that
    // existed prior to the introduction of multi-email support so
    // that it is compatible with the latest data model

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const singleEmail = (parsedSelf as any)?.email as string | undefined;
    if (singleEmail && parsedSelf) {
      parsedSelf.emails = [singleEmail];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (parsedSelf as any).email;
    }

    return parsedSelf;
  }
  return undefined;
}

export async function saveSelf(self: User): Promise<void> {
  await localForage.setItem("self", JSON.stringify(self));
}

export async function loadIdentity(): Promise<Identity | null> {
  const str = await localForage.getItem<string>("identity");
  return str ? new Identity(str) : null;
}

export async function saveIdentity(identity: Identity): Promise<void> {
  await localForage.setItem("identity", identity.toString());
}

export async function loadPrivacyNoticeAgreed(): Promise<number | null> {
  const stored = await localForage.getItem<string>("privacy_notice_agreed");
  return stored ? parseInt(stored) : null;
}

export async function savePrivacyNoticeAgreed(version: number): Promise<void> {
  await localForage.setItem("privacy_notice_agreed", version.toString());
}

/**
 * Zod Schema for parsing the type PersistentSyncStatus type.
 *
 * This object holds the persistent status of the state-machine for E2EE
 * storage.  This should be kept up-to-date with the other storage-related
 * fields such as encryption key, PCDs, and subscription feeds.  This object is
 * intended to leave room for more fields to be added later, which can be
 * loaded/stored atomically.
 */
const PersistentSyncStatusSchema = z.object({
  /**
   * Represents the most recent revision returned by the server when
   * downloading or uploading E2EE storage.  Should change in local storage
   * after upload is complete, or once that download has been integrated and
   * saved into local storage.  Can be used to allow the server to detect
   * changes on future download, and conflicts on future upload.
   */
  serverStorageRevision: z.string().optional(),

  /**
   * The client-calculated hash of the most recent storage uploaded to or
   * downloaded from the server.  Should always correspond to the same contents
   * as serverStorage Revision.  Can be used by the client to know whether
   * its local state has changed since it was last in sync with the server.
   */
  serverStorageHash: z.string().optional()
});
export type PersistentSyncStatus = z.infer<typeof PersistentSyncStatusSchema>;

export async function savePersistentSyncStatus(
  status: PersistentSyncStatus
): Promise<void> {
  await localForage.setItem("sync_status", JSON.stringify(status));
}

export async function loadPersistentSyncStatus(): Promise<PersistentSyncStatus> {
  const statusString = await localForage.getItem<string>("sync_status");
  if (!statusString) {
    return {};
  }
  try {
    return PersistentSyncStatusSchema.parse(JSON.parse(statusString));
  } catch (e) {
    console.error(
      "Can't parse stored PersistentSyncStatus. Resetting to default.",
      e
    );
    return {};
  }
}

export async function saveUsingLaserScanner(
  usingLaserScanner: boolean
): Promise<void> {
  await localForage.setItem(
    "using_laser_scanner",
    usingLaserScanner.toString()
  );
}

export async function loadUsingLaserScanner(): Promise<boolean> {
  const value = await localForage.getItem<string>("using_laser_scanner");
  return value === "true";
}

async function cleanUpDeprecatedStorage(): Promise<void> {
  try {
    await localForage.removeItem("offline_tickets");
    await localForage.removeItem("checked_in_offline_devconnect_tickets");
    await localForage.removeItem("credential-cache-multi");
    await localForage.removeItem("credential-cache-multi-email");
  } catch (e) {
    console.error("Error cleaning up deprecated storage", e);
  }
}

cleanUpDeprecatedStorage();
