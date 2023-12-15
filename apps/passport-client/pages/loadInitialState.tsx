import { createStorageBackedCredentialCache } from "@pcd/passport-interface";
import { Identity } from "@semaphore-protocol/identity";
import {
  loadCheckedInOfflineDevconnectTickets,
  loadEncryptionKey,
  loadIdentity,
  loadOfflineTickets,
  loadPCDs,
  loadPersistentSyncStatus,
  loadSelf,
  loadSubscriptions,
  saveIdentity,
  saveSubscriptions
} from "../src/localstorage";
import { AppState } from "../src/state";
import { validateAndLogStateErrors } from "../src/validateState";

// TODO: move to a separate file
export async function loadInitialState(): Promise<AppState> {
  let identity = loadIdentity();

  if (identity == null) {
    console.log("Generating a new Semaphore identity...");
    identity = new Identity();
    saveIdentity(identity);
  }

  const self = loadSelf();
  const pcds = await loadPCDs();
  const encryptionKey = loadEncryptionKey();
  const subscriptions = await loadSubscriptions();
  const offlineTickets = loadOfflineTickets();
  const checkedInOfflineDevconnectTickets =
    loadCheckedInOfflineDevconnectTickets();

  subscriptions.updatedEmitter.listen(() => saveSubscriptions(subscriptions));

  let modal = { modalType: "none" } as AppState["modal"];

  if (
    // If on Zupass legacy login, ask user to set password
    self != null &&
    encryptionKey == null &&
    self.salt == null
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
    checkedinOfflineDevconnectTickets: checkedInOfflineDevconnectTickets,
    offline: !window.navigator.onLine,
    serverStorageRevision: persistentSyncStatus.serverStorageRevision,
    serverStorageHash: persistentSyncStatus.serverStorageHash
  };

  if (!validateAndLogStateErrors(state.self, state.identity, state.pcds)) {
    state.userInvalid = true;
  }

  return state;
}
