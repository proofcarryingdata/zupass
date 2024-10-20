import { assert, describe, it } from "vitest";
import { passportDecrypt, passportEncrypt } from "../src/endToEndEncryption";
import { PCDCrypto } from "../src/passportCrypto";
import {
  arrayBufferToBase64,
  arrayBufferToHexString,
  arrayBufferToString,
  base64ToArrayBuffer,
  base64ToHex,
  hexStringToArrayBuffer,
  hexToBase64,
  stringToArrayBuffer
} from "../src/utils";

describe("Passport encryption", function () {
  it("Encryption and decryption works properly", async function () {
    const testUser = {
      commitment: "a",
      email: "b",
      name: "c",
      role: "e",
      uuid: "g"
    };
    const pcdCrypto = await PCDCrypto.newInstance();
    const encryptionKey = pcdCrypto.generateRandomKey(256);
    const sourcePCDs = [{ id: 1 }];
    const plaintext = JSON.stringify({
      pcds: sourcePCDs,
      self: testUser
    });
    const encrypted = await passportEncrypt(plaintext, encryptionKey);
    const decrypted = await passportDecrypt(encrypted, encryptionKey);
    assert.equal(decrypted, plaintext);
    const parsed = JSON.parse(decrypted);
    const destinationPCDs = parsed.pcds as Array<{ id: number }>;
    assert.equal(destinationPCDs.length, 1);
    assert.equal(destinationPCDs[0].id, sourcePCDs[0].id);
    assert.deepEqual(parsed.self, testUser);
  });

  it("Salt and key generation works", async function () {
    const pcdCrypto = await PCDCrypto.newInstance();
    const password = "password";
    const { key, salt } = pcdCrypto.generateSaltAndEncryptionKey(password);
    assert.equal(key.length, 64);
    assert.equal(salt.length, 32);
  });

  it("Random bytes deterministic works", async function () {
    const pcdCrypto = await PCDCrypto.newInstance();
    const seed = pcdCrypto.randombytesDeterministic(
      32,
      new Uint8Array([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
        21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32
      ])
    );
    assert(seed !== null);
    assert.equal(seed.length, 32);
  });

  it("cryptoHash works", async function () {
    const pcdCrypto = await PCDCrypto.newInstance();
    const hash = pcdCrypto.cryptoHash("hello");
    assert.equal(
      hash,
      "9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca72323c3d99ba5c11d7c7acc6e14b8c5da0c4663475c2e5c3adef46f73bcdec043"
    );
  });

  it("stringToArrayBuffer works", async function () {
    const buffer = stringToArrayBuffer("hello");
    assert.equal(buffer.length, 5);
    assert.equal(buffer[0], 104);
    assert.equal(buffer[1], 101);
    assert.equal(buffer[2], 108);
    assert.equal(buffer[3], 108);
    assert.equal(buffer[4], 111);
  });

  it("arrayBufferToString works", async function () {
    const buffer = new Uint8Array([104, 101, 108, 108, 111]);
    const string = arrayBufferToString(buffer);
    assert.equal(string, "hello");
  });

  it("arrayBufferToHexString works", async function () {
    const buffer = new Uint8Array([104, 101, 108, 108, 111]);
    const hexString = arrayBufferToHexString(buffer);
    assert.equal(hexString, "68656c6c6f");
  });

  it("hexStringToArrayBuffer works", async function () {
    const hexString = "68656c6c6f";
    const buffer = hexStringToArrayBuffer(hexString);
    assert.equal(buffer.length, 5);
    assert.equal(buffer[0], 104);
    assert.equal(buffer[1], 101);
    assert.equal(buffer[2], 108);
  });

  it("base64ToArrayBuffer works", async function () {
    const base64 = "aGVsbG8=";
    const buffer = base64ToArrayBuffer(base64);
    assert.equal(buffer.length, 5);
    assert.equal(buffer[0], 104);
    assert.equal(buffer[1], 101);
    assert.equal(buffer[2], 108);
  });

  it("arrayBufferToBase64 works", async function () {
    const buffer = new Uint8Array([104, 101, 108, 108, 111]);
    const base64 = arrayBufferToBase64(buffer);
    assert.equal(base64, "aGVsbG8=");
  });

  it("hexToBase64 works", async function () {
    const hexString = "68656c6c6f";
    const base64 = hexToBase64(hexString);
    assert.equal(base64, "aGVsbG8=");
  });

  it("base64ToHex works", async function () {
    const base64 = "aGVsbG8=";
    const hexString = base64ToHex(base64);
    assert.equal(hexString, "68656c6c6f");
  });
});
