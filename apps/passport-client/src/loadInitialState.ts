import {
  createStorageBackedCredentialCache,
  makeAddV4CommitmentRequest,
  requestUpgradeUserWithV4Commitment,
  requestUser
} from "@pcd/passport-interface";
import { v3tov4Identity } from "@pcd/semaphore-identity-v4";
import { Identity } from "@semaphore-protocol/identity";
import { appConfig } from "./appConfig";
import {
  loadEncryptionKey,
  loadIdentity,
  loadPCDs,
  loadPersistentSyncStatus,
  loadSelf,
  loadSubscriptions,
  saveIdentity,
  saveSelf
} from "./localstorage";
import { AppState } from "./state";
import { findIdentityV4PCD } from "./user";
import { validateAndLogInitialAppState } from "./validateState";

export async function loadInitialState(): Promise<AppState> {
  let identity = loadIdentity();

  if (!identity) {
    console.log("Generating a new Semaphore identity...");
    identity = new Identity();
    saveIdentity(identity);
  }

  let self = loadSelf();

  const pcds = await loadPCDs(self);

  // in the case that the user has not upgraded their account to v4,
  // (as indicated by missing semaphore_v4_commitment or semaphore_v4_pubkey in self)
  // upgrade their account to include their v4 identity details. this is a one-time
  // migration step necessary to upgrade an account from semaphore v3 to v4.
  if (
    pcds &&
    self &&
    (!self.semaphore_v4_commitment || !self.semaphore_v4_pubkey)
  ) {
    const semaphoreV4IdentityPCD = findIdentityV4PCD(pcds);
    if (semaphoreV4IdentityPCD) {
      await requestUpgradeUserWithV4Commitment(
        appConfig.zupassServer,
        await makeAddV4CommitmentRequest(pcds)
      );
    }
    const newSelfResponse = await requestUser(
      appConfig.zupassServer,
      self.uuid
    );
    if (newSelfResponse.success) {
      self = newSelfResponse.value;
      saveSelf(self);
    }
  }

  const encryptionKey = loadEncryptionKey();
  const subscriptions = await loadSubscriptions();

  let modal = { modalType: "none" } as AppState["modal"];

  if (
    // If on Zupass legacy login, ask user to set password
    self &&
    !encryptionKey &&
    !self.salt
  ) {
    console.log("Asking existing user to set a password");
    modal = { modalType: "upgrade-account-modal" };
  }

  const credentialCache = createStorageBackedCredentialCache();

  const persistentSyncStatus = loadPersistentSyncStatus();

  const state: AppState = {
    self,
    encryptionKey,
    pcds,
    identity,
    identityV4: v3tov4Identity(identity),
    modal,
    subscriptions,
    resolvingSubscriptionId: undefined,
    credentialCache,
    offline: !window.navigator.onLine,
    serverStorageRevision: persistentSyncStatus.serverStorageRevision,
    serverStorageHash: persistentSyncStatus.serverStorageHash,
    importScreen: undefined,
    strichSDKstate: undefined
  };

  if (!validateAndLogInitialAppState("loadInitialState", state)) {
    state.userInvalid = true;
    state.modal = { modalType: "invalid-participant" };
  }

  return state;
}
