import { getHash, passportEncrypt } from "@pcd/passport-crypto";
import {
  APIResult,
  ChangeBlobKeyError,
  FeedSubscriptionManager,
  NamedAPIError,
  SyncedEncryptedStorage,
  User,
  ZupassUserJson,
  deserializeStorage,
  requestChangeBlobKey,
  requestDownloadAndDecryptUpdatedStorage,
  requestLogToServer,
  requestUploadEncryptedStorage,
  serializeStorage
} from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
import { PCD, SerializedPCD } from "@pcd/pcd-types";
import { IdentityV3 } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCD } from "@pcd/semaphore-signature-pcd";
import stringify from "fast-json-stable-stringify";
import { useCallback, useContext, useEffect } from "react";
import { appConfig } from "./appConfig";
import { StateContext } from "./dispatch";
import {
  loadEncryptionKey,
  loadPCDs,
  loadSelf,
  loadSubscriptions,
  savePCDs,
  savePersistentSyncStatus,
  saveSubscriptions
} from "./localstorage";
import { fallbackDeserializeFunction, getPackages } from "./pcdPackages";
import { useOnStateChange } from "./subscribe";
import { validateAndLogRunningAppState } from "./validateState";
import { useCanSync } from "./appHooks";

export type UpdateBlobKeyStorageInfo = {
  revision: string;
  storageHash: string;
};
export type UpdateBlobKeyResult = APIResult<
  UpdateBlobKeyStorageInfo,
  ChangeBlobKeyError
>;

export async function updateBlobKeyForEncryptedStorage(
  oldEncryptionKey: string,
  newEncryptionKey: string,
  newSalt: string,
  knownServerStorageRevision?: string,
  credential?: SerializedPCD<SemaphoreSignaturePCD>
): Promise<UpdateBlobKeyResult> {
  const oldUser = loadSelf();
  const newUser = { ...oldUser, salt: newSalt } as ZupassUserJson;
  const pcds = await loadPCDs(oldUser);
  const subscriptions = await loadSubscriptions();

  const { serializedStorage, storageHash } = await serializeStorage(
    newUser,
    pcds,
    subscriptions
  );
  const encryptedStorage = await passportEncrypt(
    stringify(serializedStorage),
    newEncryptionKey
  );

  const oldBlobKey = await getHash(oldEncryptionKey);
  const newBlobKey = await getHash(newEncryptionKey);

  const changeResult = await requestChangeBlobKey(
    appConfig.zupassServer,
    oldBlobKey,
    newBlobKey,
    newUser.uuid,
    newSalt,
    encryptedStorage,
    knownServerStorageRevision,
    credential
  );
  if (changeResult.success) {
    console.log(
      `[SYNC] changed e2ee storage key (revision ${changeResult.value.revision})`
    );
    savePersistentSyncStatus({
      serverStorageRevision: changeResult.value.revision,
      serverStorageHash: storageHash
    });
    return {
      success: true,
      value: { revision: changeResult.value.revision, storageHash: storageHash }
    };
  } else {
    console.error(
      "[SYNC] failed to change e2ee storage key",
      changeResult.error
    );
    return { success: false, error: changeResult.error };
  }
}

export type UploadStorageResult = APIResult<
  { revision: string; storageHash: string },
  NamedAPIError
>;

/**
 * Uploads the state of this passport which is contained in localstorage
 * to the server, end to end encrypted.
 *
 * If knownRevision is specified, it is used to abort the upload in
 * case of conflict.  If it is undefined, the upload will overwrite
 * any revision.
 */
export async function uploadStorage(
  user: User,
  userIdentityV3: IdentityV3,
  pcds: PCDCollection,
  subscriptions: FeedSubscriptionManager,
  knownRevision?: string
): Promise<UploadStorageResult> {
  const { serializedStorage, storageHash } = await serializeStorage(
    user,
    pcds,
    subscriptions
  );
  return uploadSerializedStorage(
    user,
    userIdentityV3,
    pcds,
    serializedStorage,
    storageHash,
    knownRevision
  );
}

/**
 * Uploads the state of this passport, in serialied form as produced by
 * serializeStorage().
 *
 * The parameters {@link user}, {@link userIdentity}, and
 * {@link pcds} are used only to validate the consistency between the three
 * before attempting an upload, to help prevent uploading inconsistent state.
 *
 * If knownRevision is specified, it is used to abort the upload in
 * case of conflict.  If it is undefined, the upload will overwrite
 * any revision.
 */
export async function uploadSerializedStorage(
  user: User,
  userIdentityV3: IdentityV3,
  pcds: PCDCollection,
  serializedStorage: SyncedEncryptedStorage,
  storageHash: string,
  knownRevision?: string,
  credential?: SerializedPCD
): Promise<UploadStorageResult> {
  if (
    !validateAndLogRunningAppState(
      "uploadSerializedStorage",
      user,
      userIdentityV3,
      pcds
    )
  ) {
    return {
      success: false,
      error: {
        name: "ValidationError",
        detailedMessage: "validation before upload failed",
        code: undefined
      }
    };
  }

  const encryptionKey = loadEncryptionKey() as string;
  const blobKey = await getHash(encryptionKey);

  const encryptedStorage = await passportEncrypt(
    stringify(serializedStorage),
    encryptionKey
  );

  const uploadResult = await requestUploadEncryptedStorage(
    appConfig.zupassServer,
    blobKey,
    encryptedStorage,
    knownRevision,
    credential
  );

  if (uploadResult.success) {
    console.log(
      `[SYNC] uploaded e2ee storage (revision ${uploadResult.value.revision})`
    );
    savePersistentSyncStatus({
      serverStorageRevision: uploadResult.value.revision,
      serverStorageHash: storageHash
    });
    return {
      success: true,
      value: { revision: uploadResult.value.revision, storageHash: storageHash }
    };
  } else if (uploadResult.error.name === "Conflict") {
    console.warn("[SYNC] conflict uploading e2ee storage", uploadResult.error);
    return { success: false, error: uploadResult.error };
  } else {
    console.error("[SYNC] failed to upload e2ee storage", uploadResult.error);
    requestLogToServer(appConfig.zupassServer, "sync-failed", {
      user: user.uuid,
      pcdCollectionSize: pcds.size(),
      storageCipherTextLength: encryptedStorage.ciphertext.length
    });
    return { success: false, error: uploadResult.error };
  }
}

export type MergeableFields = {
  pcds: PCDCollection;
  subscriptions: FeedSubscriptionManager;
};

export type MergeStorageResult = APIResult<MergeableFields, NamedAPIError>;

/**
 * Merge the contents of local and remote states, both of which have potential
 * changes from a common base state.
 *
 * PCDs and subscriptions are each merged independently, using the same basic
 * algorithm.  If there are no differences (identical hash) then this merge
 * always returns the "remote" fields, making it equivalent to a simple
 * download-and-replace.
 *
 * The merge performed here is limited by the lack of historical revisions, or
 * other information which could clarify the user's intent.  E.g. we can't tell
 * a remote "add" from a local "remove", and in case of replacement we don't
 * know which version is newer.  Without that, we can't know which version of
 * data is "better".  Instead we're opinionated on these tradeoffs:
 * 1) Keeping data is always better than losing data.  If we can't tell if an
 *    object was added or removed, assume it was added.  This means a conflict
 *    may cause a removed object to reappear, but shouldn't cause a new object
 *    to be lost.  This preference is chosen to avoid losing user data, but may
 *    not always be ideal, e.g. in the case of subscriptions granting
 *    permissions the user intended to revoke.
 * 2) By default, prefer data downloaded from the server.  This is mostly
 *    arbitrary, but given that we upload more aggressively than we download
 *    it approximates a "first to reach the server wins" policy.  This means if
 *    an object is modified (with the same ID) and involved in a conflict, one
 *    of the two copies will be kept, determined by the timing of uploads.
 *
 * As a side-effect of the implementation of #2, this merge algorithm always
 * replaces the PCDCollection and FeedsSubscriptionManager with new objects,
 * discarding non-serialized state (like listeners on emitters, and
 * subscription errors).
 *
 * This function always uploads a report to the server that a merge occurred,
 * with some stats which we hope will be helpful to detect future problems
 * and tune better merge algorithms.
 *
 * @param localFields the local PCDs and subscriptions currently in use.  These
 *   are unmodified by the current merge algorithm.
 * @param remoteFields the new PCDs and subscriptions downloaded from the
 *   server.  These are modified and returned by the current merge algorithm.
 * @param self a user object used to populate log messages.
 * @returns the resulting PCDs and subscriptions to be used going forward.
 *   In the current merge algorithm, these are always modified versions of the
 *   `remoteFields`.
 *
 */
export async function mergeStorage(
  localFields: MergeableFields,
  remoteFields: MergeableFields,
  self: User
): Promise<MergeStorageResult> {
  // Merge PCDs and Subscriptions independently, and gather a unified set of
  // stats to include in a report to the server.
  // TODO(#1372): Detect and report on cases where objects differ with the
  // same ID.
  let identicalPCDs = true;
  let identicalSubs = true;
  let anyPCDDiffs = false;
  let anySubDiffs = false;

  // PCD merge: Based on PCDCollection.merge, with predicate providing filtering
  // by ID, and updating stats based on how many PCDs were added.
  const pcdMergeStats = {
    localOnly: 0,
    remoteOnly: remoteFields.pcds.size() - localFields.pcds.size(),
    both: localFields.pcds.size(),
    final: remoteFields.pcds.size()
  };
  if (
    (await localFields.pcds.getHash()) !== (await remoteFields.pcds.getHash())
  ) {
    identicalPCDs = false;
    const pcdMergePredicate = (
      pcd: PCD,
      remotePCDs: PCDCollection
    ): boolean => {
      if (remotePCDs.hasPCDWithId(pcd.id)) {
        return false;
      } else {
        pcdMergeStats.localOnly++;
        pcdMergeStats.remoteOnly++;
        pcdMergeStats.both--;
        return true;
      }
    };
    // TODO(#1373): Attempt to preserve order while merging?
    remoteFields.pcds.merge(localFields.pcds, {
      shouldInclude: pcdMergePredicate
    });
    pcdMergeStats.final = remoteFields.pcds.size();
    anyPCDDiffs = pcdMergeStats.localOnly > 0 || pcdMergeStats.remoteOnly > 0;

    if (anyPCDDiffs) {
      console.log("[SYNC] merged PCDS:", pcdMergeStats);
    } else {
      console.log(
        "[SYNC] PCD merge made no changes to downloaded set: IDs are identical"
      );
    }
  } else {
    console.log("[SYNC] no merge of PCDs: hashes are identical");
  }

  // Subscription merge: Based on FeedSubscriptionManager.merge, with stats
  // calculated based on the returned counts.
  const localCount = localFields.subscriptions.getActiveSubscriptions().length;
  const remoteCount =
    remoteFields.subscriptions.getActiveSubscriptions().length;
  const subMergeStats = {
    localOnly: 0,
    remoteOnly: remoteCount - localCount,
    both: localCount,
    final: remoteCount
  };
  if (
    (await localFields.subscriptions.getHash()) !==
    (await remoteFields.subscriptions.getHash())
  ) {
    identicalSubs = false;
    const subMergeResults = remoteFields.subscriptions.merge(
      localFields.subscriptions
    );
    subMergeStats.localOnly += subMergeResults.newSubscriptions;
    subMergeStats.remoteOnly += subMergeResults.newSubscriptions;
    subMergeStats.both -= subMergeResults.newSubscriptions;
    subMergeStats.final =
      remoteFields.subscriptions.getActiveSubscriptions().length;
    anySubDiffs = subMergeStats.localOnly > 0 || subMergeStats.remoteOnly > 0;

    if (anySubDiffs) {
      console.log("[SYNC] merged subscriptions:", subMergeStats);
    } else {
      console.log(
        "[SYNC] subscription merge made no changes to downloaded set: IDs are identical"
      );
    }
  } else {
    console.log("[SYNC] no merge of subscriptions: hashes are identical");
  }

  // Report stats to the server for analysis.
  await requestLogToServer(appConfig.zupassServer, "sync-merge", {
    user: self.uuid,
    identical: identicalPCDs && identicalSubs,
    identicalPCDs: identicalPCDs,
    identicalSubs: identicalSubs,
    changedPcds: anyPCDDiffs,
    changedSubscriptions: anySubDiffs,
    pcdMergeStats: pcdMergeStats,
    subscriptionMergeStats: subMergeStats
  });
  return {
    value: {
      pcds: remoteFields.pcds,
      subscriptions: remoteFields.subscriptions
    },
    success: true
  };
}

export type SyncStorageResult = APIResult<
  {
    pcds: PCDCollection;
    subscriptions: FeedSubscriptionManager;
    serverRevision: string;
    serverHash: string;
  } | null,
  null
>;

/**
 * Given the encryption key in local storage, downloads the e2ee
 * encrypted storage from the server.  This can succeed with a null
 * result if the download detects that storage is unchanged from the
 * last saved revision.
 */
export async function downloadAndMergeStorage(
  knownServerRevision: string | undefined,
  knownServerHash: string | undefined,
  appSelf: User,
  appIdentityV3: IdentityV3,
  appPCDs: PCDCollection,
  appSubscriptions: FeedSubscriptionManager
): Promise<SyncStorageResult> {
  console.log("[SYNC] downloading e2ee storage");

  // Download latest revision from server, if it's newer than what's known.
  const encryptionKey = loadEncryptionKey() as string;
  const storageResult = await requestDownloadAndDecryptUpdatedStorage(
    appConfig.zupassServer,
    encryptionKey,
    knownServerRevision
  );

  if (!storageResult.success) {
    console.error("[SYNC] error downloading e2ee storage", storageResult.error);
    return { error: null, success: false };
  }

  if (!storageResult.value.storage) {
    console.log(
      "[SYNC] e2ee storage unchanged from revision",
      storageResult.value.revision
    );
    return { value: null, success: true };
  }

  // Deserialize downloaded storage, which becomes the default new state if no
  // merge is necessary.
  const downloaded = await tryDeserializeNewStorage(
    appSelf,
    appIdentityV3,
    storageResult.value.storage
  );
  if (downloaded === undefined) {
    return { error: null, success: false };
  }
  const { dlPCDs, dlSubscriptions, dlServerHash } = downloaded;

  // Check the hash of local app state to detect changes and determine if
  // a merge is necessary.  We can skip the merge in 3 cases:
  // - If there is no last known server state, this is a first-time download
  //   on login, so local state should be overwritten.
  // - If app-state is the same as last known server state, there have been
  //   no local changes to merge.
  // - If app-state is the same as downloaded state, the merge inputs are
  //   identical so there is no need to merge.
  // If merge is skipped, we take the downloaded state as the new state.
  let [newPCDs, newSubscriptions] = [dlPCDs, dlSubscriptions];
  if (knownServerRevision !== undefined && knownServerHash !== undefined) {
    const appStorage = await serializeStorage(
      appSelf,
      appPCDs,
      appSubscriptions
    );
    if (
      appStorage.storageHash !== dlServerHash &&
      appStorage.storageHash !== knownServerHash
    ) {
      console.warn("[SYNC] revision conflict on download needs merge!");
      const mergeResult = await mergeStorage(
        { pcds: appPCDs, subscriptions: appSubscriptions },
        {
          pcds: downloaded.dlPCDs,
          subscriptions: downloaded.dlSubscriptions
        },
        appSelf
      );
      if (!mergeResult.success) {
        console.error(
          "[SYNC] unable to merge new e2ee storage",
          mergeResult.error
        );
        return { error: null, success: false };
      }
      ({ pcds: newPCDs, subscriptions: newSubscriptions } = mergeResult.value);
    }
  }

  // We've successfully either accepted a new state, or created a merged state.
  // Save and return results.
  await savePCDs(newPCDs);
  await saveSubscriptions(newSubscriptions);
  savePersistentSyncStatus({
    serverStorageRevision: storageResult.value.revision,
    serverStorageHash: dlServerHash
  });
  console.log(
    `[SYNC] downloaded e2ee storage (revision ${storageResult.value.revision})`
  );
  return {
    value: {
      pcds: newPCDs,
      subscriptions: newSubscriptions,
      serverRevision: storageResult.value.revision,
      serverHash: dlServerHash
    },
    success: true
  };
}

/**
 * {@link appSelf} and {@link appIdentityV3} are used solely for validation purposes.
 */
export async function tryDeserializeNewStorage(
  appSelf: User,
  appIdentityV3: IdentityV3,
  storage: SyncedEncryptedStorage
): Promise<
  | undefined
  | {
      dlPCDs: PCDCollection;
      dlSubscriptions: FeedSubscriptionManager;
      dlServerHash: string;
    }
> {
  try {
    const { pcds, subscriptions, storageHash } = await deserializeStorage(
      storage,
      await getPackages(),
      fallbackDeserializeFunction
    );

    if (
      !validateAndLogRunningAppState(
        "downloadStorage",
        appSelf,
        appIdentityV3,
        pcds
      )
    ) {
      throw new Error("downloaded e2ee state failed to validate");
    }

    return {
      dlPCDs: pcds,
      dlSubscriptions: subscriptions,
      dlServerHash: storageHash
    };
  } catch (e) {
    console.error("[SYNC] uploaded storage is corrupted - ignoring it", e);
    return undefined;
  }
}

export function useSyncE2EEStorage(): void {
  const { dispatch } = useContext(StateContext);
  const canSync = useCanSync();

  const load = useCallback(() => {
    setTimeout(() => {
      dispatch({ type: "sync" });
    }, 1);
  }, [dispatch]);

  useOnStateChange(() => {
    if (canSync) load();
  }, [load, canSync]);

  useEffect(() => {
    load();
  }, [load]);
}
