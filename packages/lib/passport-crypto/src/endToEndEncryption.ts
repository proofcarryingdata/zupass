import { PCDCrypto } from "./passportCrypto";
import { EncryptedPacket } from "./types";

const sharedCryptoPromise = PCDCrypto.newInstance();

export async function getHash(
  str: string,
  cryptoPromise: Promise<PCDCrypto> = sharedCryptoPromise
): Promise<string> {
  const crypto = await cryptoPromise;
  const hashed = crypto.cryptoHash(str);
  return hashed;
}

export async function passportEncrypt(
  data: string,
  encryptionKey: string,
  cryptoPromise: Promise<PCDCrypto> = sharedCryptoPromise
): Promise<EncryptedPacket> {
  const crypto = await cryptoPromise;

  const nonce = crypto.generateRandomKey(192);
  const ciphertext = crypto.xchacha20Encrypt(data, nonce, encryptionKey, "abc");

  return {
    nonce,
    ciphertext
  };
}

export async function passportDecrypt(
  encryptedStorage: EncryptedPacket,
  encryptionKey: string,
  cryptoPromise: Promise<PCDCrypto> = sharedCryptoPromise
): Promise<string> {
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

  return plaintext;
}
