import { PCDCrypto } from "@pcd/passport-crypto";
import { requestPasswordSalt } from "@pcd/passport-interface";
import zxcvbn from "zxcvbn";
import { appConfig } from "./appConfig";
import { Dispatcher } from "./dispatch";
import { loadEncryptionKey } from "./localstorage";
import {
  updateBlobKeyForEncryptedStorage,
  uploadStorage
} from "./useSyncE2EEStorage";

// Must not be "too guessable", "very guessable", or "somewhat guessable"
export const MINIMUM_PASSWORD_STRENGTH = 2;

export const checkPasswordStrength = (password: string): boolean => {
  const { score } = zxcvbn(password);
  return score >= MINIMUM_PASSWORD_STRENGTH;
};

export const PASSWORD_MINIMUM_LENGTH = 8;

// For when the user has not set a password yet, and wants to add one
export const setPassword = async (
  email: string,
  newPassword: string,
  dispatch: Dispatcher
) => {
  const saltResult = await requestPasswordSalt(appConfig.zupassServer, email);

  if (!saltResult.success) {
    throw new Error("Error occurred while fetching salt from server");
  }

  const crypto = await PCDCrypto.newInstance();
  const currentEncryptionKey = loadEncryptionKey();
  const { salt: newSalt, key: newEncryptionKey } =
    await crypto.generateSaltAndEncryptionKey(newPassword);
  const res = await updateBlobKeyForEncryptedStorage(
    currentEncryptionKey,
    newEncryptionKey,
    newSalt
  );

  if (!res.success) {
    throw new Error(`Request failed with message ${res.error}`);
  }

  dispatch({
    type: "change-password",
    newEncryptionKey,
    newSalt
  });
  // to make sure the salt is uploaded properly
  await uploadStorage();
};
