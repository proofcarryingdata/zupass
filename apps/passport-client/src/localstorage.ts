import {
  defaultOfflineTickets,
  FeedSubscriptionManager,
  NetworkFeedApi,
  OfflineDevconnectTicket,
  OfflineTickets,
  PodboxOfflineTicket,
  User
} from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
import { Identity } from "@semaphore-protocol/identity";
import { z } from "zod";
import { getPackages } from "./pcdPackages";
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
  window.localStorage[COLLECTION_KEY] = serialized;
}

/**
 * {@link self} argument used only to modify validation behavior.
 */
export async function loadPCDs(self?: User): Promise<PCDCollection> {
  const oldPCDs = window.localStorage[OLD_PCDS_KEY];
  if (oldPCDs) {
    const collection = new PCDCollection(await getPackages());
    await collection.deserializeAllAndAdd(JSON.parse(oldPCDs ?? "[]"));
    await savePCDs(collection);
    window.localStorage.removeItem(OLD_PCDS_KEY);
  }

  const serializedCollection = window.localStorage[COLLECTION_KEY];
  const collection = await PCDCollection.deserialize(
    await getPackages(),
    serializedCollection ?? "{}"
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
  window.localStorage["subscriptions"] = subscriptions.serialize();
}

export async function loadSubscriptions(): Promise<FeedSubscriptionManager> {
  return FeedSubscriptionManager.deserialize(
    new NetworkFeedApi(),
    window.localStorage["subscriptions"] ?? "{}"
  );
}

const OFFLINE_TICKETS_KEY = "offline_tickets";
export function saveOfflineTickets(
  offlineTickets: OfflineTickets | undefined
): void {
  if (!offlineTickets) {
    window.localStorage.removeItem(OFFLINE_TICKETS_KEY);
  } else {
    window.localStorage.setItem(
      OFFLINE_TICKETS_KEY,
      JSON.stringify(offlineTickets)
    );
  }
}
export function loadOfflineTickets(): OfflineTickets {
  let tickets = defaultOfflineTickets();

  try {
    tickets = JSON.parse(
      window.localStorage.getItem(OFFLINE_TICKETS_KEY) ??
        JSON.stringify(defaultOfflineTickets())
    );
  } catch (e) {
    //
  }

  return tickets;
}

const CHECKED_IN_OFFLINE_TICKETS_KEY = "checked_in_offline_devconnect_tickets";
export function saveCheckedInOfflineTickets(
  offlineTickets: OfflineDevconnectTicket[] | undefined
): void {
  if (!offlineTickets) {
    window.localStorage.removeItem(CHECKED_IN_OFFLINE_TICKETS_KEY);
  } else {
    window.localStorage.setItem(
      CHECKED_IN_OFFLINE_TICKETS_KEY,
      JSON.stringify(offlineTickets)
    );
  }
}
export function loadCheckedInOfflineDevconnectTickets(): OfflineDevconnectTicket[] {
  let tickets: OfflineDevconnectTicket[] = [];

  try {
    tickets = JSON.parse(
      window.localStorage.getItem(CHECKED_IN_OFFLINE_TICKETS_KEY) ?? "[]"
    );
  } catch (e) {
    //
    tickets = [];
  }

  return tickets;
}

const PODBOX_OFFLINE_TICKETS_KEY = "podbox_offline_tickets";
export function savePodboxOfflineTickets(
  offlineTickets: PodboxOfflineTicket[] | undefined
): void {
  if (!offlineTickets) {
    window.localStorage.removeItem(PODBOX_OFFLINE_TICKETS_KEY);
  } else {
    window.localStorage.setItem(
      PODBOX_OFFLINE_TICKETS_KEY,
      JSON.stringify(offlineTickets)
    );
  }
}
export function loadPodboxOfflineTickets(): PodboxOfflineTicket[] {
  let tickets = [];

  try {
    tickets = JSON.parse(
      window.localStorage.getItem(PODBOX_OFFLINE_TICKETS_KEY) ?? "[]"
    );
  } catch (e) {
    //
  }

  return tickets;
}

const CHECKED_IN_PODBOX_OFFLINE_TICKETS_KEY =
  "checked_in_offline_podbox_tickets";
export function saveCheckedInPodboxOfflineTickets(
  offlineTickets: PodboxOfflineTicket[] | undefined
): void {
  if (!offlineTickets) {
    window.localStorage.removeItem(CHECKED_IN_PODBOX_OFFLINE_TICKETS_KEY);
  } else {
    window.localStorage.setItem(
      CHECKED_IN_PODBOX_OFFLINE_TICKETS_KEY,
      JSON.stringify(offlineTickets)
    );
  }
}
export function loadCheckedInPodboxOfflineTickets(): PodboxOfflineTicket[] {
  let tickets: PodboxOfflineTicket[] = [];

  try {
    tickets = JSON.parse(
      window.localStorage.getItem(CHECKED_IN_PODBOX_OFFLINE_TICKETS_KEY) ?? "[]"
    );
  } catch (e) {
    //
    tickets = [];
  }

  return tickets;
}

export function saveEncryptionKey(key: string): void {
  window.localStorage["encryption_key"] = key;
}

export function loadEncryptionKey(): string | undefined {
  return window.localStorage["encryption_key"];
}

export function loadSelf(): User | undefined {
  const self = window.localStorage["self"];
  if (self && self !== "") {
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

export function savePersistentSyncStatus(status: PersistentSyncStatus): void {
  window.localStorage["sync_status"] = JSON.stringify(status);
}

export function loadPersistentSyncStatus(): PersistentSyncStatus {
  const statusString = window.localStorage["sync_status"];
  if (!statusString) {
    return {};
  }
  try {
    return PersistentSyncStatusSchema.parse(JSON.parse(statusString));
  } catch (e) {
    console.error(
      "Can't parse stored PersistentSyncStatus.  Resetting to default.",
      e
    );
    return {};
  }
}

export function saveUsingLaserScanner(usingLaserScanner: boolean): void {
  window.localStorage["using_laser_scanner"] = usingLaserScanner.toString();
}

export function loadUsingLaserScanner(): boolean {
  return window.localStorage["using_laser_scanner"] === "true";
}
