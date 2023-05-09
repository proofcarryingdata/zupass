import { ZuParticipant } from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
import { Identity } from "@semaphore-protocol/identity";
import { config } from "./config";

import { getPackages } from "./pcdPackages";

export async function savePCDs(pcds: PCDCollection): Promise<void> {
  const serialized = await pcds.serializeAll();
  const stringified = JSON.stringify(serialized);
  config.hardware.setStorageItem("pcds", stringified);
}

export async function loadPCDs() {
  const stringified = await config.hardware.getStorageItem("pcds");
  const serialized = JSON.parse(stringified ?? "[]");

  return await PCDCollection.deserialize(await getPackages(), serialized);
}

export async function saveEncryptionKey(key: string): Promise<void> {
  return config.hardware.setStorageItem("encryption_key", key);
}

export async function loadEncryptionKey(): Promise<string | undefined> {
  return config.hardware.getStorageItem("encryption_key");
}

export async function loadSelf(): Promise<ZuParticipant | undefined> {
  const self = await config.hardware.getStorageItem("self");
  if (self != null && self !== "") {
    return JSON.parse(self);
  }
}

export async function saveSelf(self: ZuParticipant): Promise<void> {
  return config.hardware.setStorageItem("self", JSON.stringify(self));
}

export async function loadIdentity(): Promise<Identity | null> {
  const str = await config.hardware.getStorageItem("identity");
  return str ? new Identity(str) : null;
}

export async function saveIdentity(identity: Identity): Promise<void> {
  return config.hardware.setStorageItem("identity", identity.toString());
}

export async function saveParticipantInvalid(participantInvalid: boolean) {
  return config.hardware.setStorageItem(
    "participantInvalid",
    participantInvalid + ""
  );
}

export async function loadParticipantInvalid(): Promise<boolean> {
  const participantInvalid = await config.hardware.getStorageItem(
    "participantInvalid"
  );
  return JSON.parse(participantInvalid ?? "false");
}
