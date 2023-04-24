import {
  getHash,
  passportDecrypt,
  passportEncrypt,
} from "@pcd/passport-crypto";
import { PCDCollection } from "@pcd/pcd-collection";
import { useContext, useEffect, useMemo } from "react";
import {
  downloadEncryptedStorage,
  uploadEncryptedStorage,
} from "./api/endToEndEncryptionApi";
import { DispatchContext } from "./dispatch";
import {
  loadEncryptionKey,
  loadPCDs,
  loadSelf,
  savePCDs,
} from "./localstorage";
import { getPackages } from "./pcdPackages";
import { sleep } from "./util";

/**
 * Uploads the state of this passport which is contained in localstorage
 * to the server, end to end encrypted.
 */
export async function uploadStorage(): Promise<void> {
  await sleep(5000);

  const participant = loadSelf();
  const pcds = await loadPCDs();
  const encryptionKey = await loadEncryptionKey();
  const encryptedStorage = await passportEncrypt(
    JSON.stringify({
      pcds: await pcds.serializeAll(),
      self: participant,
    }),
    encryptionKey
  );

  const blobKey = await getHash(encryptionKey);
  return uploadEncryptedStorage(blobKey, encryptedStorage)
    .then(() => {
      console.log("[SYNC] uploaded e2ee storage");
    })
    .catch((e) => {
      console.log("[SYNC] failed to upload e2ee storage", e);
    });
}

/**
 * Given the encryption key in local storage, downloads the e2ee
 * encrypted storage from the server.
 */
export async function downloadStorage(): Promise<PCDCollection> {
  await sleep(5000);

  console.log("[SYNC] downloading e2ee storage");

  const encryptionKey = await loadEncryptionKey();
  const blobHash = await getHash(encryptionKey);
  const storage = await downloadEncryptedStorage(blobHash);
  const decrypted = await passportDecrypt(storage, encryptionKey);
  const pcds = new PCDCollection(await getPackages(), []);
  await pcds.deserializeAllAndAdd(decrypted.pcds);
  await savePCDs(pcds);
  return pcds;
}

export function useSyncE2EEStorage() {
  const [state, dispatch] = useContext(DispatchContext);

  useEffect(() => {
    dispatch({ type: "sync" });
  }, [dispatch, state]);
}

export function useHasUploaded() {
  const [state] = useContext(DispatchContext);

  const hasUploaded = useMemo(() => {
    return state.uploadedUploadId === state.pcds.getUploadId();
  }, [state]);

  return hasUploaded;
}

export function useIsDownloaded() {
  const [state] = useContext(DispatchContext);

  const isDownloaded = useMemo(() => {
    return state.downloadedPCDs !== undefined;
  }, [state]);

  return isDownloaded;
}
