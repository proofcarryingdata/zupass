import {
  getHash,
  passportDecrypt,
  passportEncrypt
} from "@pcd/passport-crypto";
import {
  ISSUANCE_STRING,
  IssuedPCDsRequest,
  IssuedPCDsResponse,
  isSyncedEncryptedStorageV2,
  SyncedEncryptedStorage,
  SyncedEncryptedStorageV2
} from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { useContext, useEffect, useMemo, useState } from "react";
import {
  downloadEncryptedStorage,
  uploadEncryptedStorage
} from "./api/endToEndEncryptionApi";
import { requestIssuedPCDs } from "./api/issuedPCDs";
import { DispatchContext, StateContext } from "./dispatch";
import {
  loadEncryptionKey,
  loadPCDs,
  loadSelf,
  savePCDs
} from "./localstorage";
import { getPackages } from "./pcdPackages";
import { AppState } from "./state";
import { useSubscribe } from "./subscribe";

/**
 * Uploads the state of this passport which is contained in localstorage
 * to the server, end to end encrypted.
 */
export async function uploadStorage(): Promise<void> {
  const user = loadSelf();
  const pcds = await loadPCDs();
  const encryptionKey = await loadEncryptionKey();
  const encryptedStorage = await passportEncrypt(
    JSON.stringify({
      pcds: await pcds.serializeCollection(),
      self: user,
      _storage_version: "v2"
    } satisfies SyncedEncryptedStorageV2),
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
export async function downloadStorage(): Promise<PCDCollection | null> {
  console.log("[SYNC] downloading e2ee storage");
  const encryptionKey = await loadEncryptionKey();
  const blobHash = await getHash(encryptionKey);
  const storage = await downloadEncryptedStorage(blobHash);

  if (storage == null) {
    return null;
  }

  const decrypted = await passportDecrypt(storage, encryptionKey);

  try {
    const decryptedPacket = JSON.parse(decrypted) as SyncedEncryptedStorage;
    let pcds: PCDCollection;

    if (isSyncedEncryptedStorageV2(decryptedPacket)) {
      pcds = await PCDCollection.deserialize(
        await getPackages(),
        decryptedPacket.pcds
      );
    } else {
      pcds = new PCDCollection(await getPackages());
      await pcds.deserializeAllAndAdd(decryptedPacket.pcds);
    }

    await savePCDs(pcds);
    return pcds;
  } catch (e) {
    console.log("[SYNC] uploaded storage is corrupted - ignoring it");
    return null;
  }
}

export async function loadIssuedPCDs(
  state: AppState
): Promise<IssuedPCDsResponse | undefined> {
  const request: IssuedPCDsRequest = {
    userProof: await SemaphoreSignaturePCDPackage.serialize(
      await SemaphoreSignaturePCDPackage.prove({
        identity: {
          argumentType: ArgumentTypeName.PCD,
          value: await SemaphoreIdentityPCDPackage.serialize(
            await SemaphoreIdentityPCDPackage.prove({
              identity: state.identity
            })
          )
        },
        signedMessage: {
          argumentType: ArgumentTypeName.String,
          value: ISSUANCE_STRING
        }
      })
    )
  };

  const issuedPcdsResponse = await requestIssuedPCDs(request);

  if (!issuedPcdsResponse) {
    console.log("[ISSUED PCDS] unable to get issued pcds");
    return undefined;
  }

  return issuedPcdsResponse;
}

export function useSyncE2EEStorage() {
  const { dispatch } = useContext(StateContext);

  useSubscribe(() => {
    dispatch({ type: "sync" });
  }, [dispatch]);
}

export function useLoggedIn() {
  const [state] = useContext(DispatchContext);

  const loggedIn = useMemo(() => {
    return state.self !== undefined;
  }, [state]);

  return loggedIn;
}

export function useHasUploaded() {
  const [state] = useContext(DispatchContext);
  const [hasUploaded, setHasUploaded] = useState<boolean | undefined>();

  useEffect(() => {
    (async () => {
      setHasUploaded(state.uploadedUploadId === (await state.pcds.getHash()));
    })();
  }, [state.pcds, state.uploadedUploadId]);

  useEffect(() => {
    setHasUploaded(undefined);
  }, [state.uploadedUploadId]);

  return hasUploaded;
}

export function useIsDownloaded() {
  const [state] = useContext(DispatchContext);

  const isDownloaded = useMemo(() => {
    return state.downloadedPCDs !== undefined;
  }, [state]);

  return isDownloaded;
}
