import {
  EncryptedPacket,
  getHash,
  passportDecrypt
} from "@pcd/passport-crypto";
import {
  LoadE2EERequest,
  LoadE2EEResponse,
  SaveE2EERequest,
  SyncedEncryptedStorage
} from "@pcd/passport-interface";
import { appConfig } from "../appConfig";

export async function downloadEncryptedStorage(
  blobKey: string
): Promise<EncryptedPacket | null> {
  const request: LoadE2EERequest = {
    blobKey
  };

  const url = `${appConfig.passportServer}/sync/load`;
  console.log(`Loading ${url}`);
  const response = await fetch(url, {
    method: "POST",
    body: JSON.stringify(request),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    }
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const res = (await response.json()) as LoadE2EEResponse;
  return res.encryptedStorage as EncryptedPacket;
}

export async function attemptDownloadStorage(syncKey: string) {
  const blobHash = await getHash(syncKey);
  const storage = await downloadEncryptedStorage(blobHash);
  if (!storage) {
    throw new Error("no e2ee for this syncKey found");
  }
  return storage;
}

export async function downloadAndDecryptStorage(
  syncKey: string
): Promise<SyncedEncryptedStorage> {
  const storage = await attemptDownloadStorage(syncKey);
  const decrypted = await passportDecrypt(storage, syncKey);
  return JSON.parse(decrypted);
}

export async function uploadEncryptedStorage(
  blobKey: string,
  encryptedStorage: EncryptedPacket
): Promise<void> {
  const request: SaveE2EERequest = {
    blobKey,
    encryptedBlob: JSON.stringify(encryptedStorage)
  };

  const url = `${appConfig.passportServer}/sync/save`;
  await fetch(url, {
    method: "POST",
    body: JSON.stringify(request),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    }
  });
}
