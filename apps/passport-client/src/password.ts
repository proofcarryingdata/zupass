import { HexString, PCDCrypto } from "@pcd/passport-crypto";
import zxcvbn from "zxcvbn";
import { Dispatcher } from "./dispatch";
import { updateBlobKeyForEncryptedStorage } from "./useSyncE2EEStorage";

// Must not be "too guessable", "very guessable", or "somewhat guessable"
export const MINIMUM_PASSWORD_STRENGTH = 2;

export const checkPasswordStrength = (password: string): boolean => {
  const { score } = zxcvbn(password);
  return score >= MINIMUM_PASSWORD_STRENGTH;
};

export const PASSWORD_MINIMUM_LENGTH = 8;

// For when the user has not set a password yet, and wants to add one
export const setPassword = async (
  newPassword: string,
  currentEncryptionKey: HexString,
  dispatch: Dispatcher
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
};
