import { ZuParticipant } from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
import { Identity } from "@semaphore-protocol/identity";
import { getPackages } from "./pcdLoader";

export async function savePCDs(pcds: PCDCollection) {
  const serialized = await pcds.serializeAll();
  const stringified = JSON.stringify(serialized);
  window.localStorage["pcds"] = stringified;
}

export async function loadPCDs() {
  const stringified = window.localStorage["pcds"];
  const serialized = JSON.parse(stringified ?? "[]");

  return await PCDCollection.deserialize(await getPackages(), serialized);
}

export function saveEncryptionKey(key: string): void {
  window.localStorage["encryption_key"] = key;
}

export async function loadEncryptionKey(): Promise<string | undefined> {
  return window.localStorage["encryption_key"];
}

export function loadSelf(): ZuParticipant | undefined {
  const self = window.localStorage["self"];
  if (self != null && self !== "") {
    return JSON.parse(self);
  }
}

export function saveSelf(self: ZuParticipant): void {
  window.localStorage["self"] = JSON.stringify(self);
}

export function loadIdentity(): Identity | null {
  const str = window.localStorage["identity"];
  return str ? new Identity(str) : null;
}

export function saveIdentity(identity: Identity): void {
  window.localStorage["identity"] = identity.toString();
}

export function saveParticipantInvalid(participantInvalid: boolean) {
  window.localStorage["participantInvalid"] = participantInvalid;
}

export function loadParticipantInvalid(): boolean {
  return JSON.parse(window.localStorage["participantInvalid"] ?? "false");
}
