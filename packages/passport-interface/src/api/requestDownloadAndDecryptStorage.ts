import { getHash, passportDecrypt } from "@pcd/passport-crypto";
import { getErrorMessage } from "@pcd/util";
import { SyncedEncryptedStorage } from "../EncryptedStorage";
import { LoadE2EEResponseValue } from "../RequestTypes";
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
  zupassServerUrl: string,
  encryptionKey: string
): Promise<DownloadAndDecryptResult> {
  try {
    const encryptionKeyHash = await getHash(encryptionKey);
    const storageResult = await requestEncryptedStorage(
      zupassServerUrl,
      encryptionKeyHash
    );

    if (!storageResult.success) {
      console.error(`error loading e2ee data`, storageResult.error);
      return { error: "couldn't download e2ee data", success: false };
    }

    const decrypted = await passportDecrypt(
      storageResult.value.encrypted,
      encryptionKey
    );
    const parsed = JSON.parse(decrypted) as SyncedEncryptedStorage;

    return {
      value: { parsed, jwt: storageResult.value.jwt },
      success: true
    };
  } catch (e) {
    console.error(`error loading e2ee data`, e);
    return { error: getErrorMessage(e), success: false };
  }
}

export type DownloadAndDecryptResult = APIResult<LoadE2EEResponseValue>;
