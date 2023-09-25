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

export async function loadEncryptionKey(): Promise<string | undefined> {
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

export function saveUserInvalid(userInvalid: boolean) {
  window.localStorage["participantInvalid"] = userInvalid;
}

export function saveUserHasNewPassword(userHasNewPassword: boolean) {
  window.localStorage["userHasNewPassword"] = userHasNewPassword;
}

export function loadUserInvalid(): boolean {
  return JSON.parse(window.localStorage["participantInvalid"] ?? "false");
}

export function loadUserHasNewPassword(): boolean {
  return JSON.parse(window.localStorage["userHasNewPassword"] ?? "false");
}
