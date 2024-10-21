import { HexString, PCDCrypto } from "@pcd/passport-crypto";
import { SerializedPCD } from "@pcd/pcd-types";
import { SemaphoreSignaturePCD } from "@pcd/semaphore-signature-pcd";
import { Dispatcher, ZuUpdate } from "./dispatch";
import { updateBlobKeyForEncryptedStorage } from "./useSyncE2EEStorage";

// From https://dropbox.tech/security/zxcvbn-realistic-password-strength-estimation.
export enum PasswordStrength {
  WEAK = 0,
  MODERATE = 1,
  STRONG = 2
}

export const PASSWORD_MINIMUM_LENGTH = 8;

// For when the user has not set a password yet, and wants to add one
export const setPassword = async (
  newPassword: string,
  currentEncryptionKey: HexString,
  knownServerStorageRevision: string | undefined,
  dispatch: Dispatcher,
  update: ZuUpdate,
  credential?: SerializedPCD<SemaphoreSignaturePCD>
): Promise<void> => {
  const crypto = await PCDCrypto.newInstance();
  const { salt: newSalt, key: newEncryptionKey } =
    await crypto.generateSaltAndEncryptionKey(newPassword);

  const res = await updateBlobKeyForEncryptedStorage(
    currentEncryptionKey,
    newEncryptionKey,
    newSalt,
    knownServerStorageRevision,
    credential
  );

  if (!res.success) {
    if (res.error.name === "PasswordIncorrect") {
      throw new Error(
        "Incorrect password. If you've lost your password, reset your account below."
      );
    } else if (res.error.name === "Conflict") {
      update({ extraDownloadRequested: true });
      throw new Error(`Cannot change password while PCDs are syncing.  
        Wait for download to complete or reload the page and try again.`);
    } else {
      throw new Error(
        `Failed to set password - try again later.  Request failed with message ${res.error}`
      );
    }
  }

  dispatch({
    type: "change-password",
    newEncryptionKey,
    newSalt
  });
  update({
    serverStorageRevision: res.value.revision,
    serverStorageHash: res.value.storageHash
  });
};
