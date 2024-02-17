import { Identity } from "@semaphore-protocol/identity";
import { Point } from "@zk-kit/baby-jubjub";
import { expect } from "chai";
import "mocha";
import {
  PODEntries,
  generatePODMerkleProof,
  merklizePOD,
  packPublicKey,
  podNameHash,
  podValueHash,
  signPOD,
  unpackPublicKey,
  unpackSignature,
  verifyPOD,
  verifyPODMerkeProof
} from "../src";

describe("POD cryptography should work", async function () {
  // Key borrowed from https://github.com/iden3/circomlibjs/blob/4f094c5be05c1f0210924a3ab204d8fd8da69f49/test/eddsa.js#L103
  const privateKey =
    "0001020304050607080900010203040506070809000102030405060708090001";

  const expectedPublicKeyPoint = [
    0x1d5ac1f31407018b7d413a4f52c8f74463b30e6ac2238220ad8b254de4eaa3a2n,
    0x1e1de8a908826c3f9ac2e0ceee929ecd0caf3b99b3ef24523aaab796a6f733c4n
  ] as Point<bigint>;

  const ownerIdentity = new Identity(
    '["329061722381819402313027227353491409557029289040211387019699013780657641967", "99353161014976810914716773124042455250852206298527174581112949561812190422"]'
  );

  const sampleEntries = {
    E: { type: "cryptographic", value: 0xdeadbeefn },
    F: { type: "cryptographic", value: 0xffffffffn },
    C: { type: "string", value: "hello" },
    D: { type: "string", value: "foobar" },
    A: { type: "int", value: 123n },
    B: { type: "int", value: 321n },
    G: { type: "int", value: 7n },
    H: { type: "int", value: 8n },
    I: { type: "int", value: 9n },
    J: { type: "int", value: 10n },
    owner: { type: "cryptographic", value: ownerIdentity.commitment }
  } as PODEntries;

  const expectedCount = Object.entries(sampleEntries).length;
  const expectedNameOrder = [...Object.keys(sampleEntries)].sort();

  it("merklizePOD should process sample", function () {
    const { podMap, merkleTree } = merklizePOD(sampleEntries);
    expect(podMap).to.have.length(expectedCount);
    expect(merkleTree.size).to.eq(expectedCount * 2);
    expect([...podMap.keys()]).to.deep.eq(expectedNameOrder);
  });

  it("should sign and verify a POD", function () {
    const { podMap, merkleTree, signature, publicKey } = signPOD(
      sampleEntries,
      privateKey
    );
    expect(podMap).to.have.length(expectedCount);
    expect(merkleTree.size).to.eq(expectedCount * 2);
    expect([...podMap.keys()]).to.deep.eq(expectedNameOrder);
    expect(publicKey).to.eq(packPublicKey(expectedPublicKeyPoint));

    const verified = verifyPOD(sampleEntries, signature, publicKey);
    expect(verified).to.be.true;
  });

  it("should generate and verify an entry Merkle proof", function () {
    const { podMap, merkleTree, signature, publicKey } = signPOD(
      sampleEntries,
      privateKey
    );
    expect(podMap).to.have.length(expectedCount);
    expect(merkleTree.size).to.eq(expectedCount * 2);
    expect([...podMap.keys()]).to.deep.eq(expectedNameOrder);
    expect(publicKey).to.eq(packPublicKey(expectedPublicKeyPoint));

    const verified = verifyPOD(sampleEntries, signature, publicKey);
    expect(verified).to.be.true;

    for (const entryName of Object.keys(sampleEntries)) {
      const entryProof = generatePODMerkleProof(podMap, merkleTree, entryName);
      expect(entryProof.root).to.eq(merkleTree.root);
      expect(entryProof.leaf).to.eq(podNameHash(entryName));
      expect(entryProof.siblings[0]).to.eq(
        podValueHash(sampleEntries[entryName])
      );
      expect(entryProof.index % 2).to.eq(0);
      // entryProof.index isn't always equal to entryIndex*2 due to combining
      // of nodes in the LeanIMT

      expect(verifyPODMerkeProof(entryProof)).to.be.true;
    }
  });

  it("should generate test data for zkrepl", function () {
    const { podMap, merkleTree, signature, publicKey } = signPOD(
      sampleEntries,
      privateKey
    );
    expect(podMap).to.have.length(expectedCount);
    expect(merkleTree.size).to.eq(expectedCount * 2);
    expect([...podMap.keys()]).to.deep.eq(expectedNameOrder);
    expect(publicKey).to.eq(packPublicKey(expectedPublicKeyPoint));

    const verified = verifyPOD(sampleEntries, signature, publicKey);
    expect(verified).to.be.true;

    const zkrMerkleMaxDepth = 10;
    const zkrMaxEntries = 5;

    const zkrSig = unpackSignature(signature);
    const zkrPub = unpackPublicKey(publicKey);

    const zkrEntryNameHash = [];
    const zkrEntryValue = [];
    const zkrEntryIsValueEnabled = [];
    const zkrEntryIsValueHashRevealed = [];
    const zkrEntryProofDepth = [];
    const zkrEntryProofIndex = [];
    const zkrEntryProofSiblings = [];
    const testEntries = ["A", "owner", "C", "E"];
    for (let entryIndex = 0; entryIndex < zkrMaxEntries; entryIndex++) {
      const isEntryEnabled = entryIndex < testEntries.length;
      const entryName = isEntryEnabled
        ? testEntries[entryIndex]
        : testEntries[0];

      const entryProof = generatePODMerkleProof(podMap, merkleTree, entryName);
      expect(entryProof.root).to.eq(merkleTree.root);
      expect(entryProof.leaf).to.eq(podNameHash(entryName));
      expect(entryProof.siblings[0]).to.eq(
        podValueHash(sampleEntries[entryName])
      );
      expect(entryProof.index % 2).to.eq(0);
      // entryProof.index isn't always equal to entryIndex*2 due to combining
      // of nodes in the LeanIMT

      expect(verifyPODMerkeProof(entryProof)).to.be.true;

      console.log("Entry proof", entryName, entryProof);

      zkrEntryNameHash.push(entryProof.leaf.toString());
      const entryValueType = podMap.get(entryName)?.type;
      if (!isEntryEnabled) {
        zkrEntryValue.push("0");
        zkrEntryIsValueEnabled.push("0");
        zkrEntryIsValueHashRevealed.push("0");
      } else if (
        entryValueType === "cryptographic" ||
        entryValueType === "int"
      ) {
        zkrEntryValue.push(`${podMap.get(entryName)?.value}`);
        zkrEntryIsValueEnabled.push("1");
        zkrEntryIsValueHashRevealed.push(entryIndex % 2 == 0 ? "1" : "0");
      } else {
        zkrEntryValue.push("0");
        zkrEntryIsValueEnabled.push("0");
        zkrEntryIsValueHashRevealed.push(entryIndex % 2 == 0 ? "1" : "0");
      }
      zkrEntryProofDepth.push(entryProof.siblings.length.toString());
      zkrEntryProofIndex.push(entryProof.index.toString());

      const zkrCurSiblings = [];
      for (let sibIndex = 0; sibIndex < zkrMerkleMaxDepth; sibIndex++) {
        zkrCurSiblings.push(
          (sibIndex < entryProof.siblings.length
            ? entryProof.siblings[sibIndex]
            : 0n
          ).toString()
        );
      }
      zkrEntryProofSiblings.push(zkrCurSiblings);
    }

    const zkrTestInput: Record<string, string | string[] | string[][]> = {
      objectContentID: merkleTree.root.toString(),
      objectSignerPubkeyAx: zkrPub[0].toString(),
      objectSignerPubkeyAy: zkrPub[1].toString(),
      objectSignatureR8x: zkrSig.R8[0].toString(),
      objectSignatureR8y: zkrSig.R8[1].toString(),
      objectSignatureS: zkrSig.S.toString(),
      entryNameHash: zkrEntryNameHash,
      entryValue: zkrEntryValue,
      entryIsValueEnabled: zkrEntryIsValueEnabled,
      entryIsValueHashRevealed: zkrEntryIsValueHashRevealed,
      entryProofDepth: zkrEntryProofDepth,
      entryProofIndex: zkrEntryProofIndex,
      entryProofSiblings: zkrEntryProofSiblings,
      ownerEntryIndex: "1",
      ownerSemaphoreV3IdentityNullifier: ownerIdentity.nullifier.toString(),
      ownerSemaphoreV3IdentityTrapdoor: ownerIdentity.trapdoor.toString(),
      ownerExternalNullifier: "42",
      ownerIsNullfierHashRevealed: "1",
      globalWatermark: "1337"
    };

    console.log("/* INPUT =", JSON.stringify(zkrTestInput, null, 2), "*/");
  });
});
