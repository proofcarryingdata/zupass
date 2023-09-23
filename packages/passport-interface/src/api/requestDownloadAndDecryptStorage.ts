import { getHash, passportDecrypt } from "@pcd/passport-crypto";
import { getErrorMessage } from "@pcd/util";
import { SyncedEncryptedStorage } from "../EncryptedStorage";
import { APIResult } from "./apiResult";
import { requestEncryptedStorage } from "./requestEncryptedStorage";

/**
 * Downloads and decrypts a user's end-to-end encrypted backup of their
 * PCDs, given their encryption key. The server never learns the encryption
 * key.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestDownloadAndDecryptStorage(
  passportServerUrl: string,
  encryptionKey: string
): Promise<DownloadAndDecryptResult> {
  try {
    const encryptionKeyHash = await getHash(encryptionKey);
    const storageResult = await requestEncryptedStorage(
      passportServerUrl,
      encryptionKeyHash
    );

    if (!storageResult.success) {
      console.error(`error loading e2ee data`, storageResult.error);
      return { error: "couldn't download e2ee data", success: false };
    }

    const decrypted = await passportDecrypt(storageResult.value, encryptionKey);
    return {
      value: JSON.parse(decrypted) as SyncedEncryptedStorage,
      success: true
    };
  } catch (e) {
    console.error(`error loading e2ee data`, e);
    return { error: getErrorMessage(e), success: false };
  }
}

export type DownloadAndDecryptResult = APIResult<SyncedEncryptedStorage>;
