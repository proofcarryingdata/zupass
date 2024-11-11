import { Zapp } from "@parcnet-js/client-rpc";
import { isEdDSATicketPCD } from "@pcd/eddsa-ticket-pcd";
import { EmailPCDTypeName } from "@pcd/email-pcd";
import { PCDCrypto } from "@pcd/passport-crypto";
import {
  agreeTerms,
  applyActions,
  CredentialManager,
  deserializeStorage,
  Feed,
  FeedSubscriptionManager,
  getNamedAPIErrorMessage,
  LATEST_PRIVACY_NOTICE,
  makeUpgradeUserWithV4CommitmentRequest,
  NetworkFeedApi,
  requestCreateNewUser,
  requestDeleteAccount,
  requestDownloadAndDecryptStorage,
  requestLogToServer,
  requestOneClickLogin,
  requestUpgradeUserWithV4Commitment,
  requestUser,
  serializeStorage,
  StorageWithRevision,
  SubscriptionActions,
  User,
  zupassDefaultSubscriptions,
  ZupassFeedIds
} from "@pcd/passport-interface";
import { PCDCollection, PCDPermission } from "@pcd/pcd-collection";
import { ArgumentTypeName, PCD, SerializedPCD } from "@pcd/pcd-types";
import { encodePrivateKey, podEntriesToJSON } from "@pcd/pod";
import { PODPCD, PODPCDPackage } from "@pcd/pod-pcd";
import { isPODTicketPCD } from "@pcd/pod-ticket-pcd";
import {
  isSemaphoreIdentityPCD,
  SemaphoreIdentityPCDPackage,
  SemaphoreIdentityPCDTypeName,
  v3tov4Identity,
  v4PublicKey
} from "@pcd/semaphore-identity-pcd";
import { assertUnreachable, sleep } from "@pcd/util";
import { Identity } from "@semaphore-protocol/identity";
import _ from "lodash";
import { createContext } from "react";
import { appConfig } from "./appConfig";
import {
  notifyLoginToOtherTabs,
  notifyLogoutToOtherTabs,
  notifyPasswordChangeToOtherTabs
} from "./broadcastChannel";
import {
  addDefaultSubscriptions,
  addZupassProvider,
  ZUPASS_FEED_URL
} from "./defaultSubscriptions";
import { EmbeddedScreenState } from "./embedded";
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
import { fallbackDeserializeFunction, getPackages } from "./pcdPackages";
import { hasPendingRequest } from "./sessionStorage";
import { AppError, AppState, GetState, StateEmitter } from "./state";
import { findUserIdentityPCD } from "./user";
import {
  downloadAndMergeStorage,
  uploadSerializedStorage,
  uploadStorage
} from "./useSyncE2EEStorage";
import { ADD_PCD_SIZE_LIMIT_BYTES, stringSizeInBytes } from "./util";
import { validateAndLogRunningAppState } from "./validateState";

export type Dispatcher = (action: Action) => Promise<void>;

export type Action =
  | {
      type: "new-passport";
      email: string;
    }
  | {
      type: "create-user-skip-password";
      email: string;
      token: string;
      /** If autoRegister is "true", Zupass will attempt to automatically register an account */
      autoRegister: boolean;
      /** Zupass will attempt to automatically direct a user to targetFolder on registration */
      targetFolder: string | undefined | null;
    }
  | {
      type: "login";
      email: string;
      password: string;
      token: string;
    }
  | {
      type: "one-click-login";
      email: string;
      code: string;
      targetFolder: string | undefined | null;
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
      type: "set-bottom-modal";
      modal: AppState["bottomModal"];
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
      redirectTo?: string;
    }
  | { type: "participant-invalid" }
  | {
      type: "load-after-login";
      storage: StorageWithRevision;
      encryptionKey: string;
    }
  | { type: "change-password"; newEncryptionKey: string; newSalt: string }
  | { type: "password-change-on-other-tab" }
  | {
      type: "add-pcds";
      pcds: SerializedPCD[];
      upsert?: boolean;
      folder?: string;
    }
  | { type: "remove-pcd"; id: string }
  | { type: "remove-all-pcds-in-folder"; folder: string }
  | { type: "sync" }
  | { type: "resolve-subscription-error"; subscriptionId: string }
  | {
      type: "add-subscription";
      providerUrl: string;
      providerName: string;
      feed: Feed;
    }
  | {
      type: "remove-subscription";
      subscriptionId: string;
      deleteContents?: boolean;
    }
  | {
      type: "update-subscription-permissions";
      subscriptionId: string;
      permissions: PCDPermission[];
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
      onSuccess?: () => void;
      onError?: (e: Error) => void;
    }
  | {
      type: "merge-import";
      collection: PCDCollection;
      pcdsToMergeIds: Set<PCD["id"]>;
    }
  | { type: "delete-account" }
  | {
      type: "show-embedded-screen";
      screen: EmbeddedScreenState["screen"];
    }
  | {
      type: "hide-embedded-screen";
    }
  | {
      type: "zapp-connect";
      zapp: Zapp;
      origin: string;
    }
  | {
      type: "pauseSync";
      value: boolean;
    }
  | {
      type: "zapp-approval";
      approved: boolean;
    }
  | {
      type: "scroll-to-ticket";
      scrollTo:
        | {
            attendee: string;
            eventId: string;
          }
        | undefined;
    }
  | { type: "prove-state"; eligible: boolean }
  | { type: "reset-prove-state" }
  | { type: "zapp-cancel-connect" };

export type StateContextValue = {
  getState: GetState;
  stateEmitter: StateEmitter;
  dispatch: Dispatcher;
  update: ZuUpdate;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const StateContext = createContext<StateContextValue>({} as any);

export type ZuUpdate = (s: Partial<AppState>) => void;

export async function dispatch(
  action: Action,
  state: AppState,
  update: ZuUpdate
): Promise<void> {
  switch (action.type) {
    case "pauseSync":
      update({ pauseSync: action.value });
      break;
    case "new-passport":
      return genPassport(state.identityV3, action.email, update);
    case "create-user-skip-password":
      return createNewUserSkipPassword(
        action.email,
        action.token,
        action.targetFolder,
        action.autoRegister,
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
    case "one-click-login":
      return oneClickLogin(
        action.email,
        action.code,
        action.targetFolder,
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
      return resetPassport(action.redirectTo, state, update);
    case "load-after-login":
      return loadAfterLogin(action.encryptionKey, action.storage, update);
    case "set-modal":
      return update({
        modal: action.modal
      });
    case "set-bottom-modal":
      return update({
        bottomModal: action.modal
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
      return addPCDs(state, update, action.pcds, action.upsert, action.folder);
    case "remove-pcd":
      return removePCD(state, update, action.id);
    case "remove-all-pcds-in-folder":
      return removeAllPCDsInFolder(state, update, action.folder);
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
      return removeSubscription(
        state,
        update,
        action.subscriptionId,
        action.deleteContents
      );
    case "update-subscription-permissions":
      return updateSubscriptionPermissions(
        state,
        update,
        action.subscriptionId,
        action.permissions
      );
    case "handle-agreed-privacy-notice":
      return handleAgreedPrivacyNotice(state, action.version);
    case "prompt-to-agree-privacy-notice":
      return promptToAgreePrivacyNotice(state);
    case "sync-subscription":
      return syncSubscription(
        state,
        update,
        action.subscriptionId,
        action.onSuccess,
        action.onError
      );
    case "merge-import":
      return mergeImport(
        state,
        update,
        action.collection,
        action.pcdsToMergeIds
      );
    case "delete-account":
      return deleteAccount(state, update);
    case "show-embedded-screen":
      return showEmbeddedScreen(state, update, action.screen);
    case "hide-embedded-screen":
      return hideEmbeddedScreen(state, update);
    case "zapp-connect":
      return zappConnect(state, update, action.zapp, action.origin);
    case "zapp-approval":
      return zappApproval(state, update, action.approved);
    case "scroll-to-ticket":
      const { scrollTo } = action;
      update({ scrollTo });
      return;
    case "prove-state":
      console.log(action);
      const newList = state.proveStateEligiblePCDs ?? [];
      newList.push(action.eligible);
      update({
        proveStateEligiblePCDs: newList
      });
      return;
    case "reset-prove-state":
      update({ proveStateEligiblePCDs: undefined });
      return;
    case "zapp-cancel-connect":
      update({ zappApproved: false });
      return;
    default:
      // We can ensure that we never get here using the type system
      return assertUnreachable(action);
  }
}

async function genPassport(
  identityV3: Identity,
  email: string,
  update: ZuUpdate
): Promise<void> {
  const identityPCD = await SemaphoreIdentityPCDPackage.prove({ identityV3 });
  const pcds = new PCDCollection(await getPackages(), [identityPCD]);

  await savePCDs(pcds);
  update({ pcds });

  const route = "#/new-passport";
  window.location.hash = `${route}?email=` + encodeURIComponent(email);
}

async function oneClickLogin(
  email: string,
  code: string,
  targetFolder: string | undefined | null,
  state: AppState,
  update: ZuUpdate
): Promise<void> {
  if (state.self) throw new Error("User is already logged in");

  update({
    modal: { modalType: "none" }
  });

  // Because we skip the genPassword() step of setting the initial PCDs
  // in the one-click flow, we'll need to do it here.
  const identityPCD = await SemaphoreIdentityPCDPackage.prove({
    identityV3: state.identityV3
  });
  const pcds = new PCDCollection(await getPackages(), [identityPCD]);

  await savePCDs(pcds);
  update({ pcds });

  const crypto = await PCDCrypto.newInstance();
  const encryptionKey = crypto.generateRandomKey();
  saveEncryptionKey(encryptionKey);

  update({
    encryptionKey
  });

  const oneClickLoginResult = await requestOneClickLogin(
    appConfig.zupassServer,
    email,
    code,
    state.identityV3.commitment.toString(),
    v4PublicKey(identityPCD.claim.identityV4),
    encryptionKey
  );

  if (oneClickLoginResult.success) {
    // New user
    if (oneClickLoginResult.value.isNewUser) {
      return finishAccountCreation(
        oneClickLoginResult.value.zupassUser,
        state,
        update,
        targetFolder
      );
    }

    // User has encryption key
    if (oneClickLoginResult.value.encryptionKey) {
      saveEncryptionKey(oneClickLoginResult.value.encryptionKey);
      update({
        encryptionKey: oneClickLoginResult.value.encryptionKey
      });
      const storageResult = await requestDownloadAndDecryptStorage(
        appConfig.zupassServer,
        oneClickLoginResult.value.encryptionKey
      );
      if (storageResult.success) {
        return loadAfterLogin(
          oneClickLoginResult.value.encryptionKey,
          storageResult.value,
          update
        );
      }

      return update({
        error: {
          title: "An error occurred while downloading encrypted storage",
          message: `An error occurred while downloading encrypted storage [
                ${getNamedAPIErrorMessage(
                  storageResult.error
                )}].  If this persists, contact support@zupass.org.`
        }
      });
    }

    const base = "#";
    // Account has password - direct to enter password
    window.location.hash =
      base + "/new-passport?email=" + encodeURIComponent(email);
    return;
  }

  // Error - didn't match
  update({
    error: {
      title: "Zupass error occurred",
      message: oneClickLoginResult.error
    }
  });
}

async function createNewUserSkipPassword(
  email: string,
  token: string,
  targetFolder: string | undefined | null,
  autoRegister: boolean,
  state: AppState,
  update: ZuUpdate
): Promise<void> {
  update({
    modal: { modalType: "none" }
  });

  // Because we skip the genPassword() step of setting the initial PCDs
  // in the one-click flow, we'll need to do it here.
  if (autoRegister) {
    const identityPCD = await SemaphoreIdentityPCDPackage.prove({
      identityV3: state.identityV3
    });
    const pcds = new PCDCollection(await getPackages(), [identityPCD]);

    await savePCDs(pcds);
    update({ pcds });
  }

  const crypto = await PCDCrypto.newInstance();
  const encryptionKey = crypto.generateRandomKey();
  saveEncryptionKey(encryptionKey);

  update({
    encryptionKey
  });

  const newUserResult = await requestCreateNewUser(
    appConfig.zupassServer,
    email,
    token,
    state.identityV3.commitment.toString(),
    v4PublicKey(v3tov4Identity(state.identityV3)),
    undefined,
    encryptionKey,
    autoRegister
  );

  if (newUserResult.success) {
    return finishAccountCreation(
      newUserResult.value,
      state,
      update,
      targetFolder
    );
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
): Promise<void> {
  const crypto = await PCDCrypto.newInstance();
  const { salt: newSalt, key: encryptionKey } =
    crypto.generateSaltAndEncryptionKey(password);

  saveEncryptionKey(encryptionKey);

  update({
    encryptionKey
  });

  const newUserResult = await requestCreateNewUser(
    appConfig.zupassServer,
    email,
    token,
    state.identityV3.commitment.toString(),
    v4PublicKey(v3tov4Identity(state.identityV3)),
    newSalt,
    undefined,
    undefined
  );

  if (newUserResult.success) {
    return finishAccountCreation(newUserResult.value, state, update, undefined);
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
  update: ZuUpdate,
  targetFolder?: string | null
): Promise<void> {
  // Verify that the identity is correct.
  if (
    !validateAndLogRunningAppState(
      "finishAccountCreation",
      user,
      state.identityV3,
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

  const subscriptions = new FeedSubscriptionManager(new NetworkFeedApi());
  addZupassProvider(subscriptions);
  const emailSub = await subscriptions.subscribe(
    ZUPASS_FEED_URL,
    zupassDefaultSubscriptions[ZupassFeedIds.Email]
  );

  const actions = await subscriptions.pollSingleSubscription(
    emailSub,
    new CredentialManager(state.identityV3, state.pcds, new Map())
  );
  await applyActions(state.pcds, actions);

  await savePCDs(state.pcds);
  await saveSubscriptions(subscriptions);

  update({ pcds: state.pcds, subscriptions });

  // Save PCDs to E2EE storage.  knownRevision=undefined is the way to create
  // a new entry.  It would also overwrite any conflicting data which may
  // already exist, but that should be impossible for a new account with
  // a new encryption key.
  console.log("[ACCOUNT] Upload initial PCDs");
  const uploadResult = await uploadStorage(
    user,
    state.identityV3,
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
    userInvalid(update);
    return;
  }

  // Save user to local storage.  This is done last because it unblocks
  // background sync, which is best delayed until after the upload above.
  console.log("[ACCOUNT] Save self");
  await setSelf(user, state, update);

  // Account creation is complete.  Close any existing modal, and redirect
  // user if they were in the middle of something.
  update({ modal: { modalType: "none" } });

  const baseRoute = "#/";
  if (hasPendingRequest()) {
    window.location.hash = `${baseRoute}login-interstitial`;
  } else {
    window.location.hash = targetFolder
      ? `${baseRoute}?folder=${encodeURIComponent(targetFolder)}`
      : baseRoute;
  }
}

// Runs periodically, whenever we poll new participant info and when we broadcast state updates.
async function setSelf(
  self: User,
  state: AppState,
  update: ZuUpdate
): Promise<void> {
  let userMismatched = false;
  let hasChangedPassword = false;

  if (state.self && self.salt !== state.self.salt) {
    // If the password has been changed on a different device, the salts will mismatch
    console.log("User salt mismatch");
    hasChangedPassword = true;
    requestLogToServer(
      appConfig.zupassServer,
      "another-device-changed-password",
      {
        oldSalt: state.self.salt,
        newSalt: self.salt,
        emails: self.emails
      }
    );
  } else if (
    BigInt(self.commitment).toString() !==
    state.identityV3.commitment.toString()
  ) {
    console.log("Identity commitment mismatch");
    userMismatched = true;
    requestLogToServer(appConfig.zupassServer, "invalid-user", {
      oldCommitment: state.identityV3.commitment.toString(),
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

function clearError(state: AppState, update: ZuUpdate): void {
  if (!state.error?.dismissToCurrentPage) {
    window.location.hash = "#/";
  }
  update({ error: undefined });
}

async function resetPassport(
  redirectTo: string | undefined,
  state: AppState,
  update: ZuUpdate
): Promise<void> {
  requestLogToServer(appConfig.zupassServer, "logout", {
    uuid: state.self?.uuid,
    emails: state.self?.emails,
    commitment: state.self?.commitment
  });
  // Clear saved state.
  window.localStorage.clear();
  // Clear in-memory state
  update({
    self: undefined,
    loggingOut: true,
    modal: {
      modalType: "none"
    }
  });

  setTimeout(() => {
    if (window.location.href === redirectTo) {
      window.location.reload();
    } else {
      window.location.href = redirectTo ?? "/";
    }
  }, 1);

  notifyLogoutToOtherTabs();
}

async function addPCDs(
  state: AppState,
  update: ZuUpdate,
  pcds: SerializedPCD[],
  upsert?: boolean,
  folder?: string
): Promise<void> {
  for (const serializedPCD of pcds) {
    const bytes = stringSizeInBytes(serializedPCD.pcd);
    if (bytes > ADD_PCD_SIZE_LIMIT_BYTES) {
      throw new Error(
        `PCD is too large to add.` +
          ` ${bytes} > ${ADD_PCD_SIZE_LIMIT_BYTES} bytes`
      );
    }
  }
  const deserializedPCDs = await state.pcds.deserializeAll(pcds);
  state.pcds.addAll(deserializedPCDs, { upsert });
  if (folder !== undefined) {
    state.pcds.bulkSetFolder(
      deserializedPCDs.map((pcd) => pcd.id),
      folder
    );
  }
  await savePCDs(state.pcds);
  update({ pcds: state.pcds });
}

async function removePCD(
  state: AppState,
  update: ZuUpdate,
  pcdId: string
): Promise<void> {
  const pcd = state.pcds.getById(pcdId);
  if (pcd && isEdDSATicketPCD(pcd)) {
    // EdDSATicketPCDs are currently duplicated as PODTicketPCDs. Since
    // PODTicketPCDs are hidden, they cannot be removed via the UI. IF an
    // EdDSATicketPCD is remove but its counterpart PODTicketPCD is not, then
    // the folder containing them both will remain but will appear to be empty,
    // as it only contains the PODTicketPCD.
    // Therefore, when removing the EdDSATicketPCD, we should check to see if
    // there is a matching PODTicketPCD, and remove that too.
    const folder = state.pcds.getFolderOfPCD(pcdId);
    if (folder) {
      const otherPCDsInFolder = state.pcds.getAllPCDsInFolder(folder);
      for (const otherPCD of otherPCDsInFolder) {
        if (
          isPODTicketPCD(otherPCD) &&
          // Check for the same ticket ID
          otherPCD.claim.ticket.ticketId === pcd.claim.ticket.ticketId
        ) {
          // Remove the PODTicketPCD
          state.pcds.remove(otherPCD.id);
          break;
        }
      }
    }
  }
  state.pcds.remove(pcdId);
  await savePCDs(state.pcds);
  update({ pcds: state.pcds });
}

async function loadAfterLogin(
  encryptionKey: string,
  storage: StorageWithRevision,
  update: ZuUpdate
): Promise<void> {
  const { pcds, subscriptions, storageHash } = await deserializeStorage(
    storage.storage,
    await getPackages(),
    fallbackDeserializeFunction
  );

  // Poll the latest user stored from the database rather than using the `self` object from e2ee storage.
  const userResponse = await requestUser(
    appConfig.zupassServer,
    storage.storage.self.uuid
  );
  if (!userResponse.success) {
    throw new Error(userResponse.error.errorMessage);
  }
  let self: User = userResponse.value;
  if (!self) {
    throw new Error("No User returned by server.");
  }

  // Validate stored state against the user response.
  const identityPCD = findUserIdentityPCD(pcds, userResponse.value);
  if (
    !validateAndLogRunningAppState(
      "loadAfterLogin",
      userResponse.value,
      identityPCD?.claim?.identityV3,
      pcds
    )
  ) {
    userInvalid(update);
    return;
  }
  if (!identityPCD) {
    // Validation should've caught this, but the compiler doesn't know that.
    console.error("No identity PCD found in encrypted storage.");
    userInvalid(update);
    return;
  }

  // prior to the introduction of semaphore v4, users didn't have a v4 identity.
  // the v4 identity is generated deterministically from the v3 identity. this case
  // explicitly handles the situation when a user who had an account prior to the
  // introduction of semaphore v4 logs in. in that case, we upgrade their account.
  if (!self.semaphore_v4_commitment || !self.semaphore_v4_pubkey) {
    await requestUpgradeUserWithV4Commitment(
      appConfig.zupassServer,
      await makeUpgradeUserWithV4CommitmentRequest(pcds)
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

  const modal: AppState["modal"] = { modalType: "none" };
  console.log(`[SYNC] saving state at login: revision ${storage.revision}`);
  await savePCDs(pcds);
  await saveSubscriptions(subscriptions);
  savePersistentSyncStatus({
    serverStorageRevision: storage.revision,
    serverStorageHash: storageHash
  });
  saveEncryptionKey(encryptionKey);
  saveSelf(self);
  saveIdentity(identityPCD.claim.identityV3);

  update({
    encryptionKey,
    pcds,
    subscriptions,
    serverStorageRevision: storage.revision,
    serverStorageHash: storageHash,
    identityV3: identityPCD.claim.identityV3,
    self,
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
async function handlePasswordChangeOnOtherTab(update: ZuUpdate): Promise<void> {
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
): Promise<void> {
  if (state.self) {
    const newSelf = { ...state.self, salt: newSalt };
    saveSelf(newSelf);
    saveEncryptionKey(newEncryptionKey);
    notifyPasswordChangeToOtherTabs();
    update({
      encryptionKey: newEncryptionKey,
      self: newSelf
    });
  }
}

function userInvalid(update: ZuUpdate): void {
  console.log("user is invalid");
  update({
    userInvalid: true,
    modal: { modalType: "invalid-participant" },
    bottomModal: { modalType: "invalid-participant" }
  });
}

function anotherDeviceChangedPassword(update: ZuUpdate): void {
  update({
    anotherDeviceChangedPassword: true,
    modal: { modalType: "another-device-changed-password" },
    bottomModal: { modalType: "another-device-changed-password" }
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
async function sync(state: AppState, update: ZuUpdate): Promise<void> {
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
  if (!loadEncryptionKey()) {
    console.log("[SYNC] no encryption key, can't sync");
    return undefined;
  }
  if (state.userInvalid) {
    console.log("[SYNC] userInvalid=true, exiting sync");
    return undefined;
  }
  if (state.loggingOut || state.deletingAccount) {
    console.log("[SYNC] logging out or deleting account, exiting sync");
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
      state.identityV3,
      state.pcds,
      state.subscriptions
    );
    if (dlRes.success && dlRes.value) {
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
    // TODO (for follow-up): Updated loading indicator (loading bar?)
    update({ loadingIssuedPCDs: true });
    try {
      console.log("[SYNC] loading issued pcds");
      await addDefaultSubscriptions(state.subscriptions);
      console.log(
        "[SYNC] active subscriptions",
        state.subscriptions.getActiveSubscriptions()
      );
      const credentialManager = new CredentialManager(
        state.identityV3,
        state.pcds,
        state.credentialCache
      );
      console.log("[SYNC] initalized credentialManager", credentialManager);

      const stats = { nActions: 0, nFeeds: 0 };
      const onSubscriptionResult = async (
        actions: SubscriptionActions
      ): Promise<void> => {
        await applyActions(state.pcds, [actions]);
        await savePCDs(state.pcds);
        await saveSubscriptions(state.subscriptions);
        stats.nActions += actions.actions.length;
        stats.nFeeds++;
      };

      // first, always poll the email feed
      await state.subscriptions.pollEmailSubscription(
        ZUPASS_FEED_URL,
        credentialManager,
        onSubscriptionResult
      );

      // then, poll everything *except* the email feed
      const subscriptionActions = await state.subscriptions.pollSubscriptions(
        credentialManager,
        onSubscriptionResult,
        state.subscriptions
          .getActiveSubscriptions()
          .filter(
            (s) =>
              s.id !==
              state.subscriptions.findSubscription(
                ZUPASS_FEED_URL,
                ZupassFeedIds.Email
              )?.id
          )
          .map((s) => s.id)
      );

      console.log(
        `[SYNC] Applied ${stats.nActions} actions from ` +
          `${subscriptionActions.length}/${
            state.subscriptions.getActiveSubscriptions().length
          } feeds`
      );
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

    const credentialManager = new CredentialManager(
      state.identityV3,
      state.pcds,
      state.credentialCache
    );
    const credential = await credentialManager.requestCredential({
      signatureType: "sempahore-signature-pcd"
    });

    const upRes = await uploadSerializedStorage(
      state.self,
      state.identityV3,
      state.pcds,
      appStorage.serializedStorage,
      appStorage.storageHash,
      state.serverStorageRevision,
      credential
    );

    if (upRes.success) {
      return {
        serverStorageRevision: upRes.value.revision,
        serverStorageHash: upRes.value.storageHash
      };
    } else {
      if (upRes.error.name === "ValidationError") {
        // early return on upload validation error; this doesn't cause upload
        // loop b/c there is an even earlier early return that exits the sync
        // code in the case that the userInvalid flag is set
        userInvalid(update);
        return;
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
): Promise<void> {
  try {
    console.log("[SYNC] loading pcds from subscription", subscriptionId);
    const subscription = state.subscriptions.getSubscription(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }
    const credentialManager = new CredentialManager(
      state.identityV3,
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
    if (e instanceof Error) {
      onError?.(e);
    }
    console.log(`[SYNC] failed to load issued PCDs, skipping this step`, e);
  }
}

async function resolveSubscriptionError(
  _state: AppState,
  update: ZuUpdate,
  subscriptionId: string
): Promise<void> {
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
): Promise<void> {
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
  subscriptionId: string,
  deleteContents?: boolean
): Promise<void> {
  const existingSubscription =
    state.subscriptions.getSubscription(subscriptionId);

  state.subscriptions.unsubscribe(subscriptionId);
  await saveSubscriptions(state.subscriptions);

  if (deleteContents) {
    const subscriptionFolders = existingSubscription
      ? _.uniq(existingSubscription.feed.permissions.map((p) => p.folder)).sort(
          (a, b) => a.localeCompare(b)
        )
      : [];

    for (const [_, folder] of Object.entries(state.pcds.folders)) {
      for (const subFolder of subscriptionFolders) {
        if (folder.startsWith(subFolder)) {
          state.pcds.removeAllPCDsInFolder(folder);
        }
      }
    }
  }

  await savePCDs(state.pcds);

  update({
    subscriptions: state.subscriptions,
    pcds: state.pcds
  });
}

async function updateSubscriptionPermissions(
  state: AppState,
  update: ZuUpdate,
  subscriptionId: string,
  permisisons: PCDPermission[]
): Promise<void> {
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

/**
 * After the user has agreed to the terms, save the updated user record, set
 * `loadedIssuedPCDs` to false in order to prompt a feed refresh, and dismiss
 * the "legal terms" modal.
 */
async function handleAgreedPrivacyNotice(
  state: AppState,
  version: number
): Promise<void> {
  if (state.self) {
    saveSelf({ ...state.self, terms_agreed: version });
    window.location.hash = "#/";
  }
}

/**
 * If the `user` object doesn't indicate that the user has agreed to the
 * latest terms, check local storage in case they've agreed but we failed
 * to sync it. If so, sync to server. If not, prompt user with an
 * un-dismissable modal.
 */
async function promptToAgreePrivacyNotice(state: AppState): Promise<void> {
  const cachedTerms = loadPrivacyNoticeAgreed();
  if (cachedTerms === LATEST_PRIVACY_NOTICE) {
    // sync to server
    await agreeTerms(
      appConfig.zupassServer,
      LATEST_PRIVACY_NOTICE,
      state.identityV3
    );
  } else {
    // on new ui this is not a modal
    window.location.hash = "#/updated-terms";
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
): Promise<void> {
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
        pcd.claim.identityV3.getCommitment().toString() !==
          state.self?.commitment
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

async function removeAllPCDsInFolder(
  state: AppState,
  update: ZuUpdate,
  folder: string
): Promise<void> {
  state.pcds.removeAllPCDsInFolder(folder);
  await savePCDs(state.pcds);
  update({ pcds: state.pcds });
  window.scrollTo({ top: 0 });
}

async function deleteAccount(state: AppState, update: ZuUpdate): Promise<void> {
  update({
    deletingAccount: true,
    modal: {
      modalType: "none"
    }
  });

  await sleep(2000);

  const credentialManager = new CredentialManager(
    state.identityV3,
    state.pcds,
    state.credentialCache
  );

  const pcd = await credentialManager.requestCredential({
    signatureType: "sempahore-signature-pcd"
  });

  const res = await requestDeleteAccount(appConfig.zupassServer, { pcd });

  if (res.success) {
    resetPassport(undefined, state, update);
    update({ deletingAccount: false });
  } else {
    alert(`Error deleting account: ${res.error}`);
  }
}

async function showEmbeddedScreen(
  state: AppState,
  update: ZuUpdate,
  screen: EmbeddedScreenState["screen"]
): Promise<void> {
  if (window.parent !== window.self) {
    window.location.hash = "embedded";
  }
  update({
    embeddedScreen: { screen }
  });
}

async function hideEmbeddedScreen(
  state: AppState,
  update: ZuUpdate
): Promise<void> {
  update({
    embeddedScreen: undefined
  });
}

async function zappConnect(
  state: AppState,
  update: ZuUpdate,
  zapp: Zapp,
  origin: string
): Promise<void> {
  update({
    zappOrigin: origin,
    connectedZapp: zapp
  });
}

async function zappApproval(
  state: AppState,
  update: ZuUpdate,
  approved: boolean
): Promise<void> {
  const zapp = state.connectedZapp;
  if (!zapp || !state.zappOrigin) {
    return;
  }
  if (approved) {
    const newZapp = (await PODPCDPackage.prove({
      entries: {
        argumentType: ArgumentTypeName.Object,
        value: podEntriesToJSON({
          origin: { type: "string", value: state.zappOrigin },
          name: { type: "string", value: zapp.name },
          permissions: {
            type: "string",
            value: JSON.stringify(zapp.permissions)
          }
        })
      },
      privateKey: {
        argumentType: ArgumentTypeName.String,
        value: encodePrivateKey(
          Buffer.from(v3tov4Identity(state.identityV3).export(), "base64")
        )
      },
      id: {
        argumentType: ArgumentTypeName.String,
        value: `zapp-${zapp.name}-${state.zappOrigin}`
      }
    })) as PODPCD;

    const newZappSerialized = await PODPCDPackage.serialize(newZapp);
    update({ zappApproved: true });
    return addPCDs(state, update, [newZappSerialized], true, "Zapps");
  } else {
    update({ zappApproved: false });
  }
}
