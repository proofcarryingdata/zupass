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

  const sampleEntries1 = {
    E: { type: "cryptographic", value: 123n },
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

  const expectedCount1 = Object.entries(sampleEntries1).length;
  const expectedNameOrder1 = [...Object.keys(sampleEntries1)].sort();

  const sampleEntries2 = {
    attendee: { type: "cryptographic", value: ownerIdentity.commitment },
    eventID: { type: "cryptographic", value: 456n },
    ticketID: { type: "cryptographic", value: 999n }
  } as PODEntries;

  it("merklizePOD should process sample", function () {
    const { podMap, merkleTree } = merklizePOD(sampleEntries1);
    expect(podMap).to.have.length(expectedCount1);
    expect(merkleTree.size).to.eq(expectedCount1 * 2);
    expect([...podMap.keys()]).to.deep.eq(expectedNameOrder1);
  });

  it("should sign and verify a POD", function () {
    const { podMap, merkleTree, signature, publicKey } = signPOD(
      sampleEntries1,
      privateKey
    );
    expect(podMap).to.have.length(expectedCount1);
    expect(merkleTree.size).to.eq(expectedCount1 * 2);
    expect([...podMap.keys()]).to.deep.eq(expectedNameOrder1);
    expect(publicKey).to.eq(packPublicKey(expectedPublicKeyPoint));

    const verified = verifyPOD(sampleEntries1, signature, publicKey);
    expect(verified).to.be.true;
  });

  it("should generate and verify an entry Merkle proof", function () {
    const { podMap, merkleTree, signature, publicKey } = signPOD(
      sampleEntries1,
      privateKey
    );
    expect(podMap).to.have.length(expectedCount1);
    expect(merkleTree.size).to.eq(expectedCount1 * 2);
    expect([...podMap.keys()]).to.deep.eq(expectedNameOrder1);
    expect(publicKey).to.eq(packPublicKey(expectedPublicKeyPoint));

    const verified = verifyPOD(sampleEntries1, signature, publicKey);
    expect(verified).to.be.true;

    for (const entryName of Object.keys(sampleEntries1)) {
      const entryProof = generatePODMerkleProof(podMap, merkleTree, entryName);
      expect(entryProof.root).to.eq(merkleTree.root);
      expect(entryProof.leaf).to.eq(podNameHash(entryName));
      expect(entryProof.siblings[0]).to.eq(
        podValueHash(sampleEntries1[entryName])
      );
      expect(entryProof.index % 2).to.eq(0);
      // entryProof.index isn't always equal to entryIndex*2 due to combining
      // of nodes in the LeanIMT

      expect(verifyPODMerkeProof(entryProof)).to.be.true;
    }
  });

  it("should generate test data for zkrepl", function () {
    const zkrMaxObjects = 3;
    const zkrMaxEntries = 10;
    const zkrMerkleMaxDepth = 10;

    const pods = [];
    const zkrSigs = [];
    const zkrPubs = [];
    const testObjects = [sampleEntries1, sampleEntries2];
    for (const inputEntries of testObjects) {
      const { podMap, merkleTree, signature, publicKey } = signPOD(
        inputEntries,
        privateKey
      );
      const verified = verifyPOD(inputEntries, signature, publicKey);
      expect(verified).to.be.true;
      pods.push({ podMap, merkleTree, signature, publicKey });
      zkrSigs.push(unpackSignature(signature));
      zkrPubs.push(unpackPublicKey(publicKey));
    }

    const zkrObjectContentID = [];
    const zkrObjectSignerPubkeyAx = [];
    const zkrObjectSignerPubkeyAy = [];
    const zkrObjectSignatureR8x = [];
    const zkrObjectSignatureR8y = [];
    const zkrObjectSignatureS = [];

    for (let objectIndex = 0; objectIndex < zkrMaxObjects; objectIndex++) {
      const isObjectEnabled = objectIndex < testObjects.length;
      const i = isObjectEnabled ? objectIndex : 0;
      zkrObjectContentID.push(pods[i].merkleTree.root.toString());
      zkrObjectSignerPubkeyAx.push(zkrPubs[i][0].toString());
      zkrObjectSignerPubkeyAy.push(zkrPubs[i][1].toString());
      zkrObjectSignatureR8x.push(zkrSigs[i].R8[0].toString());
      zkrObjectSignatureR8y.push(zkrSigs[i].R8[1].toString());
      zkrObjectSignatureS.push(zkrSigs[i].S.toString());
    }

    const zkrEntryObjectIndex = [];
    const zkrEntryNameHash = [];
    const zkrEntryValue = [];
    const zkrEntryIsValueEnabled = [];
    const zkrEntryIsValueHashRevealed = [];
    const zkrEntryEqualToOtherEntryByIndex = [];
    const zkrEntryProofDepth = [];
    const zkrEntryProofIndex = [];
    const zkrEntryProofSiblings = [];
    const testEntries = [
      { n: "A", o: 0, eq: 3 },
      { n: "owner", o: 0, eq: undefined },
      { n: "C", o: 0, eq: undefined },
      { n: "E", o: 0, eq: undefined },
      { n: "attendee", o: 1, eq: 1 },
      { n: "eventID", o: 1, eq: undefined }
    ];
    for (let entryIndex = 0; entryIndex < zkrMaxEntries; entryIndex++) {
      const isEntryEnabled = entryIndex < testEntries.length;
      const entryInfo = isEntryEnabled
        ? testEntries[entryIndex]
        : testEntries[0];
      const entryName = entryInfo.n;
      const entryObject = pods[entryInfo.o];
      zkrEntryObjectIndex.push(entryInfo.o.toString());

      const entryProof = generatePODMerkleProof(
        entryObject.podMap,
        entryObject.merkleTree,
        entryName
      );
      expect(verifyPODMerkeProof(entryProof)).to.be.true;

      console.log("Entry proof", entryName, entryProof);

      zkrEntryNameHash.push(entryProof.leaf.toString());
      const entryValueType = entryObject.podMap.get(entryName)?.type;
      if (!isEntryEnabled) {
        zkrEntryValue.push("0");
        zkrEntryIsValueEnabled.push("0");
        zkrEntryIsValueHashRevealed.push("0");
      } else if (
        entryValueType === "cryptographic" ||
        entryValueType === "int"
      ) {
        zkrEntryValue.push(`${entryObject.podMap.get(entryName)?.value}`);
        zkrEntryIsValueEnabled.push("1");
        zkrEntryIsValueHashRevealed.push(entryIndex % 2 == 0 ? "1" : "0");
      } else {
        zkrEntryValue.push("0");
        zkrEntryIsValueEnabled.push("0");
        zkrEntryIsValueHashRevealed.push(entryIndex % 2 == 0 ? "1" : "0");
      }

      if (entryInfo.eq !== undefined) {
        zkrEntryEqualToOtherEntryByIndex.push(entryInfo.eq.toString());
      } else {
        zkrEntryEqualToOtherEntryByIndex.push(entryIndex.toString());
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

    function array2Bits(boolArray: string[]): string {
      let bits = 0n;
      for (let i = 0; i < boolArray.length; i++) {
        expect(boolArray[i]).to.be.oneOf(["0", "1"]);
        if (boolArray[i] === "1") {
          bits |= 1n << BigInt(i);
        }
      }
      return bits.toString();
    }

    const zkrTestInput: Record<string, string | string[] | string[][]> = {
      objectContentID: zkrObjectContentID,
      objectSignerPubkeyAx: zkrObjectSignerPubkeyAx,
      objectSignerPubkeyAy: zkrObjectSignerPubkeyAy,
      objectSignatureR8x: zkrObjectSignatureR8x,
      objectSignatureR8y: zkrObjectSignatureR8y,
      objectSignatureS: zkrObjectSignatureS,
      entryObjectIndex: zkrEntryObjectIndex,
      entryNameHash: zkrEntryNameHash,
      entryValue: zkrEntryValue,
      entryIsValueEnabled: array2Bits(zkrEntryIsValueEnabled),
      entryIsValueHashRevealed: array2Bits(zkrEntryIsValueHashRevealed),
      entryEqualToOtherEntryByIndex: zkrEntryEqualToOtherEntryByIndex,
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
