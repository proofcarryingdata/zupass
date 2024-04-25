import { createStorageBackedCredentialCache } from "@pcd/passport-interface";
import { Identity } from "@semaphore-protocol/identity";
import {
  loadCheckedInOfflineDevconnectTickets,
  loadCheckedInPodboxOfflineTickets,
  loadEncryptionKey,
  loadIdentity,
  loadOfflineTickets,
  loadPCDs,
  loadPersistentSyncStatus,
  loadPodboxOfflineTickets,
  loadSelf,
  loadSubscriptions,
  saveIdentity
} from "./localstorage";
import { AppState } from "./state";
import { validateAndLogInitialAppState } from "./validateState";

export async function loadInitialState(): Promise<AppState> {
  let identity = loadIdentity();

  if (!identity) {
    console.log("Generating a new Semaphore identity...");
    identity = new Identity();
    saveIdentity(identity);
  }

  const self = loadSelf();
  const pcds = await loadPCDs(self);
  const encryptionKey = loadEncryptionKey();
  const subscriptions = await loadSubscriptions();
  const offlineTickets = loadOfflineTickets();
  const podboxOfflineTickets = loadPodboxOfflineTickets();
  const checkedInOfflineDevconnectTickets =
    loadCheckedInOfflineDevconnectTickets();
  const checkedInOfflinePodboxTickets = loadCheckedInPodboxOfflineTickets();

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
    modal,
    subscriptions,
    resolvingSubscriptionId: undefined,
    credentialCache,
    offlineTickets,
    podboxOfflineTickets,
    checkedinOfflineDevconnectTickets: checkedInOfflineDevconnectTickets,
    checkedInOfflinePodboxTickets,
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
