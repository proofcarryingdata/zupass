import { PCDCrypto } from "@pcd/passport-crypto";
import {
  applyActions,
  isSyncedEncryptedStorageV2,
  requestCreateNewUser,
  requestDeviceLogin,
  requestLogToServer,
  requestVerifyToken,
  SyncedEncryptedStorage,
  User
} from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
import { SerializedPCD } from "@pcd/pcd-types";
import {
  SemaphoreIdentityPCD,
  SemaphoreIdentityPCDPackage,
  SemaphoreIdentityPCDTypeName
} from "@pcd/semaphore-identity-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { createContext } from "react";
import { appConfig } from "./appConfig";
import { updateStateOnOtherTabs } from "./broadcastChannel";
import { addDefaultSubscriptions } from "./defaultSubscriptions";
import {
  loadEncryptionKey,
  loadSelf,
  saveAnotherDeviceChangedPassword,
  saveEncryptionKey,
  saveIdentity,
  savePCDs,
  saveSelf,
  saveUserInvalid
} from "./localstorage";
import { getPackages } from "./pcdPackages";
import { hasPendingRequest } from "./sessionStorage";
import { AppError, AppState, GetState, StateEmitter } from "./state";
import { sanitizeDateRanges } from "./user";
import { downloadStorage, uploadStorage } from "./useSyncE2EEStorage";
import { assertUnreachable } from "./util";

export type Dispatcher = (action: Action) => void;

export type Action =
  | {
      type: "new-passport";
      email: string;
    }
  | {
      type: "login";
      email: string;
      password: string;
      token: string;
    }
  | {
      type: "verify-token";
      email: string;
      token: string;
    }
  | {
      type: "device-login";
      email: string;
      secret: string;
    }
  | { type: "new-device-login-passport" }
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
      type: "load-from-sync";
      storage: SyncedEncryptedStorage;
      encryptionKey: string;
    }
  | { type: "change-password"; newEncryptionKey: string; newSalt: string }
  | { type: "update-state-from-local-storage" }
  | { type: "add-pcds"; pcds: SerializedPCD[]; upsert?: boolean }
  | { type: "remove-pcd"; id: string }
  | { type: "sync" }
  | { type: "resolve-subscription-error"; subscriptionId: string };

export type StateContextState = {
  getState: GetState;
  stateEmitter: StateEmitter;
  dispatch: Dispatcher;
};
export const StateContext = createContext<StateContextState>({} as any);

export type ZuUpdate = (s: Partial<AppState>) => void;

export async function dispatch(
  action: Action,
  state: AppState,
  update: ZuUpdate
) {
  switch (action.type) {
    case "new-passport":
      return genPassport(state.identity, action.email, update);
    case "login":
      return login(action.email, action.token, action.password, state, update);
    case "verify-token":
      return verifyToken(action.email, action.token, state, update);
    case "device-login":
      return deviceLogin(action.email, action.secret, state, update);
    case "new-device-login-passport":
      return genDeviceLoginPassport(state.identity, update);
    case "set-self":
      return setSelf(action.self, state, update);
    case "error":
      return update({ error: action.error });
    case "clear-error":
      return clearError(state, update);
    case "reset-passport":
      return resetPassport(state);
    case "load-from-sync":
      return loadFromSync(action.encryptionKey, action.storage, state, update);
    case "set-modal":
      return update({
        modal: action.modal
      });
    case "update-state-from-local-storage":
      return updateStateFromLocalStorage(update);
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
  // Show the NewPassportScreen.
  // This will save the sema identity & request email verification.
  update({ pendingAction: { type: "new-passport", email } });
  window.location.hash = "#/new-passport";

  const identityPCD = await SemaphoreIdentityPCDPackage.prove({ identity });
  const pcds = new PCDCollection(await getPackages(), [identityPCD]);

  await savePCDs(pcds);

  update({
    pcds,
    pendingAction: { type: "new-passport", email }
  });
}

async function verifyToken(
  email: string,
  token: string,
  state: AppState,
  update: ZuUpdate
) {
  // For Zupass, skip directly to login as we don't let users set their password
  if (appConfig.isZuzalu) {
    // Password can be empty string for the argon2 KDF. Random salt ensures that
    // this generated key is not less secure than generating a random key.
    return login(email, token, "", state, update);
  }

  const verifyTokenResult = await requestVerifyToken(
    appConfig.passportServer,
    email,
    token
  );

  if (verifyTokenResult.success) {
    window.location.hash = `#/create-password?email=${encodeURIComponent(
      email
    )}&token=${encodeURIComponent(token)}`;
    return;
  }

  update({
    error: {
      title: "Login failed",
      message: verifyTokenResult.error,
      dismissToCurrentPage: true
    }
  });
}

/**
 * Pretty much the same as genPassport, but without screen
 * navigation coupled to the email verification workflow
 */
async function genDeviceLoginPassport(identity: Identity, update: ZuUpdate) {
  const identityPCD = await SemaphoreIdentityPCDPackage.prove({ identity });
  const pcds = new PCDCollection(await getPackages(), [identityPCD]);

  const crypto = await PCDCrypto.newInstance();
  const encryptionKey = await crypto.generateRandomKey();

  await savePCDs(pcds);
  await saveEncryptionKey(encryptionKey);

  update({
    pcds,
    encryptionKey
  });
}

async function login(
  email: string,
  token: string,
  password: string,
  state: AppState,
  update: ZuUpdate
) {
  const crypto = await PCDCrypto.newInstance();
  const { salt: newSalt, key: encryptionKey } =
    await crypto.generateSaltAndArgon2(password);

  await saveEncryptionKey(encryptionKey);

  update({
    encryptionKey
  });

  const newUserResult = await requestCreateNewUser(
    appConfig.passportServer,
    appConfig.isZuzalu,
    email,
    token,
    state.identity.commitment.toString(),
    newSalt
  );

  if (newUserResult.success) {
    return finishLogin(newUserResult.value, state, update);
  }

  update({
    error: {
      title: "Login failed",
      message: "Couldn't log in. " + newUserResult.error,
      dismissToCurrentPage: true
    }
  });
}

async function deviceLogin(
  email: string,
  secret: string,
  state: AppState,
  update: ZuUpdate
) {
  const deviceLoginResult = await requestDeviceLogin(
    appConfig.passportServer,
    email,
    secret,
    state.identity.commitment.toString()
  );

  if (deviceLoginResult.success) {
    return finishLogin(deviceLoginResult.value, state, update);
  }

  update({
    error: {
      title: "Login failed",
      message: "Couldn't log in. " + deviceLoginResult.error,
      dismissToCurrentPage: true
    }
  });
}

/**
 * Runs the first time the user logs in with their email
 */
async function finishLogin(user: User, state: AppState, update: ZuUpdate) {
  // Verify that the identity is correct.
  const { identity } = state;
  console.log("Save self", identity, user);
  if (identity == null || identity.commitment.toString() !== user.commitment) {
    update({
      error: {
        title: "Invalid identity",
        message: "Something went wrong saving your passport. Contact support."
      }
    });
  }

  await addDefaultSubscriptions(identity, state.subscriptions);

  if (hasPendingRequest()) {
    window.location.hash = "#/login-interstitial";
  } else {
    window.location.hash = "#/";
  }

  // Save to local storage.
  setSelf(user, state, update);

  // Save PCDs to E2EE storage.
  await uploadStorage();

  // If on Zupass legacy login, ask user to save their Sync Key
  if (appConfig.isZuzalu) {
    update({ modal: "save-sync" });
  }
}

// Runs periodically, whenever we poll new participant info and when we broadcast state updates.
async function setSelf(self: User, state: AppState, update: ZuUpdate) {
  let userMismatched = false;
  let hasChangedPassword = false;

  if (state.self && self.salt !== state.self.salt) {
    // If the password has been changed on a different device, the salts will mismatch
    console.log("User salt mismatch");
    hasChangedPassword = true;
    requestLogToServer(
      appConfig.passportServer,
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
    requestLogToServer(appConfig.passportServer, "invalid-user", {
      oldCommitment: state.identity.commitment.toString(),
      newCommitment: self.commitment.toString()
    });
  } else if (state.self && state.self.uuid !== self.uuid) {
    console.log("User UUID mismatch");
    userMismatched = true;
    requestLogToServer(appConfig.passportServer, "invalid-user", {
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

  if (self.visitor_date_ranges) {
    self.visitor_date_ranges = sanitizeDateRanges(self.visitor_date_ranges);
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

async function resetPassport(state: AppState) {
  await requestLogToServer(appConfig.passportServer, "logout", {
    uuid: state.self?.uuid,
    email: state.self?.email,
    commitment: state.self?.commitment
  });
  // Clear saved state.
  window.localStorage.clear();
  // Reload to clear in-memory state.
  window.location.hash = "#/";
  window.location.reload();
}

async function addPCDs(
  state: AppState,
  update: ZuUpdate,
  pcds: SerializedPCD[],
  upsert?: boolean
) {
  await state.pcds.deserializeAllAndAdd(pcds, { upsert });
  await savePCDs(state.pcds);
  update({ pcds: state.pcds });
}

async function removePCD(state: AppState, update: ZuUpdate, pcdId: string) {
  state.pcds.remove(pcdId);
  await savePCDs(state.pcds);
  update({ pcds: state.pcds });
}

async function loadFromSync(
  encryptionKey: string,
  storage: SyncedEncryptedStorage,
  currentState: AppState,
  update: ZuUpdate
) {
  let pcds: PCDCollection;

  if (isSyncedEncryptedStorageV2(storage)) {
    pcds = await PCDCollection.deserialize(await getPackages(), storage.pcds);
  } else {
    pcds = await new PCDCollection(await getPackages());
    await pcds.deserializeAllAndAdd(storage.pcds);
  }

  // assumes that we only have one semaphore identity in the passport.
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
    self: storage.self
  });

  console.log("Loaded from sync key, redirecting to home screen...");
  window.localStorage["savedSyncKey"] = "true";
  if (hasPendingRequest()) {
    window.location.hash = "#/login-interstitial";
  } else {
    window.location.hash = "#/";
  }
}

// Update `self` and `encryptionKey` in-memory fields from their saved values in localStorage
async function updateStateFromLocalStorage(update: ZuUpdate) {
  const self = loadSelf();
  const encryptionKey = loadEncryptionKey();
  return update({
    self,
    encryptionKey
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
  updateStateOnOtherTabs();
  return update({
    encryptionKey: newEncryptionKey,
    self: newSelf
  });
}

function userInvalid(update: ZuUpdate) {
  saveUserInvalid(true);
  update({
    userInvalid: true,
    modal: "invalid-participant"
  });
}

function anotherDeviceChangedPassword(update: ZuUpdate) {
  saveAnotherDeviceChangedPassword(true);
  update({
    anotherDeviceChangedPassword: true,
    modal: "another-device-changed-password"
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
 *   in the passport does not equal the downloaded set, and if the
 *   passport is not currently uploading the current set of PCDs
 *   to e2ee, then uploads then to e2ee.
 */
async function sync(state: AppState, update: ZuUpdate) {
  if (loadEncryptionKey() == null) {
    console.log("[SYNC] no encryption key, can't sync");
    return;
  }

  if (!state.downloadedPCDs && !state.downloadingPCDs) {
    console.log("[SYNC] sync action: download");
    update({
      downloadingPCDs: true
    });

    const pcds = await downloadStorage();

    if (pcds != null) {
      update({
        downloadedPCDs: true,
        downloadingPCDs: false,
        pcds: pcds,
        uploadedUploadId: await pcds.getHash()
      });
    } else {
      console.log(`[SYNC] skipping download`);
      update({
        downloadedPCDs: true,
        downloadingPCDs: false
      });
    }

    return;
  }

  if (state.downloadingPCDs || !state.downloadedPCDs) {
    return;
  }

  if (
    !appConfig.isZuzalu &&
    !state.loadedIssuedPCDs &&
    !state.loadingIssuedPCDs
  ) {
    update({
      loadingIssuedPCDs: true
    });

    try {
      console.log("[SYNC] loading issued pcds");
      console.log(
        "[SYNC] active subscriptions",
        state.subscriptions.getActiveSubscriptions()
      );
      const actions = await state.subscriptions.pollSubscriptions();

      await applyActions(state.pcds, actions);
      await savePCDs(state.pcds);
      console.log("[SYNC] loaded and saved issued pcds");
    } catch (e) {
      console.log(`[SYNC] failed to load issued PCDs, skipping this step`, e);
    }

    update({
      loadingIssuedPCDs: false,
      loadedIssuedPCDs: true,
      pcds: state.pcds
    });
    return;
  }

  if (
    !appConfig.isZuzalu &&
    !state.loadedIssuedPCDs &&
    state.loadingIssuedPCDs
  ) {
    return;
  }

  const uploadId = await state.pcds.getHash();

  if (
    state.uploadedUploadId === uploadId ||
    state.uploadingUploadId === uploadId
  ) {
    console.log("[SYNC] sync action: no-op");
    return;
  }

  console.log("[SYNC] sync action: upload");
  update({
    uploadingUploadId: uploadId
  });
  await uploadStorage();
  update({
    uploadingUploadId: undefined,
    uploadedUploadId: uploadId
  });
}

async function resolveSubscriptionError(
  _state: AppState,
  update: ZuUpdate,
  subscriptionId: string
) {
  update({
    resolvingSubscriptionId: subscriptionId,
    modal: "resolve-subscription-error"
  });
}
