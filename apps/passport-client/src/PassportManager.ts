import { EncryptedPacket, PassportCrypto } from "passport-crypto";
import { PASSPORT_SERVER_URL } from "./urls";

class E2EE {
  private masterKey: string;
  private serverPassword: string;
  private passportCrypto: PassportCrypto;

  public static async newInstance() {
    const crypto = await PassportCrypto.newInstance();
    return new E2EE(crypto);
  }

  private constructor(passportCrypto: PassportCrypto) {
    // Assumes that PassportCrypto has been initialized
    this.passportCrypto = passportCrypto;
    this.masterKey = this.passportCrypto.generateRandomKey(256);
    this.serverPassword = this.passportCrypto.generateRandomKey(256);
  }

  private encryptPCDs(pcds: DummyPCD[]): EncryptedPacket {
    const plaintext = JSON.stringify(pcds);
    const nonce = this.passportCrypto.generateRandomKey(192);

    const ciphertext = this.passportCrypto.xchacha20Encrypt(
      plaintext,
      nonce,
      this.masterKey,
      ""
    );
    return {
      nonce,
      ciphertext,
    };
  }

  private decryptPCDs(encryptedPacket: EncryptedPacket): DummyPCD[] | null {
    const plaintext = this.passportCrypto.xchacha20Decrypt(
      encryptedPacket.ciphertext,
      encryptedPacket.nonce,
      this.masterKey,
      ""
    );

    return plaintext != null ? JSON.parse(plaintext) : null;
  }

  public async writePCDs(pcds: DummyPCD[]): Promise<boolean> {
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

  public async readPCDs(): Promise<DummyPCD[]> {
    const response = await fetch(
      PASSPORT_SERVER_URL +
        "/user/fetch/?" +
        new URLSearchParams({
          identifier: this.identifier,
        })
    );

    const res = await response.json();
    console.log("read response", res);
    const packet = JSON.parse(res.encryptedBlob) as EncryptedPacket;

    const pcds = await this.decryptPCDs(packet);
    return pcds;
  }

  public async testPCDRW() {
    const pcds = [
      {
        type: "testtype",
        claim: "testclaim",
        proof: "testproof",
      },
      {
        type: "test2type",
        claim: "test2claim",
        proof: "test2proof",
      },
    ];

    // create test user
    const response = await fetch(PASSPORT_SERVER_URL + "/user/create/", {
      method: "POST",
      body: JSON.stringify({
        identifier: this.identifier,
        status: UserStatus.REGULAR,
        serverPassword: this.serverPassword,
        encryptedBlob: "",
      }),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    const res = await response.json();
    console.log("create test user response", res);

    console.log("going to writePCDs", pcds);
    const success = await this.writePCDs(pcds);
    console.log("writePCDs success", success);
    const readback = await this.readPCDs();
    console.log("readback", readback);
  }
}
