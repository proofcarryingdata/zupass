import { HexString, PCDCrypto } from "@pcd/passport-crypto";
import { Dispatcher, ZuUpdate } from "./dispatch";
import { updateBlobKeyForEncryptedStorage } from "./useSyncE2EEStorage";

// From https://dropbox.tech/security/zxcvbn-realistic-password-strength-estimation.
export enum PasswordStrength {
  WEAK = 0,
  MODERATE = 1,
  STRONG = 2
}

export const checkPasswordStrength = (password: string): boolean => {
  if (!window.zxcvbn) {
    throw new Error("zxcvbn has not been loaded yet");
  }
  const { score } = window.zxcvbn(password);
  return score >= PasswordStrength.STRONG;
};

export const PASSWORD_MINIMUM_LENGTH = 8;

// For when the user has not set a password yet, and wants to add one
export const setPassword = async (
  newPassword: string,
  currentEncryptionKey: HexString,
  dispatch: Dispatcher,
  update: ZuUpdate
) => {
  const crypto = await PCDCrypto.newInstance();
  const { salt: newSalt, key: newEncryptionKey } =
    await crypto.generateSaltAndEncryptionKey(newPassword);
  const res = await updateBlobKeyForEncryptedStorage(
    currentEncryptionKey,
    newEncryptionKey,
    newSalt
  );

  // Meaning password is incorrect, as old row is not found
  if (!res.success && res.error.name === "PasswordIncorrect") {
    throw new Error(
      "Incorrect password. If you've lost your password, reset your account below."
    );
  }

  if (!res.success) {
    throw new Error(`Request failed with message ${res.error}`);
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
