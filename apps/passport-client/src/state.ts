import { ZuParticipant } from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
import { SemaphoreGroupPCDPackage } from "@pcd/semaphore-group-pcd";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { EndToEndEncryption } from "./endToEndEncryption";

export type PendingAction = { type: "new-passport"; email: string };

export interface ZuState {
  // Zuzalu semaphore identity.
  identity?: Identity;
  pcds: PCDCollection;
  endToEndEncryption: EndToEndEncryption;
  pendingAction?: PendingAction;

  // Participant metadata.
  // TODO: reload from passport server on startup.
  self?: ZuParticipant;

  // If set, shows an error popover.
  error?: ZuError;
}

export interface ZuError {
  title: string;
  message: string;
  stack?: string;
}

export async function savePCDs(pcds: PCDCollection) {
  const serialized = await pcds.serializeAll();
  const stringified = JSON.stringify(serialized);
  window.localStorage["pcds"] = stringified;
}

export async function loadPCDs() {
  const stringified = window.localStorage["pcds"];
  const serialized = JSON.parse(stringified ?? "[]");

  await SemaphoreGroupPCDPackage.init({
    wasmFilePath: "/semaphore-artifacts/16.wasm",
    zkeyFilePath: "/semaphore-artifacts/16.zkey",
  });

  await SemaphoreSignaturePCDPackage.init({
    wasmFilePath: "/semaphore-artifacts/16.wasm",
    zkeyFilePath: "/semaphore-artifacts/16.zkey",
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
