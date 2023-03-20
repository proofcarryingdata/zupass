import { SerializedPCD } from "@pcd/pcd-types";
import { Identity } from "@semaphore-protocol/identity";
import { EncryptedPacket, PCDCrypto } from "passport-crypto";
import { PASSPORT_SERVER_URL } from "./urls";

export class EndToEndEncryption {
  private encryptionKey: string;
  private serverPassword: string;
  private passportCrypto: PCDCrypto;
  private identity: Identity;

  public static async newInstance(identity: Identity) {
    const crypto = await PCDCrypto.newInstance();
    return new EndToEndEncryption(identity, crypto);
  }

  /**
   * Assumes that `passportCrypto` has been initialized.
   */
  private constructor(identity: Identity, passportCrypto: PCDCrypto) {
    this.passportCrypto = passportCrypto;
    this.encryptionKey = this.passportCrypto.generateRandomKey(256);
    this.serverPassword = this.passportCrypto.generateRandomKey(256);
    this.identity = identity;
  }

  private encryptPCDs(pcds: SerializedPCD[]): EncryptedPacket {
    const plaintext = JSON.stringify(pcds);
    const nonce = this.passportCrypto.generateRandomKey(192);

    const ciphertext = this.passportCrypto.xchacha20Encrypt(
      plaintext,
      nonce,
      this.encryptionKey,
      ""
    );
    return {
      nonce,
      ciphertext,
    };
  }

  private decryptPCDs(
    encryptedPacket: EncryptedPacket
  ): SerializedPCD[] | null {
    const plaintext = this.passportCrypto.xchacha20Decrypt(
      encryptedPacket.ciphertext,
      encryptedPacket.nonce,
      this.encryptionKey,
      ""
    );

    return plaintext != null ? JSON.parse(plaintext) : null;
  }

  public async writePCDs(pcds: SerializedPCD[]): Promise<boolean> {
    const packet = await this.encryptPCDs(pcds);
    const response = await fetch(PASSPORT_SERVER_URL + "/user/write/", {
      method: "POST", // TODO: make helper function for these
      body: JSON.stringify({
        serverPassword: this.serverPassword,
        encryptedBlob: JSON.stringify(packet),
      }),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    const res = await response.json();

    console.log("response", res);
    return res.success === 1;
  }

  public async readPCDs(): Promise<SerializedPCD[]> {
    const response = await fetch(
      PASSPORT_SERVER_URL +
        "/user/fetch/?" +
        new URLSearchParams({
          identifier: this.identity.commitment.toString(),
        })
    );

    const res = await response.json();
    console.log("read response", res);
    const packet = JSON.parse(res.encryptedBlob) as EncryptedPacket;

    const pcds = await this.decryptPCDs(packet);
    return pcds;
  }
}
