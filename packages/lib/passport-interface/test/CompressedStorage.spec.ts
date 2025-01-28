import { faker } from "@faker-js/faker";
import { PCDCollection } from "@pcd/pcd-collection";
import { PCDPackage } from "@pcd/pcd-types";
import { POD, POD_INT_MAX, POD_INT_MIN } from "@pcd/pod";
import { PODPCD, PODPCDPackage } from "@pcd/pod-pcd";
import { assert, expect } from "chai";
import { describe } from "mocha";
import { FeedSubscriptionManager, User } from "../src";
import {
  compressStringAndEncodeAsBase64,
  decompressStringFromBase64,
  deserializeStorage,
  isSyncedEncryptedStorageV6,
  serializeStorage
} from "../src/EncryptedStorage";
import { MockFeedApi } from "./MockFeedApi";

let dummyPCDCount = 0;

/**
 * Generate a random string of the given length, using only alphanumeric
 * characters.
 *
 * @param length - The length of the string to generate.
 * @returns A random string of the given length.
 */
function randomString(length: number): string {
  const firstChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_";
  const subsequentChars = firstChars + "0123456789";

  let result = firstChars.charAt(Math.floor(Math.random() * firstChars.length));
  for (let i = 1; i < length; i++) {
    result += subsequentChars.charAt(
      Math.floor(Math.random() * subsequentChars.length)
    );
  }
  return result;
}

/**
 * Returns random data that fits the format of a signature.
 */
function randomSignature(): string {
  // Generate a 64-byte (128 hex characters) signature
  return Array.from({ length: 128 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
}

/**
 * These "public keys" are just random data that fits the format of a public
 * key. There is no real keypair associated with them.
 */
function randomPublicKey(): string {
  // Generate a 32-byte (64 hex characters) public key
  return Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
}

const SIGNER_PUBLIC_KEYS = Array(20).fill(0).map(randomPublicKey);
const OWNER_PUBLIC_KEY = randomPublicKey();

/**
 * Generate a dummy PCD with random values.
 *
 * These PCDs will be "more random" than regular PODPCDs, because:
 * - They do not share entry names between PCDs
 * - The signer public key is random, whereas in reality most users will have
 *   many PCDs from the same signer
 * - Data is unique and random, whereas in reality most users will have some
 *   PCDs with duplicate data (not least in the case of tickets, which are
 *   typically issued twice in different formats but with significant overlap)
 *
 * This means that this data will compress badly compared to real-world data,
 * and so serves as a worst-case baseline.
 *
 * @returns A dummy PODPCD.
 */
function dummyPCD(): PODPCD {
  const dummyPCD = new PODPCD(
    `dummy-pcd-${dummyPCDCount}`,
    POD.load(
      {
        owner: { type: "eddsa_pubkey", value: OWNER_PUBLIC_KEY },
        [randomString(10)]: { type: "string", value: faker.internet.email() },
        [randomString(10)]: { type: "string", value: faker.internet.url() },
        [randomString(10)]: { type: "string", value: faker.lorem.sentences(3) },
        [randomString(10)]: {
          type: "int",
          value: faker.number.bigInt({ min: POD_INT_MIN, max: POD_INT_MAX })
        },
        [randomString(10)]: {
          type: "int",
          value: faker.number.bigInt({ min: POD_INT_MIN, max: POD_INT_MAX })
        },
        [randomString(10)]: {
          type: "int",
          value: faker.number.bigInt({ min: POD_INT_MIN, max: POD_INT_MAX })
        }
      },
      randomSignature(),
      SIGNER_PUBLIC_KEYS[Math.floor(Math.random() * SIGNER_PUBLIC_KEYS.length)]
    )
  );
  dummyPCDCount++;
  return dummyPCD;
}

describe("Compressed storage", () => {
  const packages: PCDPackage[] = [PODPCDPackage];

  // Build a dummy PCD collection with 500 PCDs
  const dummyPCDs = Array(500)
    .fill(0)
    .map(() => dummyPCD());
  const pcds = new PCDCollection(packages, dummyPCDs);

  const subscriptions = new FeedSubscriptionManager(
    new MockFeedApi()
  ).serialize();

  it("should compress and decompress PCD collection", async () => {
    const serializedPCDs = await pcds.serializeCollection();
    const serializedPCDsSizeInBytes = new Blob([serializedPCDs]).size;

    // Compress the PCDs and encode as base64
    const compressedPCDs = compressStringAndEncodeAsBase64(serializedPCDs);
    const compressedPCDsSizeInBytes = new Blob([compressedPCDs]).size;

    expect(serializedPCDsSizeInBytes).greaterThan(compressedPCDsSizeInBytes);

    // Convert base64 string back to Uint8Array, then decompress and decode as string
    const serializedPCDs2 = decompressStringFromBase64(compressedPCDs);

    // Check that the two serialized PCD strings are the same
    assert.equal(serializedPCDs, serializedPCDs2);
  });

  it("should deserialize storage with the latest version", async () => {
    const serializedPCDs = await pcds.serializeCollection();
    const deserialized = await deserializeStorage(
      {
        compressedPCDs: true,
        pcds: compressStringAndEncodeAsBase64(serializedPCDs),
        _storage_version: "v6",
        self: {
          uuid: "",
          commitment: "",
          emails: [],
          salt: "",
          terms_agreed: 1
        } satisfies User,
        subscriptions
      },
      packages
    );

    expect(deserialized.pcds.size()).equal(500);
    expect(serializedPCDs).to.eq(await deserialized.pcds.serializeCollection());
  });

  it("should continue to deserialize storage with old format", async () => {
    const serializedPCDs = await pcds.serializeCollection();
    const deserialized = await deserializeStorage(
      {
        pcds: serializedPCDs,
        _storage_version: "v4",
        self: {
          uuid: "",
          commitment: "",
          emails: [],
          salt: "",
          terms_agreed: 1
        } satisfies User,
        subscriptions
      },
      packages
    );

    expect(deserialized.pcds.size()).equal(500);
    expect(serializedPCDs).to.eq(await deserialized.pcds.serializeCollection());
  });

  it("should deserialize storage with compression turned off", async () => {
    const serializedPCDs = await pcds.serializeCollection();
    const deserialized = await deserializeStorage(
      {
        compressedPCDs: false,
        pcds: serializedPCDs,
        _storage_version: "v6",
        self: {
          uuid: "",
          commitment: "",
          emails: [],
          salt: "",
          terms_agreed: 1
        } satisfies User,
        subscriptions
      },
      packages
    );

    expect(deserialized.pcds.size()).equal(500);
    expect(serializedPCDs).to.eq(await deserialized.pcds.serializeCollection());
  });

  it("should round-trip serializeStorage and deserializeStorage when below compression threshold", async () => {
    const mockFeedApi = new MockFeedApi();
    const { serializedStorage } = await serializeStorage(
      {
        uuid: "",
        commitment: "",
        emails: [],
        salt: "",
        terms_agreed: 1
      } satisfies User,
      pcds,
      new FeedSubscriptionManager(mockFeedApi)
    );

    assert(isSyncedEncryptedStorageV6(serializedStorage));
    assert(serializedStorage._storage_version === "v6");
    // Our PCD collection is too small to trigger compression
    assert(serializedStorage.compressedPCDs === false);
    expect(serializedStorage.pcds).to.eq(await pcds.serializeCollection());

    const deserialized = await deserializeStorage(serializedStorage, packages);
    expect(deserialized.pcds.size()).equal(500);
  });

  it("should round-trip serializeStorage and deserializeStorage when above compression threshold", async () => {
    const mockFeedApi = new MockFeedApi();
    const { serializedStorage } = await serializeStorage(
      {
        uuid: "",
        commitment: "",
        emails: [],
        salt: "",
        terms_agreed: 1
      } satisfies User,
      pcds,
      new FeedSubscriptionManager(mockFeedApi),
      // Much lower compression threshold than the 500_000 default
      { pcdCompressionThresholdBytes: 100_000 }
    );

    assert(isSyncedEncryptedStorageV6(serializedStorage));
    assert(serializedStorage._storage_version === "v6");
    // Our PCD collection is too small to trigger compression
    assert(serializedStorage.compressedPCDs === true);
    expect(decompressStringFromBase64(serializedStorage.pcds)).to.eq(
      await pcds.serializeCollection()
    );

    const deserialized = await deserializeStorage(serializedStorage, packages);
    expect(deserialized.pcds.size()).equal(500);
  });
});
