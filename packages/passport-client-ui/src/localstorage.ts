import { ZuParticipant } from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
import { Identity } from "@semaphore-protocol/identity";
import { config } from "./config";

import { getPackages } from "./pcdPackages";

export async function savePCDs(pcds: PCDCollection): Promise<void> {
  const serialized = await pcds.serializeAll();
  const stringified = JSON.stringify(serialized);
  config.localStorage.setStorageItem("pcds", stringified);
}

export async function loadPCDs() {
  const stringified = await config.localStorage.getStorageItem("pcds");
  const serialized = JSON.parse(stringified ?? "[]");

  return await PCDCollection.deserialize(await getPackages(), serialized);
}

export async function saveEncryptionKey(key: string): Promise<void> {
  return config.localStorage.setStorageItem("encryption_key", key);
}

export async function loadEncryptionKey(): Promise<string | undefined> {
  return config.localStorage.getStorageItem("encryption_key");
}

export async function loadSelf(): Promise<ZuParticipant | undefined> {
  const self = await config.localStorage.getStorageItem("self");
  if (self != null && self !== "") {
    return JSON.parse(self);
  }
}

export async function saveSelf(self: ZuParticipant): Promise<void> {
  return config.localStorage.setStorageItem("self", JSON.stringify(self));
}

export async function loadIdentity(): Promise<Identity | null> {
  const str = await config.localStorage.getStorageItem("identity");
  return str ? new Identity(str) : null;
}

export async function saveIdentity(identity: Identity): Promise<void> {
  return config.localStorage.setStorageItem("identity", identity.toString());
}

export async function saveParticipantInvalid(participantInvalid: boolean) {
  return config.localStorage.setStorageItem(
    "participantInvalid",
    participantInvalid + ""
  );
}

export async function loadParticipantInvalid(): Promise<boolean> {
  const participantInvalid = await config.localStorage.getStorageItem(
    "participantInvalid"
  );
  return JSON.parse(participantInvalid ?? "false");
}

export async function setSavedSyncKey(saved: boolean): Promise<void> {
  return config.localStorage.setStorageItem("savedSyncKey", saved + "");
}

export async function getSavedSyncKey(): Promise<boolean> {
  const savedSyncKey = await config.localStorage.getStorageItem("savedSyncKey");
  return JSON.parse(savedSyncKey ?? "false");
}

export async function setZuzaluQR(qr: any): Promise<void> {
  return config.localStorage.setStorageItem("savedSyncKey", JSON.stringify(qr));
}

export async function getZuzaluQR(): Promise<any> {
  const savedSyncKey = await config.localStorage.getStorageItem("zuzaluQR");
  return JSON.parse(savedSyncKey ?? "{}");
}
