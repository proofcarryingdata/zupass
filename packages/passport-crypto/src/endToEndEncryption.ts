import { PCDCrypto } from "./passportCrypto";
import { EncryptedPacket } from "./types";

const cryptoPromise = PCDCrypto.newInstance();

export async function getHash(str: string) {
  const crypto = await cryptoPromise;
  const hashed = crypto.cryptoHash(str);
  return hashed;
}

export async function encryptStorage<T>(
  data: T,
  encryptionKey: string
): Promise<EncryptedPacket> {
  const crypto = await cryptoPromise;

  const nonce = crypto.generateRandomKey(192);
  const ciphertext = crypto.xchacha20Encrypt(
    JSON.stringify(data),
    nonce,
    encryptionKey,
    "abc"
  );

  return {
    nonce,
    ciphertext,
  };
}

export async function decryptStorage<T>(
  encryptedStorage: EncryptedPacket,
  encryptionKey: string
): Promise<T> {
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

  return JSON.parse(plaintext) as T;
}
