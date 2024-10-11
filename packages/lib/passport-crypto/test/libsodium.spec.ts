import regularSodium from "libsodium-wrappers-sumo";
import { describe, expect, it } from "vitest";
import { passportDecrypt, passportEncrypt } from "../src/endToEndEncryption";
import { getSodium } from "../src/libsodium";
import { PCDCrypto } from "../src/passportCrypto";

describe("custom libsodium build is equivalent to regular build", async () => {
  const customSodium = await getSodium();
  await regularSodium.ready;
  const customSodiumCryptoPromise = PCDCrypto.newInstance(customSodium);
  const regularSodiumCryptoPromise = PCDCrypto.newInstance(regularSodium);
  const customSodiumCrypto = await customSodiumCryptoPromise;
  const regularSodiumCrypto = await regularSodiumCryptoPromise;

  it("creates the same hash", async () => {
    const hash1 = customSodiumCrypto.cryptoHash("hello");
    const hash2 = regularSodiumCrypto.cryptoHash("hello");
    expect(hash1).toEqual(hash2);
  });

  it("produces the same argon2 hashes", async () => {
    const customGeneratedSalt = customSodiumCrypto.generateSalt();
    const regularGeneratedSalt = regularSodiumCrypto.generateSalt();

    const customArgon2HashWithCustomSalt = customSodiumCrypto.argon2(
      "password",
      customGeneratedSalt
    );
    const regularArgon2HashWithCustomSalt = regularSodiumCrypto.argon2(
      "password",
      customGeneratedSalt
    );

    expect(customArgon2HashWithCustomSalt).toEqual(
      regularArgon2HashWithCustomSalt
    );

    const customArgon2HashWithRegularSalt = customSodiumCrypto.argon2(
      "password",
      regularGeneratedSalt
    );
    const regularArgon2HashWithRegularSalt = regularSodiumCrypto.argon2(
      "password",
      regularGeneratedSalt
    );
    expect(customArgon2HashWithRegularSalt).toEqual(
      regularArgon2HashWithRegularSalt
    );
  });

  it("encrypts and decrypts the same data identically", async () => {
    const testUser = {
      commitment: "a",
      email: "b",
      name: "c",
      role: "e",
      uuid: "g"
    };
    const encryptionKey = customSodiumCrypto.generateRandomKey(256);
    const sourcePCDs = [{ id: 1 }];
    const plaintext = JSON.stringify({
      pcds: sourcePCDs,
      self: testUser
    });
    const encryptedWithCustom = await passportEncrypt(
      plaintext,
      encryptionKey,
      customSodiumCryptoPromise
    );
    const encryptedWithRegular = await passportEncrypt(
      plaintext,
      encryptionKey,
      regularSodiumCryptoPromise
    );

    const encryptedWithCustomDecryptedWithCustom = await passportDecrypt(
      encryptedWithCustom,
      encryptionKey,
      customSodiumCryptoPromise
    );

    const encryptedWithRegularDecryptedWithCustom = await passportDecrypt(
      encryptedWithRegular,
      encryptionKey,
      customSodiumCryptoPromise
    );

    const encryptedWithRegularDecryptedWithRegular = await passportDecrypt(
      encryptedWithRegular,
      encryptionKey,
      regularSodiumCryptoPromise
    );

    const encryptedWithCustomDecryptedWithRegular = await passportDecrypt(
      encryptedWithCustom,
      encryptionKey,
      regularSodiumCryptoPromise
    );

    expect(encryptedWithCustomDecryptedWithCustom).toEqual(plaintext);
    expect(encryptedWithRegularDecryptedWithRegular).toEqual(plaintext);
    expect(encryptedWithCustomDecryptedWithRegular).toEqual(plaintext);
    expect(encryptedWithRegularDecryptedWithCustom).toEqual(plaintext);

    const parsed = JSON.parse(encryptedWithCustomDecryptedWithCustom);
    const destinationPCDs = parsed.pcds as Array<{ id: number }>;
    expect(destinationPCDs.length).toEqual(1);
    expect(destinationPCDs[0].id).toEqual(sourcePCDs[0].id);
    expect(parsed.self).toEqual(testUser);
  });
});
