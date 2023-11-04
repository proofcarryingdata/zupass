import { getHash, passportEncrypt } from "@pcd/passport-crypto";
import {
  APIResult,
  ChangeBlobKeyResult,
  FeedSubscriptionManager,
  SyncedEncryptedStorageV2,
  SyncedEncryptedStorageV3,
  UploadEncryptedStorageResult,
  User,
  deserializeStorage,
  requestChangeBlobKey,
  requestDownloadAndDecryptUpdatedStorage,
  requestUploadEncryptedStorage
} from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
import { useCallback, useContext, useEffect } from "react";
import { appConfig } from "./appConfig";
import { StateContext } from "./dispatch";
import {
  loadEncryptionKey,
  loadPCDs,
  loadSelf,
  savePCDs,
  savePersistentSyncStatus,
  saveSubscriptions
} from "./localstorage";
import { getPackages } from "./pcdPackages";
import { useOnStateChange } from "./subscribe";

export async function updateBlobKeyForEncryptedStorage(
  oldEncryptionKey: string,
  newEncryptionKey: string,
  newSalt: string
): Promise<ChangeBlobKeyResult> {
  const user = loadSelf();
  const pcds = await loadPCDs();

  const encryptedStorage = await passportEncrypt(
    JSON.stringify({
      pcds: await pcds.serializeCollection(),
      self: user,
      _storage_version: "v2"
    } satisfies SyncedEncryptedStorageV2),
    newEncryptionKey
  );

  const oldBlobKey = await getHash(oldEncryptionKey);
  const newBlobKey = await getHash(newEncryptionKey);

  return requestChangeBlobKey(
    appConfig.zupassServer,
    oldBlobKey,
    newBlobKey,
    user.uuid,
    newSalt,
    encryptedStorage
  );
}

/**
 * Uploads the state of this passport which is contained in localstorage
 * to the server, end to end encrypted.
 */
export async function uploadStorage(
  user: User,
  pcds: PCDCollection,
  subscriptions: FeedSubscriptionManager
): Promise<UploadEncryptedStorageResult> {
  const encryptionKey = loadEncryptionKey();
  const blobKey = await getHash(encryptionKey);

  const encryptedStorage = await passportEncrypt(
    JSON.stringify({
      pcds: await pcds.serializeCollection(),
      self: user,
      subscriptions: subscriptions.serialize(),
      _storage_version: "v3"
    } satisfies SyncedEncryptedStorageV3),
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
      serverStorageRevision: uploadResult.value.revision
    });
  } else {
    console.error("[SYNC] failed to upload e2ee storage", uploadResult.error);
  }
  return uploadResult;
}

export type SyncStorageResult = APIResult<
  {
    pcds: PCDCollection;
    subscriptions: FeedSubscriptionManager;
    revision: string;
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
    const { pcds, subscriptions } = await deserializeStorage(
      storageResult.value.storage,
      await getPackages()
    );
    await savePCDs(pcds);
    await saveSubscriptions(subscriptions);
    savePersistentSyncStatus({
      serverStorageRevision: storageResult.value.revision
    });
    console.log(
      `[SYNC] downloaded e2ee storage (revision ${storageResult.value.revision})`
    );
    return {
      value: { pcds, subscriptions, revision: storageResult.value.revision },
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
