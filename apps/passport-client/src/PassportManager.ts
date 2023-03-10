import { PassportCrypto } from "passport-crypto";
import { EncryptedPacket, PCD, UserStatus } from "pcd-types";

// TODO: Replace with real one once it has serde
export interface DummyPCD {
  type: string;
  claim: string;
  proof: string;
}

const WEBSITE_ROOT = "http://localhost:3002";

class PassportE2EEOperator {
  // TODO: Use ClientUser instead
  public identifier!: string;
  private masterKey!: string;
  private serverPassword!: string;
  private userStatus!: UserStatus;
  private passportCrypto!: PassportCrypto;

  // Create new user
  constructor(_identifier: string, _passportCrypto: PassportCrypto) {
    // Assumes that PassportCrypto has been initialized
    this.passportCrypto = _passportCrypto;
    this.userStatus = UserStatus.UNVERIFIED;
    this.identifier = _identifier;
    this.masterKey = this.passportCrypto.generateRandomKey(256);
    this.serverPassword = this.passportCrypto.generateRandomKey(256);
  }

  private encryptPCDs(pcds: DummyPCD[]): EncryptedPacket {
    const plaintext = JSON.stringify(pcds);
    const nonce = this.passportCrypto.generateRandomKey(192);

    const aed = this.identifier; // TODO: add version?

    const ciphertext = this.passportCrypto.xchacha20Encrypt(
      plaintext,
      nonce,
      this.masterKey,
      aed
    );
    return {
      nonce,
      ciphertext,
    };
  }

  private decryptPCDs(encryptedPacket: EncryptedPacket): DummyPCD[] | null {
    const aed = this.identifier; // TODO: add version?
    const plaintext = this.passportCrypto.xchacha20Decrypt(
      encryptedPacket.ciphertext,
      encryptedPacket.nonce,
      this.masterKey,
      aed
    );

    return plaintext != null ? JSON.parse(plaintext) : null;
  }

  public async writePCDs(pcds: DummyPCD[]): Promise<boolean> {
    const packet = await this.encryptPCDs(pcds);
    const response = await fetch(WEBSITE_ROOT + "/user/write/", {
      method: "POST", // TODO: make helper function for these
      body: JSON.stringify({
        identifier: this.identifier,
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
      WEBSITE_ROOT +
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
    const response = await fetch(WEBSITE_ROOT + "/user/create/", {
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

export class PassportManager {
  public identifier!: string;
  private pcds: PCD[] = [];
  private passportCrypto!: PassportCrypto;

  async initialize(): Promise<void> {
    await this.passportCrypto.initialize();
  }

  constructor(identifier: string) {
    this.identifier = identifier;
    this.passportCrypto = new PassportCrypto();
  }

  public async test() {
    await this.initialize();
    const operator = new PassportE2EEOperator(
      this.identifier,
      this.passportCrypto
    );
    operator.testPCDRW();
  }
}
