import { getHash, passportEncrypt } from "@pcd/passport-crypto";
import {
  APIResult,
  ChangeBlobKeyError,
  FeedSubscriptionManager,
  NamedAPIError,
  SyncedEncryptedStorage,
  User,
  deserializeStorage,
  requestChangeBlobKey,
  requestDownloadAndDecryptUpdatedStorage,
  requestLogToServer,
  requestUploadEncryptedStorage,
  serializeStorage
} from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
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
import { getPackages } from "./pcdPackages";
import { useOnStateChange } from "./subscribe";

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
  knownServerStorageRevision?: string
): Promise<UpdateBlobKeyResult> {
  const oldUser = loadSelf();
  const newUser = { ...oldUser, salt: newSalt };
  const pcds = await loadPCDs();
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
    knownServerStorageRevision
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
 * If knownRevision is specified, it will is used to abort the upload in
 * case of conflict.  If it is undefined, the upload will overwrite
 * any revision.
 */
export async function uploadStorage(
  user: User,
  pcds: PCDCollection,
  subscriptions: FeedSubscriptionManager,
  knownRevision?: string
): Promise<UploadStorageResult> {
  const { serializedStorage, storageHash } = await serializeStorage(
    user,
    pcds,
    subscriptions
  );
  return uploadSerializedStorage(serializedStorage, storageHash, knownRevision);
}

/**
 * Uploads the state of this passport, in serialied form as produced by
 * serializeStorage().
 *
 * If knownRevision is specified, it will is used to abort the upload in
 * case of conflict.  If it is undefined, the upload will overwrite
 * any revision.
 */
export async function uploadSerializedStorage(
  serializedStorage: SyncedEncryptedStorage,
  storageHash: string,
  knownRevision?: string
): Promise<UploadStorageResult> {
  const encryptionKey = loadEncryptionKey();
  const blobKey = await getHash(encryptionKey);

  const encryptedStorage = await passportEncrypt(
    stringify(serializedStorage),
    encryptionKey
  );

  const uploadResult = await requestUploadEncryptedStorage(
    appConfig.zupassServer,
    blobKey,
    encryptedStorage,
    knownRevision
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
 * TODO(artwyman): Describe merge algorithm.
 */
export async function mergeStorage(
  _localFields: MergeableFields,
  remoteFields: MergeableFields,
  self: User
): Promise<MergeStorageResult> {
  console.error(
    "[SYNC] sync conflict needs merge!  Keeping only remote state."
  );
  // TODO(artwyman): Refactor this out to implement and test real merge.
  requestLogToServer(appConfig.zupassServer, "sync-merge", {
    user: self.uuid
    // TODO(artwyman): more details for tracking.
  });
  return { value: remoteFields, success: true };
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
  appPCDs: PCDCollection,
  appSubscriptions: FeedSubscriptionManager
): Promise<SyncStorageResult> {
  console.log("[SYNC] downloading e2ee storage");

  // Download latest revision from server, if it's newer than what's known.
  const encryptionKey = loadEncryptionKey();
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
    storageResult.value.storage
  );
  if (downloaded === undefined) {
    return { error: null, success: false };
  }
  const { dlPCDs, dlSubscriptions, dlServerHash } = downloaded;

  // Check if local app state has changes since the last server revision, in
  // which case a merge is necessary.  Otherwise we keep the downloaded state.
  let [newPCDs, newSubscriptions] = [dlPCDs, dlSubscriptions];
  if (knownServerRevision !== undefined && knownServerHash !== undefined) {
    const appStorage = await serializeStorage(
      appSelf,
      appPCDs,
      appSubscriptions
    );
    if (appStorage.storageHash !== knownServerHash) {
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

export async function tryDeserializeNewStorage(
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
      await getPackages()
    );
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

export function useSyncE2EEStorage() {
  const { dispatch } = useContext(StateContext);

  const load = useCallback(() => {
    setTimeout(() => {
      dispatch({ type: "sync" });
    }, 1);
  }, [dispatch]);

  useOnStateChange(() => {
    load();
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);
}
