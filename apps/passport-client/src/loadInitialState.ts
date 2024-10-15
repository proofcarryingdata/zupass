import {
  createStorageBackedCredentialCache,
  makeUpgradeUserWithV4CommitmentRequest,
  requestUpgradeUserWithV4Commitment,
  requestUser
} from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
import { v3IdentityToPCD } from "@pcd/semaphore-identity-pcd";
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

  const self = loadSelf();

  const pcds = await loadPCDs(self);

  const encryptionKey = loadEncryptionKey();
  const subscriptions = await loadSubscriptions();

  const modal = { modalType: "none" } as AppState["modal"];

  const credentialCache = createStorageBackedCredentialCache();

  const persistentSyncStatus = loadPersistentSyncStatus();

  const state: AppState = {
    self,
    encryptionKey,
    pcds,
    identityV3,
    modal,
    bottomModal: { modalType: "none" },
    subscriptions,
    resolvingSubscriptionId: undefined,
    credentialCache,
    offline: !window.navigator.onLine,
    serverStorageRevision: persistentSyncStatus.serverStorageRevision,
    serverStorageHash: persistentSyncStatus.serverStorageHash,
    importScreen: undefined
  };
  if (
    appConfig.devMode &&
    (appConfig.zupassServer.includes("127.0.0.1") ||
      appConfig.zupassServer.includes("localhost"))
  ) {
    // await initTestData(state);
  }
  if (!validateAndLogInitialAppState("loadInitialState", state)) {
    state.userInvalid = true;
    state.modal = { modalType: "invalid-participant" };
  } else {
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

      // after the upgrade, we need to reload the user to ensure that the
      // v4 identity details are reflected in the user object.
      const newSelfResponse = await requestUser(
        appConfig.zupassServer,
        self.uuid
      );

      if (newSelfResponse.success) {
        state.self = newSelfResponse.value;
        saveSelf(newSelfResponse.value);
      } else {
        // proceed to the next step anyway, since we don't have any other option
      }
    }
  }

  return state;
}
