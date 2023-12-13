import {
  EncryptedPacket,
  getHash,
  passportDecrypt
} from "@pcd/passport-crypto";
import { getErrorMessage } from "@pcd/util";
import { SyncedEncryptedStorage } from "../EncryptedStorage";
import {
  APIResult,
  ERROR_NAME_BAD_RESPONSE,
  ERROR_NAME_UNKNOWN,
  NamedAPIError
} from "./apiResult";
import { requestEncryptedStorage } from "./requestEncryptedStorage";

export type StorageWithRevision = {
  storage: SyncedEncryptedStorage;
  revision: string;
};

export type DownloadAndDecryptResult = APIResult<
  StorageWithRevision,
  NamedAPIError
>;

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
  const result = await requestDownloadAndDecryptUpdatedStorage(
    zupassServerUrl,
    encryptionKey,
    undefined
  );
  if (!result.success) {
    return { error: result.error, success: false };
  }
  if (!result.value.storage) {
    console.error("unexpectedly missing e2ee data");
    return {
      error: {
        name: ERROR_NAME_BAD_RESPONSE,
        detailedMessage: "unexpectedly missing e2ee data"
      },
      success: false
    };
  }
  return {
    value: { storage: result.value.storage, revision: result.value.revision },
    success: true
  };
}

export type OptionalStorageWithRevision = {
  storage?: SyncedEncryptedStorage;
  revision: string;
};

export type DownloadAndDecryptUpdateResult = APIResult<
  OptionalStorageWithRevision,
  NamedAPIError
>;

/**
 * Downloads and decrypts a user's end-to-end encrypted backup of their
 * PCDs, given their encryption key. The server never learns the encryption
 * key.
 *
 * The knownRevision indicates the previous version already known to the client.
 * If that is the latest version, no storage is returned.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestDownloadAndDecryptUpdatedStorage(
  zupassServerUrl: string,
  encryptionKey: string,
  knownRevision: string | undefined
): Promise<DownloadAndDecryptUpdateResult> {
  try {
    const encryptionKeyHash = await getHash(encryptionKey);
    const storageResult = await requestEncryptedStorage(
      zupassServerUrl,
      encryptionKeyHash,
      knownRevision
    );

    if (!storageResult.success) {
      console.error(`error loading e2ee data`, storageResult.error);
      return storageResult;
    }

    if (!storageResult.value.encryptedBlob) {
      if (!knownRevision) {
        console.error("missing e2ee data when downloading without revision");
        return {
          error: {
            name: ERROR_NAME_BAD_RESPONSE,
            detailedMessage:
              "missing e2ee data when downloading without revision"
          },
          success: false
        };
      }
      return {
        value: { revision: storageResult.value.revision },
        success: true
      };
    }

    const encryptedStorage = JSON.parse(
      storageResult.value.encryptedBlob
    ) as EncryptedPacket;

    const decrypted = await passportDecrypt(encryptedStorage, encryptionKey);
    return {
      value: {
        storage: JSON.parse(decrypted) as SyncedEncryptedStorage,
        revision: storageResult.value.revision
      },
      success: true
    };
  } catch (e) {
    console.error(`error loading e2ee data`, e);
    return {
      error: { name: ERROR_NAME_UNKNOWN, detailedMessage: getErrorMessage(e) },
      success: false
    };
  }
}
