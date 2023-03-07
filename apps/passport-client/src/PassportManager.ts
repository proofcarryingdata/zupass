import { PassportCrypto } from "passport-crypto";
import { EncryptedPacket, PCD } from "pcd-types";

enum UserStatus {
  REGULAR,
  UNVERIFIED,
}

class PassportE2EEOperator {
  public identifier!: string;
  private masterKey!: string;
  private serverPassword!: string;
  private userStatus!: UserStatus;
  private passportCrypto!: PassportCrypto;

  // Create new user
  constructor(_passportCrypto: PassportCrypto) {
    // Assumes that PassportCrypto has been initialized
    this.passportCrypto = _passportCrypto;
    this.userStatus = UserStatus.UNVERIFIED;

    this.masterKey = this.passportCrypto.generateRandomKey(256);
    this.serverPassword = this.passportCrypto.generateRandomKey(256);
  }

  private encryptPCDs(pcds: PCD[]): EncryptedPacket {
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

  private decryptPCDs(encryptedPacket: EncryptedPacket): PCD[] | null {
    const aed = this.identifier; // TODO: add version?
    const plaintext = this.passportCrypto.xchacha20Decrypt(
      encryptedPacket.ciphertext,
      encryptedPacket.nonce,
      this.masterKey,
      aed
    );

    return plaintext != null ? JSON.parse(plaintext) : null;
  }

  // public writePCDs(pcds: PCD[]): boolean {
  //   const packet = this.encryptPCDs(pcds);
  //   // TODO: send to server
  // }

  // public readPCDs(): PCD[] {
  //   // TODO: receive from server
  //   const pcds = this.decryptPCDs(packet.nonce, packet.ciphertext);
  // }

  public testPCDRW() {
    const pcds = [
      {
        type: "test",
      },
      {
        type: "test2",
      },
    ];

    const packet = this.encryptPCDs(pcds);
    const decryptedPCDs = this.decryptPCDs(packet);
    console.log("original", pcds);
    console.log("decryptedPCDs", decryptedPCDs);
  }
}

export class PassportManager {
  private pcds: PCD[] = [];
  private passportCrypto!: PassportCrypto;

  async initialize(): Promise<void> {
    await this.passportCrypto.initialize();
  }

  constructor() {
    this.passportCrypto = new PassportCrypto();
  }

  public async test() {
    await this.initialize();
    const operator = new PassportE2EEOperator(this.passportCrypto);
    operator.testPCDRW();
  }
}
