import { getSodium, Sodium } from "./libsodium";
import { Base64String, HexString, Utf8String } from "./types";
import * as utils from "./utils";
import { arrayBufferToHexString } from "./utils";

/**
 * This class contains cryptographic primitives that are used by the PCD
 * application SDK and downstream packages.
 */
export class PCDCrypto {
  private sodium: Sodium;

  public static async newInstance(sodium?: Sodium): Promise<PCDCrypto> {
    sodium = sodium ?? (await getSodium());
    return new PCDCrypto(sodium);
  }

  private constructor(sodium: Sodium) {
    this.sodium = sodium;
  }

  public cryptoHash(str: string): string {
    return arrayBufferToHexString(this.sodium.crypto_hash(str));
  }

  public generateRandomKey(bits = 256): HexString {
    const bytes = bits / 8;
    const arrayBuffer = utils
      .getCrypto()
      .getRandomValues(new Uint8Array(bytes));
    return utils.arrayBufferToHexString(arrayBuffer);
  }

  /**
   * Combines generateSalt and argon2 function, returns both a random salt
   * and the resulting 32-byte encryption key.
   */
  public generateSaltAndEncryptionKey(password: Utf8String): {
    key: string;
    salt: string;
  } {
    const salt = this.generateSalt();
    const key = this.argon2(password, salt, 32);
    return { key, salt };
  }

  public generateSalt(
    length: number = this.sodium.crypto_pwhash_SALTBYTES
  ): HexString {
    if (length < this.sodium.crypto_pwhash_SALTBYTES) {
      throw Error(
        `Salt must be at least ${this.sodium.crypto_pwhash_SALTBYTES}`
      );
    }
    const buffer = this.sodium.randombytes_buf(length);
    return utils.arrayBufferToHexString(buffer);
  }

  public argon2(password: Utf8String, salt: HexString, length = 32): HexString {
    const result = this.sodium.crypto_pwhash(
      length,
      utils.stringToArrayBuffer(password),
      utils.hexStringToArrayBuffer(salt),
      // `oplimit` represents the maximum amount of computations to perform
      // for generating a key. `crypto_pwhash_OPSLIMIT_INTERACTIVE` is recommended
      // for intereactive, online applications such as Zupass.
      // Source: https://libsodium.gitbook.io/doc/password_hashing/default_phf
      this.sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
      // `memlimit` represents the maximum amount of RAM in bytes thet function
      // will use. It is required to use the same values for `opslimit` and `memlimit`.
      this.sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
      this.sodium.crypto_pwhash_ALG_DEFAULT,
      "hex"
    );
    return result;
  }

  public xchacha20Encrypt(
    plaintext: Utf8String,
    nonce: HexString,
    key: HexString,
    assocData?: Utf8String
  ): Base64String {
    if (nonce.length !== 48) {
      throw Error("Nonce must be 24 bytes");
    }
    const arrayBuffer = this.sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
      plaintext,
      assocData || null,
      null,
      utils.hexStringToArrayBuffer(nonce),
      utils.hexStringToArrayBuffer(key)
    );
    return utils.arrayBufferToBase64(arrayBuffer);
  }

  public xchacha20Decrypt(
    ciphertext: Base64String,
    nonce: HexString,
    key: HexString,
    assocData?: Utf8String | Uint8Array
  ): Utf8String | null {
    if (nonce.length !== 48) {
      throw Error("Nonce must be 24 bytes");
    }
    try {
      return this.sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
        null,
        utils.base64ToArrayBuffer(ciphertext),
        assocData || null,
        utils.hexStringToArrayBuffer(nonce),
        utils.hexStringToArrayBuffer(key),
        "text"
      );
    } catch {
      return null;
    }
  }

  public randombytesDeterministic(
    length: number,
    seed: Uint8Array
  ): Uint8Array | null {
    try {
      return this.sodium.randombytes_buf_deterministic(length, seed);
    } catch {
      return null;
    }
  }
}
