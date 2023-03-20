import { getSodium } from "./libsodium";
import { Base64String, HexString, Utf8String } from "./types";
import * as utils from "./utils";

export type Sodium = Awaited<ReturnType<typeof getSodium>>;

export class PassportCrypto {
  private sodium: Sodium;

  public static async newInstance() {
    const sodium = await getSodium();
    return new PassportCrypto(sodium);
  }

  private constructor(sodium: Sodium) {
    this.sodium = sodium;
  }

  async initialize() {
    /** Functions using Libsodium have to await
     * promise before performing any library calls */
    this.sodium = await getSodium();
  }

  public generateRandomKey(bits: number): HexString {
    const bytes = bits / 8;
    const arrayBuffer = utils
      .getGlobalScope()
      .crypto.getRandomValues(new Uint8Array(bytes));
    return utils.arrayBufferToHexString(arrayBuffer);
  }

  public argon2(
    password: Utf8String,
    salt: HexString,
    iterations: number,
    bytes: number,
    length: number
  ): HexString {
    const result = this.sodium!.crypto_pwhash(
      length,
      utils.stringToArrayBuffer(password),
      utils.hexStringToArrayBuffer(salt),
      iterations,
      bytes,
      this.sodium!.crypto_pwhash_ALG_DEFAULT,
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
    const arrayBuffer = this.sodium!.crypto_aead_xchacha20poly1305_ietf_encrypt(
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
      return this.sodium!.crypto_aead_xchacha20poly1305_ietf_decrypt(
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
}
