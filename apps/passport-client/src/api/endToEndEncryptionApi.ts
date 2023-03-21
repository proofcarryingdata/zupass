import { EncryptedPacket } from "@pcd/passport-crypto";
import {
  LoadE2EERequest,
  LoadE2EEResponse,
  SaveE2EERequest,
} from "@pcd/passport-interface";
import { PASSPORT_SERVER_URL } from "../urls";

export async function downloadEncryptedStorage(
  email: string
): Promise<EncryptedPacket> {
  const request: LoadE2EERequest = {
    email,
  };

  const response = await fetch(PASSPORT_SERVER_URL + "/sync/load", {
    method: "POST",
    body: JSON.stringify(request),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  const res = (await response.json()) as LoadE2EEResponse;
  return res.encryptedStorage as EncryptedPacket;
}

export async function uploadEncryptedStorage(
  email: string,
  serverToken: string,
  encryptedStorage: EncryptedPacket
): Promise<void> {
  const request: SaveE2EERequest = {
    email,
    serverToken,
    encryptedBlob: JSON.stringify(encryptedStorage),
  };

  await fetch(PASSPORT_SERVER_URL + "/sync/save/", {
    method: "POST",
    body: JSON.stringify(request),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
}
