import { encryptStorage, PCDCrypto } from "@pcd/passport-crypto";
import { EncryptedStorage, ZuParticipant } from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
import { SemaphoreGroupPCDPackage } from "@pcd/semaphore-group-pcd";
import {
  SemaphoreIdentityPCD,
  SemaphoreIdentityPCDPackage,
  SemaphoreIdentityPCDTypeName,
} from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { createContext } from "react";
import { uploadEncryptedStorage } from "./api/endToEndEncryptionApi";
import {
  loadEncryptionKey,
  loadPCDs,
  saveEncryptionKey,
  saveIdentity,
  savePCDs,
  saveSelf,
} from "./localstorage";
import { ZuError, ZuState } from "./state";

export type Dispatcher = (action: Action) => void;

export type Action =
  | {
      type: "new-passport";
      email: string;
    }
  | {
      type: "save-self";
      participant: ZuParticipant;
    }
  | {
      type: "error";
      error: ZuError;
    }
  | {
      type: "clear-error";
    }
  | {
      type: "reset-passport";
    }
  | {
      type: "load-from-sync";
      storage: EncryptedStorage;
      encryptionKey: string;
    };

export const DispatchContext = createContext<[ZuState, Dispatcher]>([] as any);

export type ZuUpdate = (s: Partial<ZuState>) => void;

export async function dispatch(
  action: Action,
  state: ZuState,
  update: ZuUpdate
) {
  console.log(`Dispatching ${action.type}`, action);

  switch (action.type) {
    case "new-passport":
      return genPassport(action.email, update);
    case "save-self":
      return doSaveSelf(action.participant, state, update);
    case "error":
      return update({ error: action.error });
    case "clear-error":
      return clearError(update);
    case "reset-passport":
      return resetPassport(update);
    case "load-from-sync":
      return loadFromSync(action.encryptionKey, action.storage, state, update);
    default:
      console.error("Unknown action type", action);
  }
}

async function genPassport(email: string, update: ZuUpdate) {
  // Generate a semaphore identity, save it to the local store, generate an
  // email magic link. In prod, send email, in dev, display the link.

  // Generate a fresh identity, save in local storage.
  const identity = new Identity();
  console.log("Created identity", identity.toString());
  saveIdentity(identity);

  update({ identity, pendingAction: { type: "new-passport", email } });
  window.location.hash = "#/new-passport";

  const identityPCD = await SemaphoreIdentityPCDPackage.prove({ identity });
  const pcds = new PCDCollection(
    [
      SemaphoreIdentityPCDPackage,
      SemaphoreGroupPCDPackage,
      SemaphoreSignaturePCDPackage,
    ],
    [identityPCD]
  );

  const crypto = await PCDCrypto.newInstance();
  const encryptionKey = await crypto.generateRandomKey();

  await savePCDs(pcds);
  await saveEncryptionKey(encryptionKey);

  update({
    pcds,
    encryptionKey,
    pendingAction: { type: "new-passport", email },
  });
}

/**
 * Runs the first time the user logs in with their email
 */
async function doSaveSelf(
  participant: ZuParticipant,
  state: ZuState,
  update: ZuUpdate,
  upload: boolean
) {
  // Verify that the identity is correct.
  const { identity } = state;
  console.log("Save self", identity, participant);
  if (
    identity == null ||
    identity.commitment.toString() !== participant.commitment
  ) {
    update({
      error: {
        title: "Invalid identity",
        message: "Something went wrong saving your passport. Contact support.",
      },
    });
  }

  // Save to local storage.
  saveSelf(participant);

  // Compute identity-revealing proof.
  update({ self: participant });

  const pcds = await loadPCDs();
  const encryptionKey = await loadEncryptionKey();
  const encryptedStorage = await encryptStorage(
    pcds,
    participant,
    participant.token,
    encryptionKey
  );

  uploadEncryptedStorage(participant.email, participant.token, encryptedStorage)
    .then(() => {
      console.log("successfully saved encrypted storage to server");
      // Redirect to the home page.
      window.location.hash = "#/";
    })
    .catch((e) => {
      // TODO
    });
}

function clearError(update: ZuUpdate) {
  window.location.hash = "#/";
  update({ error: undefined });
}

function resetPassport(update: ZuUpdate) {
  window.localStorage.clear();
  window.location.hash = "#/";
  update({ self: undefined });
}

async function loadFromSync(
  encryptionKey: string,
  storage: EncryptedStorage,
  state: ZuState,
  update: ZuUpdate
) {
  console.log("loading from sync", storage);

  const pcds = new PCDCollection(
    [
      SemaphoreIdentityPCDPackage,
      SemaphoreGroupPCDPackage,
      SemaphoreSignaturePCDPackage,
    ],
    []
  );

  await pcds.deserializeAllAndAdd(storage.pcds);
  // assumes that we only have one semaphore identity in the passport.
  // todo: some metadata that identifies the zuzalu semaphore id as
  // some sort of unique one
  const identityPCD = pcds.getPCDsByType(
    SemaphoreIdentityPCDTypeName
  )[0] as SemaphoreIdentityPCD;

  if (!identityPCD) {
    // TODO: handle error gracefully
    throw new Error("no identity found in encrypted storage");
  }

  await savePCDs(pcds);
  saveEncryptionKey(encryptionKey);
  saveSelf(storage.self);
  saveIdentity(identityPCD.claim.identity);

  update({
    encryptionKey,
    pcds,
    identity: identityPCD.claim.identity,
    self: storage.self,
  });

  window.location.hash = "#/";
}
