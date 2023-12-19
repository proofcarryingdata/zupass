import { EmailPCDTypeName } from "@pcd/email-pcd";
import { PCDCrypto } from "@pcd/passport-crypto";
import {
  agreeTerms,
  applyActions,
  CredentialManager,
  deserializeStorage,
  Feed,
  KnownTicketTypesAndKeys,
  LATEST_PRIVACY_NOTICE,
  requestCreateNewUser,
  requestLogToServer,
  requestUser,
  serializeStorage,
  StorageWithRevision,
  User
} from "@pcd/passport-interface";
import { PCDCollection, PCDPermission } from "@pcd/pcd-collection";
import { PCD, SerializedPCD } from "@pcd/pcd-types";
import {
  isSemaphoreIdentityPCD,
  SemaphoreIdentityPCD,
  SemaphoreIdentityPCDPackage,
  SemaphoreIdentityPCDTypeName
} from "@pcd/semaphore-identity-pcd";
import { sleep } from "@pcd/util";
import { Identity } from "@semaphore-protocol/identity";
import { createContext } from "react";
import { appConfig } from "./appConfig";
import {
  notifyLoginToOtherTabs,
  notifyLogoutToOtherTabs,
  notifyPasswordChangeToOtherTabs
} from "./broadcastChannel";
import { addDefaultSubscriptions } from "./defaultSubscriptions";
import {
  loadEncryptionKey,
  loadPrivacyNoticeAgreed,
  loadSelf,
  saveEncryptionKey,
  saveIdentity,
  savePCDs,
  savePersistentSyncStatus,
  saveSelf,
  saveSubscriptions
} from "./localstorage";
import { getPackages } from "./pcdPackages";
import { hasPendingRequest } from "./sessionStorage";
import { AppError, AppState, GetState, StateEmitter } from "./state";
import { hasSetupPassword } from "./user";
import {
  downloadAndMergeStorage,
  uploadSerializedStorage,
  uploadStorage
} from "./useSyncE2EEStorage";
import { assertUnreachable } from "./util";
import { validateAndLogRunningAppState } from "./validateState";

export type Dispatcher = (action: Action) => void;

export type Action =
  | {
      type: "new-passport";
      email: string;
    }
  | {
      type: "create-user-skip-password";
      email: string;
      token: string;
    }
  | {
      type: "login";
      email: string;
      password: string;
      token: string;
    }
  | {
      type: "set-self";
      self: User;
    }
  | {
      type: "set-modal";
      modal: AppState["modal"];
    }
  | {
      type: "error";
      error: AppError;
    }
  | {
      type: "clear-error";
    }
  | {
      type: "reset-passport";
    }
  | { type: "participant-invalid" }
  | {
      type: "load-after-login";
      storage: StorageWithRevision;
      encryptionKey: string;
    }
  | { type: "change-password"; newEncryptionKey: string; newSalt: string }
  | { type: "password-change-on-other-tab" }
  | { type: "add-pcds"; pcds: SerializedPCD[]; upsert?: boolean }
  | { type: "remove-pcd"; id: string }
  | { type: "sync" }
  | { type: "resolve-subscription-error"; subscriptionId: string }
  | {
      type: "add-subscription";
      providerUrl: string;
      providerName: string;
      feed: Feed;
    }
  | { type: "remove-subscription"; subscriptionId: string }
  | {
      type: "update-subscription-permissions";
      subscriptionId: string;
      permissions: PCDPermission[];
    }
  | {
      type: "set-known-ticket-types-and-keys";
      knownTicketTypesAndKeys: KnownTicketTypesAndKeys;
    }
  | {
      type: "handle-agreed-privacy-notice";
      version: number;
    }
  | {
      type: "prompt-to-agree-privacy-notice";
    }
  | {
      type: "sync-subscription";
      subscriptionId: string;
      onSucess?: () => void;
      onError?: (e: Error) => void;
    }
  | {
      type: "merge-import";
      collection: PCDCollection;
      pcdsToMergeIds: Set<PCD["id"]>;
    };

export type StateContextValue = {
  getState: GetState;
  stateEmitter: StateEmitter;
  dispatch: Dispatcher;
  update: ZuUpdate;
};

export const StateContext = createContext<StateContextValue>({} as any);

export type ZuUpdate = (s: Partial<AppState>) => void;

export async function dispatch(
  action: Action,
  state: AppState,
  update: ZuUpdate
) {
  switch (action.type) {
    case "new-passport":
      return genPassport(state.identity, action.email, update);
    case "create-user-skip-password":
      return createNewUserSkipPassword(
        action.email,
        action.token,
        state,
        update
      );
    case "login":
      return createNewUserWithPassword(
        action.email,
        action.token,
        action.password,
        state,
        update
      );
    case "set-self":
      return setSelf(action.self, state, update);
    case "error":
      return update({ error: action.error });
    case "clear-error":
      return clearError(state, update);
    case "reset-passport":
      return resetPassport(state, update);
    case "load-after-login":
      return loadAfterLogin(action.encryptionKey, action.storage, update);
    case "set-modal":
      return update({
        modal: action.modal
      });
    case "password-change-on-other-tab":
      return handlePasswordChangeOnOtherTab(update);
    case "change-password":
      return saveNewPasswordAndBroadcast(
        action.newEncryptionKey,
        action.newSalt,
        state,
        update
      );
    case "add-pcds":
      return addPCDs(state, update, action.pcds, action.upsert);
    case "remove-pcd":
      return removePCD(state, update, action.id);
    case "participant-invalid":
      return userInvalid(update);
    case "sync":
      return sync(state, update);
    case "resolve-subscription-error":
      return resolveSubscriptionError(state, update, action.subscriptionId);
    case "add-subscription":
      return addSubscription(
        state,
        update,
        action.providerUrl,
        action.providerName,
        action.feed
      );
    case "remove-subscription":
      return removeSubscription(state, update, action.subscriptionId);
    case "update-subscription-permissions":
      return updateSubscriptionPermissions(
        state,
        update,
        action.subscriptionId,
        action.permissions
      );
    case "set-known-ticket-types-and-keys":
      return setKnownTicketTypesAndKeys(
        state,
        update,
        action.knownTicketTypesAndKeys
      );
    case "handle-agreed-privacy-notice":
      return handleAgreedPrivacyNotice(state, update, action.version);
    case "prompt-to-agree-privacy-notice":
      return promptToAgreePrivacyNotice(state, update);
    case "sync-subscription":
      return syncSubscription(
        state,
        update,
        action.subscriptionId,
        action.onSucess,
        action.onError
      );
    case "merge-import":
      return mergeImport(
        state,
        update,
        action.collection,
        action.pcdsToMergeIds
      );
    default:
      // We can ensure that we never get here using the type system
      assertUnreachable(action);
  }
}

async function genPassport(
  identity: Identity,
  email: string,
  update: ZuUpdate
) {
  const identityPCD = await SemaphoreIdentityPCDPackage.prove({ identity });
  const pcds = new PCDCollection(await getPackages(), [identityPCD]);

  await savePCDs(pcds);

  window.location.hash = "#/new-passport?email=" + encodeURIComponent(email);

  update({ pcds });
}

async function createNewUserSkipPassword(
  email: string,
  token: string,
  state: AppState,
  update: ZuUpdate
) {
  update({
    modal: { modalType: "none" }
  });
  const crypto = await PCDCrypto.newInstance();
  const encryptionKey = await crypto.generateRandomKey();
  await saveEncryptionKey(encryptionKey);

  update({
    encryptionKey
  });

  const newUserResult = await requestCreateNewUser(
    appConfig.zupassServer,
    email,
    token,
    state.identity.commitment.toString(),
    undefined,
    encryptionKey
  );

  if (newUserResult.success) {
    return finishAccountCreation(newUserResult.value, state, update);
  }

  update({
    error: {
      title: "Account creation failed",
      message: "Couldn't create an account. " + newUserResult.error,
      dismissToCurrentPage: true
    }
  });
}

async function createNewUserWithPassword(
  email: string,
  token: string,
  password: string,
  state: AppState,
  update: ZuUpdate
) {
  const crypto = await PCDCrypto.newInstance();
  const { salt: newSalt, key: encryptionKey } =
    await crypto.generateSaltAndEncryptionKey(password);

  await saveEncryptionKey(encryptionKey);

  update({
    encryptionKey
  });

  const newUserResult = await requestCreateNewUser(
    appConfig.zupassServer,
    email,
    token,
    state.identity.commitment.toString(),
    newSalt,
    undefined
  );

  if (newUserResult.success) {
    return finishAccountCreation(newUserResult.value, state, update);
  }

  update({
    error: {
      title: "Login failed",
      message: "Couldn't log in. " + newUserResult.error,
      dismissToCurrentPage: true
    }
  });
  notifyLoginToOtherTabs();
}

/**
 * Runs the first time the user logs in with their email
 */
async function finishAccountCreation(
  user: User,
  state: AppState,
  update: ZuUpdate
) {
  // Verify that the identity is correct.
  if (
    !validateAndLogRunningAppState(
      "finishAccountCreation",
      user,
      state.identity,
      state.pcds
    )
  ) {
    update({
      error: {
        title: "Invalid identity",
        message: "Something went wrong saving your Zupass. Contact support."
      }
    });
    return; // Don't save the bad identity. User must reset account.
  }

  // Save PCDs to E2EE storage.  knownRevision=undefined is the way to create
  // a new entry.  It would also overwrite any conflicting data which may
  // already exist, but that should be impossible for a new account with
  // a new encryption key.
  console.log("[ACCOUNT] Upload initial PCDs");
  const uploadResult = await uploadStorage(
    user,
    state.identity,
    state.pcds,
    state.subscriptions,
    undefined // knownRevision
  );
  if (uploadResult.success) {
    update({
      modal: { modalType: "none" },
      serverStorageRevision: uploadResult.value.revision,
      serverStorageHash: uploadResult.value.storageHash
    });
  } else if (
    !uploadResult.success &&
    uploadResult.error.name === "ValidationError"
  ) {
    update({
      userInvalid: true
    });
  }

  // Save user to local storage.  This is done last because it unblocks
  // background sync, which is best delayed until after the upload above.
  console.log("[ACCOUNT] Save self");
  await setSelf(user, state, update);

  // Account creation is complete.  Close any existing modal, and redirect
  // user if they were in the middle of something.
  update({ modal: { modalType: "none" } });
  if (hasPendingRequest()) {
    window.location.hash = "#/login-interstitial";
  } else {
    window.location.hash = "#/";
  }
}

// Runs periodically, whenever we poll new participant info and when we broadcast state updates.
async function setSelf(self: User, state: AppState, update: ZuUpdate) {
  let userMismatched = false;
  let hasChangedPassword = false;

  if (state.self && self.salt != state.self.salt) {
    // If the password has been changed on a different device, the salts will mismatch
    console.log("User salt mismatch");
    hasChangedPassword = true;
    requestLogToServer(
      appConfig.zupassServer,
      "another-device-changed-password",
      {
        oldSalt: state.self.salt,
        newSalt: self.salt,
        email: self.email
      }
    );
  } else if (
    BigInt(self.commitment).toString() !== state.identity.commitment.toString()
  ) {
    console.log("Identity commitment mismatch");
    userMismatched = true;
    requestLogToServer(appConfig.zupassServer, "invalid-user", {
      oldCommitment: state.identity.commitment.toString(),
      newCommitment: self.commitment.toString()
    });
  } else if (state.self && state.self.uuid !== self.uuid) {
    console.log("User UUID mismatch");
    userMismatched = true;
    requestLogToServer(appConfig.zupassServer, "invalid-user", {
      oldUUID: state.self.uuid,
      newUUID: self.uuid
    });
  }

  if (hasChangedPassword) {
    anotherDeviceChangedPassword(update);
    return;
  }

  if (userMismatched) {
    userInvalid(update);
    return;
  }

  saveSelf(self); // Save to local storage.
  update({ self }); // Update in-memory state.
}

function clearError(state: AppState, update: ZuUpdate) {
  if (!state.error?.dismissToCurrentPage) {
    window.location.hash = "#/";
  }
  update({ error: undefined });
}

async function resetPassport(state: AppState, update: ZuUpdate) {
  await requestLogToServer(appConfig.zupassServer, "logout", {
    uuid: state.self?.uuid,
    email: state.self?.email,
    commitment: state.self?.commitment
  });
  // Clear saved state.
  window.localStorage.clear();
  // Clear in-memory state
  update({
    self: undefined,
    modal: {
      modalType: "none"
    }
  });
  notifyLogoutToOtherTabs();

  setTimeout(() => {
    window.location.reload();
  }, 1);
}

async function addPCDs(
  state: AppState,
  update: ZuUpdate,
  pcds: SerializedPCD[],
  upsert?: boolean
) {
  // Require user to set up a password before adding PCDs
  if (state.self && !hasSetupPassword(state.self)) {
    update({
      modal: {
        modalType: "require-add-password"
      }
    });
  }
  await state.pcds.deserializeAllAndAdd(pcds, { upsert });
  await savePCDs(state.pcds);
  update({ pcds: state.pcds });
}

async function removePCD(state: AppState, update: ZuUpdate, pcdId: string) {
  state.pcds.remove(pcdId);
  await savePCDs(state.pcds);
  update({ pcds: state.pcds });
}

async function loadAfterLogin(
  encryptionKey: string,
  storage: StorageWithRevision,
  update: ZuUpdate
) {
  const { pcds, subscriptions, storageHash } = await deserializeStorage(
    storage.storage,
    await getPackages()
  );

  // Poll the latest user stored from the database rather than using the `self` object from e2ee storage.
  const userResponse = await requestUser(
    appConfig.zupassServer,
    storage.storage.self.uuid
  );
  if (!userResponse.success) {
    throw new Error(userResponse.error.errorMessage);
  }

  // TODO: This fragile mechanism of fetching the user's identity PCD assumes
  // it's always the first one created, and that changes never cause the order
  // to change.  We should do something more robust, probably tied to the
  // commitment stored in self.
  const identityPCD = pcds.getPCDsByType(
    SemaphoreIdentityPCDTypeName
  )[0] as SemaphoreIdentityPCD;

  if (
    !validateAndLogRunningAppState(
      "loadAfterLogin",
      userResponse.value,
      identityPCD.claim.identity,
      pcds
    )
  ) {
    update({ userInvalid: true });
    return;
  }

  let modal: AppState["modal"] = { modalType: "none" };
  if (!identityPCD) {
    // TODO: handle error gracefully
    // TODO: Also check that identityPCD's commitment matches the one
    // in storage.self
    throw new Error("no identity found in encrypted storage");
  } else if (
    // If on Zupass legacy login, ask user to set passwrod
    self != null &&
    encryptionKey == null &&
    storage.storage.self.salt == null
  ) {
    console.log("Asking existing user to set a password");
    modal = { modalType: "upgrade-account-modal" };
  }

  console.log(`[SYNC] saving state at login: revision ${storage.revision}`);
  await savePCDs(pcds);
  await saveSubscriptions(subscriptions);
  savePersistentSyncStatus({
    serverStorageRevision: storage.revision,
    serverStorageHash: storageHash
  });
  saveEncryptionKey(encryptionKey);
  saveSelf(userResponse.value);
  saveIdentity(identityPCD.claim.identity);

  update({
    encryptionKey,
    pcds,
    subscriptions,
    serverStorageRevision: storage.revision,
    serverStorageHash: storageHash,
    identity: identityPCD.claim.identity,
    self: userResponse.value,
    modal
  });
  notifyLoginToOtherTabs();

  await sleep(1);

  console.log("Loaded after login, redirecting to home screen...");
  if (hasPendingRequest()) {
    window.location.hash = "#/login-interstitial";
  } else {
    window.location.hash = "#/";
  }
}

// Update `self` and `encryptionKey` in-memory fields from their saved values in localStorage
async function handlePasswordChangeOnOtherTab(update: ZuUpdate) {
  const self = loadSelf();
  const encryptionKey = loadEncryptionKey();
  return update({
    self,
    encryptionKey,

    // Extra download helps to get our in-memory sync state up-to-date faster.
    // The password change on the other tab is an upload of a new revision so
    // a download is necessary.  Otherwise loading our new self object above
    // will make this tab think it needs to upload and cause a conflict.
    extraDownloadRequested: true
  });
}

async function saveNewPasswordAndBroadcast(
  newEncryptionKey: string,
  newSalt: string,
  state: AppState,
  update: ZuUpdate
) {
  const newSelf = { ...state.self, salt: newSalt };
  saveSelf(newSelf);
  saveEncryptionKey(newEncryptionKey);
  notifyPasswordChangeToOtherTabs();
  update({
    encryptionKey: newEncryptionKey,
    self: newSelf
  });
}

function userInvalid(update: ZuUpdate) {
  update({
    userInvalid: true,
    modal: { modalType: "invalid-participant" }
  });
}

function anotherDeviceChangedPassword(update: ZuUpdate) {
  update({
    anotherDeviceChangedPassword: true,
    modal: { modalType: "another-device-changed-password" }
  });
}

/**
 * This sync function can be called any amount of times, and it will
 * function properly. It does the following:
 *
 * - if PCDs have not been downloaded yet, and are not in the
 *   process of being downloaded, kicks off the process of downloading
 *   them from e2ee.
 *
 * - if the PCDs have been downloaded, and the current set of PCDs
 *   in Zupass does not equal the downloaded set, and if
 *   Zupass is not currently uploading the current set of PCDs
 *   to e2ee, then uploads then to e2ee.
 */
async function sync(state: AppState, update: ZuUpdate) {
  // This re-entrancy protection ensures only one event-sequence is
  // inside of doSync() at any time.  When doSync() completes, it will
  // run again if any state changes were made, or if any updates were skipped.
  if (!syncInProgress) {
    try {
      syncInProgress = true;
      const stateChanges = await doSync(state, update);

      // sync() is triggered via dispatch on any update, so if we make changes
      // we know we'll be called again the latest AppState snapshot.  If we
      // have no changes, we can force another sync via and empty update, to
      // ensure we didn't miss any important states.
      if (stateChanges) {
        update(stateChanges);
      } else if (skippedSyncUpdates > 0) {
        console.log("[SYNC] running an extra sync in case of missed updates");
        update({});
      }
      skippedSyncUpdates = 0;
    } finally {
      syncInProgress = false;
    }
  } else {
    // If we got an update, but skipped it because another was in progress,
    // track that so we can make sure another update runs later.  This ensures
    // we don't miss a snapshot of an AppState change which could turn out to be
    // important.
    console.log("[SYNC] skipping reentrant update");
    skippedSyncUpdates++;
  }
}

/**
 * Used for reentrantcy protection inside of sync().
 */
let syncInProgress = false;
let skippedSyncUpdates = 0;

/**
 * Does the real work of sync(), inside of reentrancy protection.  If action
 * is needed, this function takes one action and returns, expecting to be
 * run again until no further action is needed.
 *
 * Returns the changes to be made to AppState, which the caller is expected
 * to applly via update().  If the result is defined, this function should be
 * run again.
 *
 * Further calls to update() will also occur inside of this function, to update
 * fields which allow the UI to track progress.
 */
async function doSync(
  state: AppState,
  update: ZuUpdate
): Promise<Partial<AppState> | undefined> {
  // Check pre-requisites which would indicate if we're not fully logged in yet.
  if (!state.self) {
    console.log("[SYNC] no user available to sync");
    return undefined;
  }
  if (loadEncryptionKey() == null) {
    console.log("[SYNC] no encryption key, can't sync");
    return undefined;
  }
  if (state.userInvalid) {
    console.log("[SYNC] userInvalid=true, exiting sync");
    return undefined;
  }

  // If we haven't downloaded from storage, do that first.  After that we'll
  // download again when requested to poll, but only after the first full sync
  // has completed.
  if (
    !state.downloadedPCDs ||
    (state.completedFirstSync && state.extraDownloadRequested)
  ) {
    console.log("[SYNC] sync action: download");

    // Download user's E2EE storage, which includes both PCDs and subscriptions.
    // We'll skip this if it fails, or if the server indicates no changes based
    // on the last revision we downloaded.
    const dlRes = await downloadAndMergeStorage(
      state.serverStorageRevision,
      state.serverStorageHash,
      state.self,
      state.identity,
      state.pcds,
      state.subscriptions
    );
    if (dlRes.success && dlRes.value != null) {
      const { pcds, subscriptions, serverRevision, serverHash } = dlRes.value;
      return {
        downloadedPCDs: true,
        pcds,
        subscriptions,
        serverStorageRevision: serverRevision,
        serverStorageHash: serverHash,
        extraDownloadRequested: false
      };
    } else {
      console.log(
        `[SYNC] skipping download:`,
        dlRes.success ? "no changes" : "failed"
      );
      return {
        downloadedPCDs: true,
        extraDownloadRequested: false
      };
    }
  }

  if (
    !state.loadedIssuedPCDs ||
    (state.completedFirstSync && state.extraSubscriptionFetchRequested)
  ) {
    update({ loadingIssuedPCDs: true });
    try {
      console.log("[SYNC] loading issued pcds");
      addDefaultSubscriptions(state.subscriptions);
      console.log(
        "[SYNC] active subscriptions",
        state.subscriptions.getActiveSubscriptions()
      );
      const credentialManager = new CredentialManager(
        state.identity,
        state.pcds,
        state.credentialCache
      );
      console.log("[SYNC] initalized credentialManager", credentialManager);
      const actions =
        await state.subscriptions.pollSubscriptions(credentialManager);
      console.log(`[SYNC] fetched ${actions.length} actions`);

      await applyActions(state.pcds, actions);
      console.log("[SYNC] applied pcd actions");
      await savePCDs(state.pcds);
      await saveSubscriptions(state.subscriptions);
      console.log("[SYNC] saved issued pcds and updated subscriptions");
    } catch (e) {
      console.log(`[SYNC] failed to load issued PCDs, skipping this step`, e);
    }

    return {
      loadedIssuedPCDs: true,
      loadingIssuedPCDs: false,
      extraSubscriptionFetchRequested: false,
      pcds: state.pcds,
      subscriptions: state.subscriptions
    };
  }

  // Generate a hash from our in-memory state.  Upload only if the hash is
  // different, meaning there are some changes to upload.
  const appStorage = await serializeStorage(
    state.self,
    state.pcds,
    state.subscriptions
  );

  if (state.serverStorageHash !== appStorage.storageHash) {
    console.log("[SYNC] sync action: upload");
    const upRes = await uploadSerializedStorage(
      state.self,
      state.identity,
      state.pcds,
      appStorage.serializedStorage,
      appStorage.storageHash,
      state.serverStorageRevision
    );
    if (upRes.success) {
      return {
        serverStorageRevision: upRes.value.revision,
        serverStorageHash: upRes.value.storageHash
      };
    } else {
      if (upRes.error.name === "ValidationError") {
        return { userInvalid: true };
      }

      // Upload failed.  Update AppState if necessary, but not unnecessarily.
      // AppState updates will trigger another upload attempt.
      const needExtraDownload = upRes.error.name === "Conflict";
      if (
        state.completedFirstSync &&
        (!needExtraDownload || state.extraDownloadRequested)
      ) {
        return undefined;
      }

      const updates: Partial<AppState> = {};
      if (!state.completedFirstSync) {
        // We completed a first attempt at sync, even if it failed.
        updates.completedFirstSync = true;
      }
      if (needExtraDownload && !state.extraDownloadRequested) {
        updates.extraDownloadRequested = true;
      }

      return updates;
    }
  }

  if (!state.completedFirstSync) {
    console.log("[SYNC] first sync completed");
    return {
      completedFirstSync: true
    };
  }

  console.log("[SYNC] sync action: no-op");
  return undefined;
}

async function syncSubscription(
  state: AppState,
  update: ZuUpdate,
  subscriptionId: string,
  onSuccess?: () => void,
  onError?: (e: Error) => void
) {
  try {
    console.log("[SYNC] loading pcds from subscription", subscriptionId);
    const subscription = state.subscriptions.getSubscription(subscriptionId);
    const credentialManager = new CredentialManager(
      state.identity,
      state.pcds,
      state.credentialCache
    );
    const actions = await state.subscriptions.pollSingleSubscription(
      subscription,
      credentialManager
    );
    console.log(`[SYNC] fetched ${actions.length} actions`);

    await applyActions(state.pcds, actions);
    console.log("[SYNC] applied pcd actions");
    await savePCDs(state.pcds);
    console.log("[SYNC] loaded and saved issued pcds");

    update({
      pcds: state.pcds
    });
    onSuccess?.();
  } catch (e) {
    onError?.(e);
    console.log(`[SYNC] failed to load issued PCDs, skipping this step`, e);
  }
}

async function resolveSubscriptionError(
  _state: AppState,
  update: ZuUpdate,
  subscriptionId: string
) {
  update({
    resolvingSubscriptionId: subscriptionId,
    modal: { modalType: "resolve-subscription-error" }
  });
}

async function addSubscription(
  state: AppState,
  update: ZuUpdate,
  providerUrl: string,
  providerName: string,
  feed: Feed
) {
  if (!state.subscriptions.getProvider(providerUrl)) {
    state.subscriptions.addProvider(providerUrl, providerName);
  }
  const sub = await state.subscriptions.subscribe(providerUrl, feed, true);
  await saveSubscriptions(state.subscriptions);
  update({
    subscriptions: state.subscriptions,
    loadedIssuedPCDs: false
  });
  dispatch(
    { type: "sync-subscription", subscriptionId: sub.id },
    state,
    update
  );
}

async function removeSubscription(
  state: AppState,
  update: ZuUpdate,
  subscriptionId: string
) {
  state.subscriptions.unsubscribe(subscriptionId);
  await saveSubscriptions(state.subscriptions);
  update({
    subscriptions: state.subscriptions
  });
}

async function updateSubscriptionPermissions(
  state: AppState,
  update: ZuUpdate,
  subscriptionId: string,
  permisisons: PCDPermission[]
) {
  state.subscriptions.updateFeedPermissionsForSubscription(
    subscriptionId,
    permisisons
  );
  state.subscriptions.resetError(subscriptionId);
  await saveSubscriptions(state.subscriptions);
  update({
    subscriptions: state.subscriptions,
    loadedIssuedPCDs: false
  });
}

async function setKnownTicketTypesAndKeys(
  _state: AppState,
  update: ZuUpdate,
  knownTicketTypesAndKeys: KnownTicketTypesAndKeys
) {
  const keyMap = {};
  knownTicketTypesAndKeys.publicKeys.forEach((k) => {
    if (!keyMap[k.publicKeyType]) {
      keyMap[k.publicKeyType] = {};
    }
    keyMap[k.publicKeyType][k.publicKeyName] = k;
  });

  update({
    knownTicketTypes: knownTicketTypesAndKeys.knownTicketTypes,
    knownPublicKeys: keyMap
  });
}

/**
 * After the user has agreed to the terms, save the updated user record, set
 * `loadedIssuedPCDs` to false in order to prompt a feed refresh, and dismiss
 * the "legal terms" modal.
 */
async function handleAgreedPrivacyNotice(
  state: AppState,
  update: ZuUpdate,
  version: number
) {
  await saveSelf({ ...state.self, terms_agreed: version });
  update({
    self: { ...state.self, terms_agreed: version },
    loadedIssuedPCDs: false,
    modal: { modalType: "none" }
  });
}

/**
 * If the `user` object doesn't indicate that the user has agreed to the
 * latest terms, check local storage in case they've agreed but we failed
 * to sync it. If so, sync to server. If not, prompt user with an
 * un-dismissable modal.
 */
async function promptToAgreePrivacyNotice(state: AppState, update: ZuUpdate) {
  const cachedTerms = loadPrivacyNoticeAgreed();
  if (cachedTerms === LATEST_PRIVACY_NOTICE) {
    // sync to server
    await agreeTerms(
      appConfig.zupassServer,
      LATEST_PRIVACY_NOTICE,
      state.identity
    );
  } else {
    update({
      modal: {
        modalType: "privacy-notice"
      }
    });
  }
}

/**
 * Merge in a PCD collection from an import of backed-up data.
 */
async function mergeImport(
  state: AppState,
  update: ZuUpdate,
  collection: PCDCollection,
  pcdsToMergeIds: Set<PCD["id"]>
) {
  console.log("Merging imported PCD Collection");
  const userHasExistingSemaphoreIdentityPCD =
    state.pcds.getPCDsByType(SemaphoreIdentityPCDTypeName).length > 0;

  const userHasExistingEmailPCD =
    state.pcds.getPCDsByType(EmailPCDTypeName).length > 0;

  const pcdCountBeforeMerge = state.pcds.getAll().length;

  const predicate = (pcd: PCD, target: PCDCollection): boolean => {
    return (
      pcdsToMergeIds.has(pcd.id) &&
      !(pcd.type === EmailPCDTypeName && userHasExistingEmailPCD) &&
      !(isSemaphoreIdentityPCD(pcd) && userHasExistingSemaphoreIdentityPCD) &&
      !(
        isSemaphoreIdentityPCD(pcd) &&
        pcd.claim.identity.getCommitment().toString() !== state.self.commitment
      ) &&
      !target.hasPCDWithId(pcd.id)
    );
  };

  // This async call could mean that another dispatch()'ed event could
  // interfere with app state, including the state we want to change.
  // This risk has been mitigated by not calling the useSyncE2EEStorage
  // hook on ImportBackupScreen.
  const packages = await getPackages();
  const pcds = new PCDCollection(
    packages,
    state.pcds.getAll(),
    state.pcds.folders
  );

  try {
    pcds.merge(collection, {
      shouldInclude: predicate
    });

    update({
      pcds,
      importScreen: {
        imported: pcds.getAll().length - pcdCountBeforeMerge
      }
    });

    console.log(
      `Completed merge ${pcds.getAll().length - pcdCountBeforeMerge} of PCDs`
    );

    await savePCDs(pcds);
  } catch (e) {
    console.log(e);
    update({
      importScreen: {
        error:
          "An unexpected error was encountered when importing your backup. No changes have been made to your account."
      }
    });
  }
}
