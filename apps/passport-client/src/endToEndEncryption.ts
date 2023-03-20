import { PCDCollection } from "@pcd/pcd-collection";
import { EncryptedPacket, PCDCrypto } from "passport-crypto";

const cryptoPromise = PCDCrypto.newInstance();

export async function encryptPCDs(collection: PCDCollection) {
  const crypto = await cryptoPromise;
  const serializedPCDs = JSON.stringify(await collection.serializeAll());

  const nonce = crypto.generateRandomKey(192);

  const ciphertext = crypto.xchacha20Encrypt(
    serializedPCDs,
    nonce,
    this.encryptionKey,
    ""
  );

  return {
    nonce,
    ciphertext,
  };
}

export async function decryptPCDsInto(
  encryptedPCDs: EncryptedPacket,
  collection: PCDCollection
) {
  const plaintext = this.passportCrypto.xchacha20Decrypt(
    encryptedPCDs.ciphertext,
    encryptedPCDs.nonce,
    this.encryptionKey,
    ""
  );

  if (!plaintext) {
    throw new Error("could not decrypto pcds");
  }

  const serializedPCDs = JSON.parse(plaintext);

  collection.deserializeAllAndAdd(serializedPCDs);
}
