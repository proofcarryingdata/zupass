import { ZuParticipant } from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
import { SemaphoreGroupPCDPackage } from "@pcd/semaphore-group-pcd";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { config } from "./config";

export async function savePCDs(pcds: PCDCollection) {
  const serialized = await pcds.serializeAll();
  const stringified = JSON.stringify(serialized);
  window.localStorage["pcds"] = stringified;
}

export async function loadPCDs() {
  const stringified = window.localStorage["pcds"];
  const serialized = JSON.parse(stringified ?? "[]");

  const SERVER_STATIC_URL = config.passportServer + "/static/";

  await SemaphoreGroupPCDPackage.init({
    wasmFilePath: SERVER_STATIC_URL + "/semaphore-artifacts/16.wasm",
    zkeyFilePath: SERVER_STATIC_URL + "/semaphore-artifacts/16.zkey",
  });

  await SemaphoreSignaturePCDPackage.init({
    wasmFilePath: SERVER_STATIC_URL + "/semaphore-artifacts/16.wasm",
    zkeyFilePath: SERVER_STATIC_URL + "/semaphore-artifacts/16.zkey",
  });

  return await PCDCollection.deserialize(
    [
      SemaphoreGroupPCDPackage,
      SemaphoreIdentityPCDPackage,
      SemaphoreSignaturePCDPackage,
    ],
    serialized
  );
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
