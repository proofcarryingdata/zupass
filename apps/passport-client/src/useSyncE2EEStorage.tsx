import {
  getHash,
  passportDecrypt,
  passportEncrypt
} from "@pcd/passport-crypto";
import {
  FeedRequest,
  FeedResponse,
  ISSUANCE_STRING,
  SyncedEncryptedStorage,
  SyncedEncryptedStorageV2,
  isSyncedEncryptedStorageV2
} from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { useContext, useEffect, useState } from "react";
import {
  downloadEncryptedStorage,
  uploadEncryptedStorage
} from "./api/endToEndEncryptionApi";
import { requestIssuedPCDs } from "./api/issuedPCDs";
import { appConfig } from "./appConfig";
import { usePCDCollectionWithHash, useUploadedId } from "./appHooks";
import { StateContext } from "./dispatch";
import {
  loadEncryptionKey,
  loadPCDs,
  loadSelf,
  savePCDs
} from "./localstorage";
import { getPackages } from "./pcdPackages";
import { AppState } from "./state";
import { useOnStateChange } from "./subscribe";

/**
 * Uploads the state of this passport which is contained in localstorage
 * to the server, end to end encrypted.
 */
export async function uploadStorage(): Promise<void> {
  const user = loadSelf();
  const pcds = await loadPCDs();
  if (pcds.size() === 0) {
    console.error("[SYNC] skipping upload, no pcds in localStorage");
    return;
  }
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
): Promise<FeedResponse | undefined> {
  const request: FeedRequest = {
    feedId: "1",
    pcd: await SemaphoreSignaturePCDPackage.serialize(
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

  const issuedPcdsResponse = await requestIssuedPCDs(
    `${appConfig.passportServer}/feed`,
    request
  );

  if (!issuedPcdsResponse) {
    console.log("[ISSUED PCDS] unable to get issued pcds");
    return undefined;
  }

  return issuedPcdsResponse;
}

export function useSyncE2EEStorage() {
  const { dispatch } = useContext(StateContext);

  useOnStateChange(() => {
    dispatch({ type: "sync" });
  }, [dispatch]);
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
