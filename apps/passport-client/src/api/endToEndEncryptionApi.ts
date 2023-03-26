import { EncryptedPacket } from "@pcd/passport-crypto";
import {
  LoadE2EERequest,
  LoadE2EEResponse,
  SaveE2EERequest,
} from "@pcd/passport-interface";
import { config } from "../config";

export async function downloadEncryptedStorage(
  blobKey: string
): Promise<EncryptedPacket> {
  const request: LoadE2EERequest = {
    blobKey,
  };

  const url = `${config.passportServer}/sync/load`;
  console.log(`Loading ${url}`);
  const response = await fetch(url, {
    method: "POST",
    body: JSON.stringify(request),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }

  const res = (await response.json()) as LoadE2EEResponse;
  return res.encryptedStorage as EncryptedPacket;
}

export async function uploadEncryptedStorage(
  blobKey: string,
  encryptedStorage: EncryptedPacket
): Promise<void> {
  const request: SaveE2EERequest = {
    blobKey,
    encryptedBlob: JSON.stringify(encryptedStorage),
  };

  const url = `${config.passportServer}/sync/save`;
  await fetch(url, {
    method: "POST",
    body: JSON.stringify(request),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
}
