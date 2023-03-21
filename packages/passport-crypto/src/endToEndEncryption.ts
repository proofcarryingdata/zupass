import { EncryptedStorage } from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
import { PCDCrypto } from "./passport-crypto";
import { EncryptedPacket } from "./types";

const cryptoPromise = PCDCrypto.newInstance();

export async function encryptStorage(
  collection: PCDCollection,
  serverToken: string,
  encryptionKey: string
): Promise<EncryptedPacket> {
  const crypto = await cryptoPromise;
  const serializedPCDs = await collection.serializeAll();

  const encryptedStorage: EncryptedStorage = {
    pcds: serializedPCDs,
    serverToken,
  };

  const nonce = crypto.generateRandomKey(192);
  const ciphertext = crypto.xchacha20Encrypt(
    JSON.stringify(encryptedStorage),
    nonce,
    encryptionKey,
    "abc"
  );

  return {
    nonce,
    ciphertext,
  };
}

export async function decryptStorage(
  encryptedStorage: EncryptedPacket,
  encryptionKey: string
): Promise<EncryptedStorage> {
  const crypto = await cryptoPromise;

  const plaintext = crypto.xchacha20Decrypt(
    encryptedStorage.ciphertext,
    encryptedStorage.nonce,
    encryptionKey,
    "abc"
  );

  if (!plaintext) {
    throw new Error("could not decrypt storage");
  }

  return JSON.parse(plaintext) as EncryptedStorage;
}
