import { EdDSAPCDPackage, getEdDSAPublicKey } from "@pcd/eddsa-pcd";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { BABY_JUB_NEGATIVE_ONE, fromHexString } from "@pcd/util";
import { r as BABY_JUB_MODULUS, Point } from "@zk-kit/baby-jubjub";
import {
  Signature,
  derivePublicKey,
  signMessage
} from "@zk-kit/eddsa-poseidon";
import { expect } from "chai";
import "mocha";
import { poseidon2 } from "poseidon-lite/poseidon2";
import {
  CryptoBytesEncoding,
  EDDSA_PUBKEY_TYPE_STRING,
  PODContent,
  checkPrivateKeyFormat,
  checkPublicKeyFormat,
  checkSignatureFormat,
  decodePrivateKey,
  decodePublicKey,
  decodeSignature,
  deriveSignerPublicKey,
  encodePrivateKey,
  encodePublicKey,
  encodeSignature,
  podEdDSAPublicKeyHash,
  podIntHash,
  podMerkleTreeHash,
  podNameHash,
  podStringHash,
  podValueHash,
  signPODRoot,
  verifyPODRootSignature
} from "../src";
import { AltCryptCircomlibjs } from "./alternateCrypto";
import {
  expectedContentID1,
  expectedContentID2,
  expectedPublicKey,
  expectedPublicKeyHex,
  expectedSignature1,
  expectedSignature1Hex,
  expectedSignature2,
  expectedSignature2Hex,
  privateKey,
  privateKeyHex,
  sampleEntries1,
  stripB64,
  testIntsToHash,
  testPrivateKeys,
  testPrivateKeysAllFormats,
  testPrivateKeysBase64,
  testPrivateKeysHex,
  testPublicKeysToHash,
  testStringsToHash
} from "./common";

describe("podCrypto hashes should work", async function () {
  it("podStringHash should produce unique repeatable results", function () {
    const seenHashes = new Set();
    for (const s of testStringsToHash) {
      const h = podStringHash(s);
      expect(seenHashes.has(h)).to.be.false;
      seenHashes.add(h);

      const h2 = podStringHash(s);
      expect(h2).to.eq(h);
    }
  });

  it("podEdDSAPublicKeyHash should produce unique repeatable results", function () {
    const seenHashes = new Set();
    for (const s of testPublicKeysToHash) {
      const h = podEdDSAPublicKeyHash(s);
      expect(seenHashes.has(h)).to.be.false;
      seenHashes.add(h);

      const h2 = podEdDSAPublicKeyHash(s);
      expect(h2).to.eq(h);
    }
  });

  it("podEdDSAPublicKeyHash should produce expected results", function () {
    // Here we check that the public key hash is precisely the Poseidon(2) hash
    // of the public key point as an array of 2 elements and not the string hash
    // of the string representation.
    for (const privateKey of testPrivateKeys) {
      const publicKeyPt = derivePublicKey(privateKey);
      const encodedPublicKey = encodePublicKey(publicKeyPt);
      const expectedHash = poseidon2(publicKeyPt);
      const unexpectedHash = podStringHash(encodedPublicKey);
      const computedHash = podEdDSAPublicKeyHash(encodedPublicKey);

      expect(computedHash).to.eq(expectedHash);
      expect(computedHash).to.not.eq(unexpectedHash);
    }
  });

  it("podIntHash should produce unique repeatable results", function () {
    const seenHashes = new Set();
    for (const i of testIntsToHash) {
      const h = podIntHash(i);
      expect(seenHashes.has(h)).to.be.false;
      seenHashes.add(h);
    }
  });

  it("podIntHash does modular reduction of input", function () {
    expect(podIntHash(-1n)).to.eq(podIntHash(BABY_JUB_NEGATIVE_ONE));
    expect(podIntHash(0n)).to.eq(podIntHash(BABY_JUB_MODULUS));
    expect(podIntHash(1n)).to.eq(podIntHash(BABY_JUB_MODULUS + 1n));

    // Max 256-bit 32-byte integer value (too large for a circuit, but hashable
    // after being reduced mod R).
    const tooBig =
      0xffffffff_ffffffff_ffffffff_ffffffff_ffffffff_ffffffff_ffffffff_ffffffffn;
    expect(podIntHash(tooBig)).to.eq(podIntHash(tooBig - BABY_JUB_MODULUS));
  });

  it("podNameHash should produce unique repeatable results", function () {
    const seenHashes = new Set();
    for (const s of testStringsToHash) {
      const h = podNameHash(s);
      expect(seenHashes.has(h)).to.be.false;
      seenHashes.add(h);

      const h2 = podNameHash(s);
      expect(h2).to.eq(h);
    }
  });

  it("podValueHash should produce unique repeatable results", function () {
    const seenHashes = new Set();
    for (const s of testStringsToHash) {
      const h = podValueHash({ type: "string", value: s });
      expect(seenHashes.has(h)).to.be.false;
      seenHashes.add(h);

      const h2 = podValueHash({ type: "string", value: s });
      expect(h2).to.eq(h);
    }
    for (const s of testPublicKeysToHash) {
      const h = podValueHash({ type: EDDSA_PUBKEY_TYPE_STRING, value: s });
      expect(seenHashes.has(h)).to.be.false;
      seenHashes.add(h);

      const h2 = podValueHash({ type: EDDSA_PUBKEY_TYPE_STRING, value: s });
      expect(h2).to.eq(h);
    }
    for (const i of testIntsToHash) {
      const h = podValueHash({ type: "cryptographic", value: i });
      expect(seenHashes.has(h)).to.be.false;
      seenHashes.add(h);

      const h2 = podValueHash({ type: "cryptographic", value: i });
      expect(h2).to.eq(h);

      const h3 = podValueHash({ type: "int", value: i });
      expect(h3).to.eq(h);

      const h4 = podValueHash({ type: "int", value: i });
      expect(h4).to.eq(h);
    }
  });

  it("podMerkleTreeHash should produce unique repeatable results", function () {
    const seenHashes = new Set();
    // Merkle node hashes are order-dependent, so reversing inputs should
    // produce a different hash.  Since j is unbounded by i, these loops
    // implicitly test that case.
    for (let i = 0; i < testIntsToHash.length; i++) {
      for (let j = 0; j < testIntsToHash.length; j++) {
        const h = podMerkleTreeHash(
          podIntHash(testIntsToHash[i]),
          podIntHash(testIntsToHash[j])
        );
        expect(seenHashes.has(h)).to.be.false;
        seenHashes.add(h);

        const h2 = podMerkleTreeHash(
          podIntHash(testIntsToHash[i]),
          podIntHash(testIntsToHash[j])
        );
        expect(h2).to.eq(h);
      }
    }
  });
});

describe("podCrypto encoding/decoding should work", async function () {
  it("should encode and decode a private key", function () {
    for (let i = 0; i < testPrivateKeysAllFormats.length; i++) {
      const testPrivateKey = testPrivateKeysAllFormats[i];
      const decoded = decodePrivateKey(testPrivateKey);
      expect(decoded).to.have.length(32);
      const encoded = encodePrivateKey(decoded);
      expect(encoded).to.have.length(43);
      checkPrivateKeyFormat(encoded);
      expect(encoded).to.eq(
        testPrivateKeysBase64[i % testPrivateKeysBase64.length]
      );
    }
  });

  it("should encode a private key in Uint8Array format", function () {
    for (let i = 0; i < testPrivateKeysAllFormats.length; i++) {
      const testPrivateKey = testPrivateKeysAllFormats[i];
      const decoded = decodePrivateKey(testPrivateKey);
      const asUint8Array = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) {
        asUint8Array[i] = decoded[i];
      }
      const encoded = encodePrivateKey(asUint8Array);
      expect(encoded).to.eq(
        testPrivateKeysBase64[i % testPrivateKeysBase64.length]
      );
    }
  });

  it("should encode and decode a private key using any encoding", function () {
    for (let i = 0; i < testPrivateKeys.length; i++) {
      const testPrivateKey = testPrivateKeys[i];
      const decoded = decodePrivateKey(testPrivateKey);

      const encodedHex = encodePrivateKey(decoded, "hex");
      expect(encodedHex).to.eq(
        testPrivateKeysHex[i].toLowerCase() // hex encoding normalizes to lowercase
      );
      expect(decodePrivateKey(encodedHex)).to.deep.eq(
        decodePrivateKey(testPrivateKey)
      );
      checkPrivateKeyFormat(encodedHex);

      const encodedBase64 = encodePrivateKey(decoded, "base64");
      expect(encodedBase64).to.eq(testPrivateKeysBase64[i]);
      expect(decodePrivateKey(encodedBase64)).to.deep.eq(
        decodePrivateKey(testPrivateKey)
      );
      checkPrivateKeyFormat(encodedBase64);
    }
  });

  it("should not encode a private key of the wrong form", function () {
    const badPrivateBytes = [
      "",
      "password",
      "12345678901234567890123456789012", // Correct length
      Buffer.from(
        "00112233445566778899AABBCCDDEEFF00112233445566778899aabbccddeeff00112233445566778899AABBCCDDEEFF00112233445566778899aabbccddeeff",
        "hex"
      ),
      Buffer.from("1122334455", "hex"),
      undefined,
      12345,
      12345n
    ] as Uint8Array[];
    for (const testPrivateBytes of badPrivateBytes) {
      expect((): void => {
        encodePrivateKey(testPrivateBytes);
      }).to.throw(TypeError);
    }
  });

  it("should not decode a private key of the wrong form", function () {
    const badPrivateKeys = [
      "",
      "password",
      "12345",
      "00112233445566778899AABBCCDDEEFF00112233445566778899aabbccddeeff00112233445566778899AABBCCDDEEFF00112233445566778899aabbccddeeff",
      "0x00112233445566778899AABBCCDDEEFF00112233445566778899aabbccddeeff",
      "00112233445566778899AABBCCDDEEFF00112233445566778899iijjkkllmmnn",
      undefined as unknown as string,
      12345 as unknown as string,
      12345n as unknown as string,
      "==abcde123",
      "AAECAwQFBgcICQABAgMEBQYHCAkAAQIDBAUGBwgJAAE====="
    ];
    for (const testPrivateKey of badPrivateKeys) {
      expect((): void => {
        decodePrivateKey(testPrivateKey);
      }).to.throw(
        TypeError,
        "Private key should be 32 bytes, encoded as hex or Base64."
      );
    }
  });

  it("should encode and decode a public key", function () {
    for (const testPrivateKey of testPrivateKeys) {
      const decodedPrivateKey = decodePrivateKey(testPrivateKey);
      const rawPublicKey = derivePublicKey(decodedPrivateKey);

      const encoded = encodePublicKey(rawPublicKey);
      expect(encoded).to.have.length(43);
      checkPublicKeyFormat(encoded);

      const encodedFromString = encodePublicKey(
        rawPublicKey.map((i) => i.toString()) as Point<string>
      );
      expect(encodedFromString).to.eq(encoded);

      const decoded = decodePublicKey(encoded);
      expect(decoded).to.deep.eq(rawPublicKey);
    }
  });

  it("should encode and decode a public key using any encoding", function () {
    for (const testPrivateKey of testPrivateKeys) {
      const decodedPrivateKey = decodePrivateKey(testPrivateKey);
      const rawPublicKey = derivePublicKey(decodedPrivateKey);

      for (const encoding of ["hex", "base64"]) {
        const encoded = encodePublicKey(
          rawPublicKey,
          encoding as CryptoBytesEncoding
        );
        expect(decodePublicKey(encoded)).to.deep.eq(rawPublicKey);
        checkPublicKeyFormat(encoded);
      }
    }
  });

  it("should not encode a public key of the wrong form", function () {
    const badPublicKeys = [
      "",
      "password",
      undefined,
      12345,
      12345n,
      [],
      [
        19879349823480797868120364375424621653830878247025192709471350836146439599027n,
        8225418044708316876718756729591926814699419466870832454238122032268923115810n // Not on curve: 1st digit should be 7 not 8
      ],
      [
        "19879349823480797868120364375424621653830878247025192709471350836146439599027",
        "8225418044708316876718756729591926814699419466870832454238122032268923115810" // Not on curve: 1st digit should be 7 not 8
      ],
      [0, 1]
    ] as Point[];
    for (const testPublicKey of badPublicKeys) {
      expect((): void => {
        encodePublicKey(testPublicKey);
      }).to.throw();
    }
  });

  it("should not decode a public key of the wrong form", function () {
    const badPublicKeys = [
      "",
      "password",
      "12345",
      "00112233445566778899AABBCCDDEEFF00112233445566778899aabbccddeeff00112233445566778899AABBCCDDEEFF00112233445566778899aabbccddeeff",
      "0x00112233445566778899AABBCCDDEEFF00112233445566778899aabbccddeeff",
      "00112233445566778899AABBCCDDEEFF00112233445566778899iijjkkllmmnn",
      "c433f7a696b7aa3a5224efb3993baf0ccd9e92eecee0c29a3f6c8208a9e81fff", // Not on curve: final digits shoudl be d9e not fff
      undefined as unknown as string,
      12345 as unknown as string,
      12345n as unknown as string,
      "==abcde123",
      "AAECAwQFBgcICQABAgMEBQYHCAkAAQIDBAUGBwgJAAE====="
    ];
    for (const testPublicKey of badPublicKeys) {
      expect((): void => {
        decodePublicKey(testPublicKey);
      }).to.throw();
    }
  });

  it("should encode and decode a signature", function () {
    for (const testPrivateKey of testPrivateKeys) {
      for (const testInt of testIntsToHash) {
        const message = podIntHash(testInt);
        const rawSig = signMessage(decodePrivateKey(testPrivateKey), message);

        const encoded = encodeSignature(rawSig);
        expect(encoded).to.have.length(86);
        checkSignatureFormat(encoded);

        const encodedFromString = encodeSignature({
          R8: rawSig.R8.map((i) => i.toString()) as Point<string>,
          S: rawSig.S.toString()
        });
        expect(encodedFromString).to.eq(encoded);

        const decoded = decodeSignature(encoded);
        expect(decoded).to.deep.eq(rawSig);
      }
    }
    expect(true).to.be.true;
  });

  it("should encode and decode a signature using any encoding", function () {
    for (const testPrivateKey of testPrivateKeys) {
      const message = podIntHash(testIntsToHash[0]);
      const rawSig = signMessage(decodePrivateKey(testPrivateKey), message);

      for (const encoding of ["hex", "base64"]) {
        const encoded = encodeSignature(
          rawSig,
          encoding as CryptoBytesEncoding
        );
        expect(decodeSignature(encoded)).to.deep.eq(rawSig);
        checkSignatureFormat(encoded);
      }
    }
  });

  it("should not encode a signature of the wrong form", function () {
    const badSigs = [
      "",
      "password",
      undefined,
      12345,
      12345n,
      [],
      [0, 1],
      ["0", "1"],
      {
        R8: [
          2761500685455248442045931126633580804486469170950780600207147306993842322749n,
          9470920674419555099993516343830958292850298714433272421923039412950342163357n // Not in curve: first digit should be 7 not 9
        ],
        S: 2008068972763198314434684370521945787982800179691435935299161494036401992969n
      }
    ] as unknown as Signature[];
    for (const testSig of badSigs) {
      expect((): void => {
        encodeSignature(testSig);
      }).to.throw();
    }
  });

  it("should not decode a signature of the wrong form", function () {
    const badSigs = [
      "",
      "password",
      "12345",
      "00112233445566778899AABBCCDDEEFF00112233445566778899aabbccddeeff00112233445566778899AABBCCDDEEFF00112233445566778899aabbccddeeff",
      "00112233445566778899AABBCCDDEEFF00112233445566778899aabbccddeeff00112233445566778899AABBCCDDEEFF00112233445566778899aabbccddeeff00112233445566778899AABBCCDDEEFF00112233445566778899aabbccddeeff",
      "0x00112233445566778899AABBCCDDEEFF00112233445566778899aabbccddeeff",
      "00112233445566778899AABBCCDDEEFF00112233445566778899iijjkkllmmnn",
      "9ddb5d339c774911a3b4919d6e23e3d1fb6e486a116b187c96fb252b29648fff_09b54198965c357db1913fd82e6ff8b0340219dd6006dc1b32ff07d9d9867004", // Not in curve: last digits of first segment should be 410 not fff
      undefined as unknown as string,
      12345 as unknown as string,
      12345n as unknown as string,
      "==abcde123",
      "ZKuvJhYh4JXNqKqt1uS99lAVReh_bNkjv35eD3KVAysBOOyAM1BjmwoE3pwm_CuCMvP0a1t0hraeAsTeBjmGAQ======"
    ];
    for (const testSig of badSigs) {
      expect((): void => {
        decodeSignature(testSig);
      }).to.throw();
    }
  });

  it("double-check expected values vs. hex originals", function () {
    expect(
      stripB64(Buffer.from(privateKeyHex, "hex").toString("base64"))
    ).to.eq(privateKey);
    expect(encodePrivateKey(decodePrivateKey(privateKeyHex))).to.eq(privateKey);

    expect(
      stripB64(Buffer.from(expectedPublicKeyHex, "hex").toString("base64"))
    ).to.eq(expectedPublicKey);
    expect(encodePublicKey(decodePublicKey(expectedPublicKeyHex))).to.eq(
      expectedPublicKey
    );

    expect(
      stripB64(Buffer.from(expectedSignature1Hex, "hex").toString("base64"))
    ).to.eq(expectedSignature1);
    expect(encodeSignature(decodeSignature(expectedSignature1Hex))).to.eq(
      expectedSignature1
    );

    expect(
      stripB64(Buffer.from(expectedSignature2Hex, "hex").toString("base64"))
    ).to.eq(expectedSignature2);
    expect(encodeSignature(decodeSignature(expectedSignature2Hex))).to.eq(
      expectedSignature2
    );
  });
});

describe("podCrypto signing should work", async function () {
  it("should sign and verify on arbitrary roots", function () {
    for (const testPrivateKey of testPrivateKeys) {
      for (const testInt of testIntsToHash) {
        const fakeRoot = podIntHash(testInt);
        const { signature, publicKey } = signPODRoot(fakeRoot, testPrivateKey);
        checkSignatureFormat(signature);
        checkPublicKeyFormat(publicKey);
        expect(publicKey).to.eq(deriveSignerPublicKey(testPrivateKey));

        const isValid = verifyPODRootSignature(fakeRoot, signature, publicKey);
        expect(isValid).to.be.true;
      }
    }
  });

  it("outputs should match saved expected values", function () {
    // This test exists to detect breaking changes in future which could
    // impact the compatibility of saved PODs.  If sample inputs changed, you
    // can simply change the expected outputs.  Otherwise think about why
    // these values changed.
    let { signature, publicKey } = signPODRoot(expectedContentID1, privateKey);
    expect(signature).to.eq(expectedSignature1);
    expect(publicKey).to.eq(expectedPublicKey);

    ({ signature, publicKey } = signPODRoot(expectedContentID2, privateKey));
    expect(signature).to.eq(expectedSignature2);
    expect(publicKey).to.eq(expectedPublicKey);
  });

  it("derived public keys should match expected values", function () {
    // This test exists to detect breaking changes in future which could
    // impact the compatibility of saved PODs.  If sample inputs changed, you
    // can simply change the expected outputs.  Otherwise think about why
    // these values changed.
    let publicKey = deriveSignerPublicKey(privateKey);
    expect(publicKey).to.eq(expectedPublicKey);

    publicKey = deriveSignerPublicKey(privateKey);
    expect(publicKey).to.eq(expectedPublicKey);
  });

  it("should not sign with an invalid public key", function () {
    const badPrivKey = "password";
    const fn = (): void => {
      signPODRoot(expectedContentID1, badPrivKey);
    };
    expect(fn).to.throw(TypeError);
  });

  it("should not sign with an invalid root", function () {
    const badRoot = "password" as unknown as bigint;
    const fn = (): void => {
      signPODRoot(badRoot, privateKey);
    };
    expect(fn).to.throw(TypeError);
  });
});

describe("podCrypto use of zk-kit should be compatible with EdDSAPCD", async function () {
  it("EdDSA public/private key handling should match", async function () {
    for (const testPrivateKey of testPrivateKeys) {
      const podContent = PODContent.fromEntries(sampleEntries1);
      const { publicKey } = signPODRoot(podContent.contentID, testPrivateKey);
      const unpackedPublicKey = decodePublicKey(publicKey);
      expect(unpackedPublicKey).to.not.be.null;
      if (!unpackedPublicKey) {
        throw new Error("Bad public key point!");
      }

      // EdDSAPCD represents its signatures as an EC point (2 field elements)
      // in an array, with each element being 32 bytes encoded as 64 hex digits.
      const stringifiedPublicKey = unpackedPublicKey.map((n) =>
        n.toString(16).padStart(64, "0")
      );

      // EdDSAPCD represents private keys in hex, not Base64.
      const hexPrivateKey = decodePrivateKey(testPrivateKey).toString("hex");

      const pubFromString = await getEdDSAPublicKey(hexPrivateKey);
      expect(pubFromString).to.deep.eq(stringifiedPublicKey);

      const pubFromBuffer = await getEdDSAPublicKey(
        fromHexString(hexPrivateKey)
      );
      expect(pubFromBuffer).to.deep.eq(stringifiedPublicKey);
    }
  });

  it("EdDSA signing should match", async function () {
    // EdDSAPCD has an extra step where it hashes a list of bigints (the PCD's
    // message) into a single bigint (EdDSA's message) to sign.  Our root takes
    // the place of the already-hashed message.  To simulate steps which should
    // produce the same output, we calculate a poseidon signature of the input
    // message, and pretend that's a POD root.
    const pcdMessageNumbers = [0x12345n, 0xdeadbeefn];
    const pcdMessageStrings = pcdMessageNumbers.map((n) => n.toString());

    // EdDSAPCD represents private keys in hex, not Base64.
    const hexPrivateKey = decodePrivateKey(privateKey).toString("hex");

    // Create an EdDSAPCD for comparison
    const pcd = await EdDSAPCDPackage.prove({
      message: {
        value: pcdMessageStrings,
        argumentType: ArgumentTypeName.StringArray
      },
      privateKey: {
        value: hexPrivateKey,
        argumentType: ArgumentTypeName.String
      },
      id: {
        value: undefined,
        argumentType: ArgumentTypeName.String
      }
    });

    // Perform the same signing operation as if for a POD.
    const hashedMessage = poseidon2(pcdMessageNumbers);
    const { publicKey, signature } = signPODRoot(hashedMessage, privateKey);
    const unpackedPublicKey = decodePublicKey(publicKey);
    expect(unpackedPublicKey).to.not.be.null;
    if (!unpackedPublicKey) {
      throw new Error("Bad public key point!");
    }

    // EdDSAPCD represents its public keys as an EC point (2 field elements)
    // in an array, with each element being 32 bytes encoded as 64 hex digits.
    const stringifiedPublicKey = unpackedPublicKey.map((n) =>
      n.toString(16).padStart(64, "0")
    );

    // EdDSAPCD represents its signatures in hex, not Base64.
    const hexSignature = Buffer.from(signature, "base64").toString("hex");

    expect(stringifiedPublicKey).to.deep.eq(pcd.claim.publicKey);
    expect(hexSignature).to.deep.eq(pcd.proof.signature);
  });
});

describe("podCrypto's zk-kit should be compatible with circomlibjs", async function () {
  let altCrypto: AltCryptCircomlibjs;

  this.beforeAll(async function () {
    altCrypto = await AltCryptCircomlibjs.create();
  });

  it("podStringHash should match", function () {
    for (const s of testStringsToHash) {
      const podH = podStringHash(s);
      const altH = altCrypto.podStringHash(s);
      expect(altH).to.eq(podH);
    }
  });

  it("podIntHash should match", function () {
    for (const i of testIntsToHash) {
      const podH = podIntHash(i);
      const altH = altCrypto.podIntHash(i);
      expect(altH).to.eq(podH);
    }
  });

  it("podMerkleTreeHash should match", function () {
    for (let i = 0; i < testIntsToHash.length; i++) {
      for (let j = 0; j < testIntsToHash.length; j++) {
        const podH = podMerkleTreeHash(
          podIntHash(testIntsToHash[i]),
          podIntHash(testIntsToHash[j])
        );
        const altH = altCrypto.podMerkleTreeHash(
          podIntHash(testIntsToHash[i]),
          podIntHash(testIntsToHash[j])
        );
        expect(altH).to.eq(podH);
      }
    }
  });

  it("encode/decode public key should match", function () {
    for (const testPrivateKey of testPrivateKeys) {
      const pubKey = derivePublicKey(testPrivateKey);

      const podEncoded = encodePublicKey(pubKey);
      const altEncoded = altCrypto.encodePublicKey(pubKey);
      expect(altEncoded).to.eq(podEncoded);

      const podDecoded = decodePublicKey(altEncoded);
      const altDecoded = altCrypto.decodePublicKey(podEncoded);
      expect(altDecoded).to.deep.eq(podDecoded);
    }
  });

  it("encode/decode signature should match", function () {
    for (const testPrivateKey of testPrivateKeys) {
      for (const i of testIntsToHash) {
        const sig = signMessage(testPrivateKey, podIntHash(i));

        const podEncoded = encodeSignature(sig);
        const altEncoded = altCrypto.encodeSignature(sig);
        expect(altEncoded).to.eq(podEncoded);

        const podDecoded = decodeSignature(altEncoded);
        const altDecoded = altCrypto.decodeSignature(podEncoded);
        expect(altDecoded).to.deep.eq(podDecoded);
      }
    }
  });

  it("signPODRoot should match", function () {
    for (const testPrivateKey of testPrivateKeys) {
      const podContent = PODContent.fromEntries(sampleEntries1);
      const primaryImpl = signPODRoot(podContent.contentID, testPrivateKey);
      const altImpl = altCrypto.signPODRoot(
        podContent.contentID,
        testPrivateKey
      );
      expect(altImpl).to.deep.eq(primaryImpl);
    }
  });

  it("verifyPODRootSignature should match", function () {
    for (const testPrivateKey of testPrivateKeys) {
      const podContent = PODContent.fromEntries(sampleEntries1);
      const primaryImpl = signPODRoot(podContent.contentID, testPrivateKey);
      const altImpl = altCrypto.signPODRoot(
        podContent.contentID,
        testPrivateKey
      );
      expect(altImpl).to.deep.eq(primaryImpl);

      // Swap data to prove that primary impl can verify alternate impl's output,
      // and vice versa.
      expect(
        verifyPODRootSignature(
          podContent.contentID,
          altImpl.signature,
          altImpl.publicKey
        )
      ).to.be.true;
      expect(
        altCrypto.verifyPODRootSignature(
          podContent.contentID,
          primaryImpl.signature,
          primaryImpl.publicKey
        )
      ).to.be.true;
    }
  });
});
