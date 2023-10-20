import {
  defaultOfflineTickets,
  FeedSubscriptionManager,
  OfflineTickets,
  User
} from "@pcd/passport-interface";
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

const OFFLINE_TICKETS_KEY = "offline_tickets";
export function saveOfflineTickets(offlineTickets: OfflineTickets | undefined) {
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
  try {
    const offlineTickets = JSON.parse(
      window.localStorage.getItem(OFFLINE_TICKETS_KEY)
    );
    return offlineTickets ?? defaultOfflineTickets();
  } catch (e) {
    return {
      devconnectTickets: [],
      zuconnectTickets: []
    };
  }
}

const CHECKED_IN_OFFLINE_TICKETS_KEY = "checked_in_offline_tickets";
export function saveCheckedInOfflineTickets(
  offlineTickets: OfflineTickets | undefined
) {
  if (!offlineTickets) {
    window.localStorage.removeItem(CHECKED_IN_OFFLINE_TICKETS_KEY);
  } else {
    window.localStorage.setItem(
      CHECKED_IN_OFFLINE_TICKETS_KEY,
      JSON.stringify(offlineTickets)
    );
  }
}
export function loadCheckedInOfflineTickets(): OfflineTickets | undefined {
  try {
    return (
      JSON.parse(window.localStorage.getItem(CHECKED_IN_OFFLINE_TICKETS_KEY)) ??
      defaultOfflineTickets()
    );
  } catch (e) {
    return {
      devconnectTickets: [],
      zuconnectTickets: []
    };
  }
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
