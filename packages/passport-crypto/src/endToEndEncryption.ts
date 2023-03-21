import { PCDCollection } from "@pcd/pcd-collection";
import { PCDCrypto } from "./passport-crypto";
import { EncryptedPacket } from "./types";

const cryptoPromise = PCDCrypto.newInstance();

export async function encryptPCDs(
  collection: PCDCollection,
  encryptionKey: string
) {
  const crypto = await cryptoPromise;
  const serializedPCDs = JSON.stringify(await collection.serializeAll());

  const nonce = crypto.generateRandomKey(192);

  const ciphertext = crypto.xchacha20Encrypt(
    serializedPCDs,
    nonce,
    encryptionKey,
    "abc"
  );

  return {
    nonce,
    ciphertext,
  };
}

export async function decryptPCDsInto(
  encryptedPCDs: EncryptedPacket,
  collection: PCDCollection,
  encryptionKey: string
): Promise<void> {
  const crypto = await cryptoPromise;

  const plaintext = crypto.xchacha20Decrypt(
    encryptedPCDs.ciphertext,
    encryptedPCDs.nonce,
    encryptionKey,
    "abc"
  );

  if (!plaintext) {
    throw new Error("could not decrypto pcds");
  }

  const serializedPCDs = JSON.parse(plaintext);

  await collection.deserializeAllAndAdd(serializedPCDs);
}
