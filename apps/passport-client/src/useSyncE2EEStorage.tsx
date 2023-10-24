import { getHash, passportEncrypt } from "@pcd/passport-crypto";
import {
  ChangeBlobKeyResult,
  FeedSubscriptionManager,
  isSyncedEncryptedStorageV2,
  isSyncedEncryptedStorageV3,
  NetworkFeedApi,
  requestChangeBlobKey,
  requestDownloadAndDecryptStorage,
  requestUploadEncryptedStorage,
  SyncedEncryptedStorageV2,
  SyncedEncryptedStorageV3
} from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
import { useCallback, useContext, useEffect, useState } from "react";
import { appConfig } from "./appConfig";
import { usePCDCollectionWithHash, useUploadedId } from "./appHooks";
import { StateContext } from "./dispatch";
import {
  loadEncryptionKey,
  loadPCDs,
  loadSelf,
  loadSubscriptions,
  savePCDs,
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
export async function uploadStorage(): Promise<void> {
  const user = loadSelf();
  const pcds = await loadPCDs();
  const subscriptions = await loadSubscriptions();

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
  );

  if (uploadResult.success) {
    console.log("[SYNC] uploaded e2ee storage");
  } else {
    console.error("[SYNC] failed to upload e2ee storage", uploadResult.error);
  }
}

/**
 * Given the encryption key in local storage, downloads the e2ee
 * encrypted storage from the server.
 */
export async function downloadStorage(): Promise<{
  pcds: PCDCollection | null;
  subscriptions: FeedSubscriptionManager | null;
} | null> {
  console.log("[SYNC] downloading e2ee storage");

  const encryptionKey = loadEncryptionKey();
  const storageResult = await requestDownloadAndDecryptStorage(
    appConfig.zupassServer,
    encryptionKey
  );

  if (!storageResult.success) {
    console.error("[SYNC] error downloading e2ee storage", storageResult.error);
    return null;
  }

  try {
    let pcds: PCDCollection;
    let subscriptions: FeedSubscriptionManager | null = null;

    if (isSyncedEncryptedStorageV3(storageResult.value)) {
      pcds = await PCDCollection.deserialize(
        await getPackages(),
        storageResult.value.pcds
      );

      subscriptions = FeedSubscriptionManager.deserialize(
        new NetworkFeedApi(),
        storageResult.value.subscriptions
      );
    } else if (isSyncedEncryptedStorageV2(storageResult.value)) {
      pcds = await PCDCollection.deserialize(
        await getPackages(),
        storageResult.value.pcds
      );
    } else {
      pcds = new PCDCollection(await getPackages());
      await pcds.deserializeAllAndAdd(storageResult.value.pcds);
    }

    if (subscriptions) {
      await saveSubscriptions(subscriptions);
    }

    await savePCDs(pcds);
    return { pcds, subscriptions };
  } catch (e) {
    console.error("[SYNC] uploaded storage is corrupted - ignoring it", e);
    return null;
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

export function useHasUploaded() {
  const [hasUploaded, setHasUploaded] = useState<boolean | undefined>();
  const { hash } = usePCDCollectionWithHash();
  const uploadedId = useUploadedId();

  useEffect(() => {
    setHasUploaded(hash === uploadedId);
  }, [hash, uploadedId]);

  return hasUploaded;
}
