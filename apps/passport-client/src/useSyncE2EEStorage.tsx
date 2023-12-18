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
  requestUploadEncryptedStorage,
  serializeStorage
} from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
import { Identity } from "@semaphore-protocol/identity";
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
import { validateAndLogStateErrors } from "./validateState";

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
  newSalt: string
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

  // TODO(artwyman): Pass in knownRevison here, but only once this code is
  // ready to respond to a conflict.  For now, without a revision, this
  // password change could clobber PCD changed which haven't downloaded yet.
  const changeResult = await requestChangeBlobKey(
    appConfig.zupassServer,
    oldBlobKey,
    newBlobKey,
    newUser.uuid,
    newSalt,
    encryptedStorage
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
 */
export async function uploadStorage(
  user: User,
  userIdentity: Identity,
  pcds: PCDCollection,
  subscriptions: FeedSubscriptionManager
): Promise<UploadStorageResult> {
  const { serializedStorage, storageHash } = await serializeStorage(
    user,
    pcds,
    subscriptions
  );
  return uploadSerializedStorage(
    user,
    userIdentity,
    pcds,
    serializedStorage,
    storageHash
  );
}

/**
 * Uploads the state of this passport, in serialized form as produced by
 * serializeStorage(). The parameters {@link user}, {@link userIdentity}, and
 * {@link pcds} are used only to validate the consistency between the three
 * before attempting an upload, to help prevent uploading inconsistent state.
 */
export async function uploadSerializedStorage(
  user: User,
  userIdentity: Identity,
  pcds: PCDCollection,
  serializedStorage: SyncedEncryptedStorage,
  storageHash: string
): Promise<UploadStorageResult> {
  if (
    !validateAndLogStateErrors(
      "uploadSerializedStorage",
      user,
      userIdentity,
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

  const encryptionKey = loadEncryptionKey();
  const blobKey = await getHash(encryptionKey);

  const encryptedStorage = await passportEncrypt(
    stringify(serializedStorage),
    encryptionKey
  );

  const uploadResult = await requestUploadEncryptedStorage(
    appConfig.zupassServer,
    blobKey,
    encryptedStorage
    // TODO(artwyman): Expose access to knownRevision when a caller is ready
    // to handle conflicts.
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
  } else {
    console.error("[SYNC] failed to upload e2ee storage", uploadResult.error);
    return { success: false, error: uploadResult.error };
  }
}

export type SyncStorageResult = APIResult<
  {
    pcds: PCDCollection;
    subscriptions: FeedSubscriptionManager;
    revision: string;
    storageHash: string;
  } | null,
  null
>;

/**
 * Given the encryption key in local storage, downloads the e2ee
 * encrypted storage from the server.  This can succeed with a null
 * result if the download detects that storage is unchanged from the
 * last saved revision.
 */
export async function downloadStorage(
  knownServerRevision: string | undefined
): Promise<SyncStorageResult> {
  console.log("[SYNC] downloading e2ee storage");

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

  try {
    const { pcds, subscriptions, storageHash } = await deserializeStorage(
      storageResult.value.storage,
      await getPackages()
    );

    if (
      !validateAndLogStateErrors(
        "downloadStorage",
        undefined,
        undefined,
        pcds,
        true
      )
    ) {
      throw new Error("downloaded e2ee state failed to validate");
    }

    await savePCDs(pcds);
    await saveSubscriptions(subscriptions);
    savePersistentSyncStatus({
      serverStorageRevision: storageResult.value.revision,
      serverStorageHash: storageHash
    });
    console.log(
      `[SYNC] downloaded e2ee storage (revision ${storageResult.value.revision})`
    );
    return {
      value: {
        pcds,
        subscriptions,
        revision: storageResult.value.revision,
        storageHash: storageHash
      },
      success: true
    };
  } catch (e) {
    console.error("[SYNC] uploaded storage is corrupted - ignoring it", e);
    return { error: null, success: false };
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
