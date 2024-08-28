import {
  createStorageBackedCredentialCache,
  makeAddV4CommitmentRequest,
  requestAddSemaphoreV4Commitment
} from "@pcd/passport-interface";
import { SemaphoreIdentityV4PCDTypeName } from "@pcd/semaphore-identity-v4";
import { Identity } from "@semaphore-protocol/identity";
import { appConfig } from "./appConfig";
import {
  loadEncryptionKey,
  loadIdentity,
  loadPCDs,
  loadPersistentSyncStatus,
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

  if (pcds && self && !self.semaphore_v4_commitment) {
    const semaphoreV4IdentityPCD = pcds.getPCDsByType(
      SemaphoreIdentityV4PCDTypeName
    )[0];

    if (semaphoreV4IdentityPCD) {
      await requestAddSemaphoreV4Commitment(
        appConfig.zupassServer,
        await makeAddV4CommitmentRequest(pcds)
      );
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
