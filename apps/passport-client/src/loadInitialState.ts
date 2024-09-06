import {
  createStorageBackedCredentialCache,
  makeUpgradeUserWithV4CommitmentRequest,
  requestUpgradeUserWithV4Commitment,
  requestUser
} from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
import { v3IdentityToPCD, v3tov4Identity } from "@pcd/semaphore-identity-pcd";
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
import { getPackages } from "./pcdPackages";
import { AppState } from "./state";
import { validateAndLogInitialAppState } from "./validateState";

export async function loadInitialState(): Promise<AppState> {
  let identityV3 = loadIdentity();

  if (!identityV3) {
    console.log("Generating a new Semaphore identity...");
    identityV3 = new Identity();
    saveIdentity(identityV3);
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
    const identityPCD = v3IdentityToPCD(identityV3);

    // there isn't really any to way to handle an error in this process, so
    // we'll just proceed regardless of the response, and let this code-path
    // execute again later to try again.
    await requestUpgradeUserWithV4Commitment(
      appConfig.zupassServer,
      await makeUpgradeUserWithV4CommitmentRequest(
        new PCDCollection(await getPackages(), [identityPCD])
      )
    );

    const newSelfResponse = await requestUser(
      appConfig.zupassServer,
      self.uuid
    );

    if (newSelfResponse.success) {
      self = newSelfResponse.value;
      saveSelf(self);
    } else {
      // proceed to the next step anyway, since we don't have any other option
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
    identityV3: identityV3,
    identityV4: v3tov4Identity(identityV3),
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
