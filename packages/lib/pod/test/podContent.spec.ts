import { expect } from "chai";
import "mocha";
import {
  JSONPODEntries,
  PODContent,
  PODEntries,
  PODName,
  PODValue,
  POD_CRYPTOGRAPHIC_MAX,
  POD_CRYPTOGRAPHIC_MIN,
  POD_INT_MAX,
  POD_INT_MIN,
  calcMaxEntriesForMerkleDepth,
  calcMinMerkleDepthForEntries,
  clonePODEntries,
  clonePODValue,
  isPODNumericValue,
  podEntriesToJSON,
  podNameHash,
  podValueHash
} from "../src";
import {
  expectedContentID1,
  expectedContentID2,
  sampleEntries1,
  sampleEntries2
} from "./common";

describe("PODContent class should work", async function () {
  const expectedCount1 = Object.entries(sampleEntries1).length;
  const expectedNameOrder1 = [...Object.keys(sampleEntries1)].sort();
  const expectedCount2 = Object.entries(sampleEntries2).length;
  const expectedNameOrder2 = [...Object.keys(sampleEntries2)].sort();

  const podContent1 = PODContent.fromEntries(sampleEntries1);
  const podContent2 = PODContent.fromEntries(sampleEntries2);

  it("should process samples", function () {
    expect(podContent1.size).to.eq(expectedCount1);
    expect(podContent1.contentID).to.not.eq(0);
    expect(podContent1.merkleTreeDepth).to.eq(
      Math.ceil(Math.log2(expectedCount1 * 2))
    );

    expect(podContent1.asEntries()).to.deep.eq(sampleEntries1);
    expect([...Object.keys(podContent1.asEntries())]).to.deep.eq(
      expectedNameOrder1
    );
    expect(podContent1.listNames()).to.deep.eq(expectedNameOrder1);
    expect(podContent1.listEntries()).to.have.length(expectedCount1);
    expect(podContent1.listEntries().map((e) => e.name)).to.deep.eq(
      expectedNameOrder1
    );

    expect(podContent2.size).to.eq(expectedCount2);
    expect(podContent2.contentID).to.not.eq(0);
    expect(podContent2.merkleTreeDepth).to.eq(
      Math.ceil(Math.log2(expectedCount2 * 2))
    );

    expect(podContent2.asEntries()).to.deep.eq(sampleEntries2);
    expect([...Object.keys(podContent2.asEntries())]).to.deep.eq(
      expectedNameOrder2
    );
    expect(podContent2.listNames()).to.deep.eq(expectedNameOrder2);
    expect(podContent2.listEntries()).to.have.length(expectedCount2);
    expect(podContent2.listEntries().map((e) => e.name)).to.deep.eq(
      expectedNameOrder2
    );
  });

  it("content IDs should match saved expected values", function () {
    // This test exists to detect breaking changes in future which could
    // impact the compatibility of saved PODs.  If sample inputs changed, you
    // can simply change the expected outputs.  Otherwise think about why
    // these values changed.
    expect(podContent1.contentID).to.eq(expectedContentID1);
    expect(podContent2.contentID).to.eq(expectedContentID2);
  });

  it("should allow access to entries by name", function () {
    for (const entryName of podContent1.listNames()) {
      expect(podContent1.getValue(entryName)).to.deep.eq(
        (sampleEntries1 as Record<string, PODValue>)[entryName]
      );
      expect(podContent1.getRawValue(entryName)).to.eq(
        (sampleEntries1 as Record<string, PODValue>)[entryName].value
      );
    }
  });

  it("should return undefined for absent entries by name", function () {
    expect(podContent1.getValue("no_such_entry")).to.be.undefined;
    expect(podContent1.getRawValue("no_such_entry")).to.be.undefined;
  });

  it("should generate and verify an entry Merkle proof", function () {
    for (const podContent of [podContent1, podContent2]) {
      for (const entryName of podContent.listNames()) {
        const entryValue = podContent.getValue(entryName);
        expect(entryValue).to.not.be.undefined;
        if (entryValue) {
          const entryProof = podContent.generateEntryProof(entryName);
          expect(entryProof.root).to.eq(podContent.contentID);
          expect(entryProof.leaf).to.eq(podNameHash(entryName));
          expect(entryProof.siblings[0]).to.eq(podValueHash(entryValue));
          expect(entryProof.index % 2).to.eq(0);
          // entryProof.index isn't always equal to entryIndex*2 due to combining
          // of nodes in the LeanIMT

          expect(PODContent.verifyEntryProof(entryProof)).to.be.true;
        }
      }
    }
  });

  it("should generate circuit signals", function () {
    for (const podContent of [podContent1, podContent2]) {
      for (const entryName of podContent.listNames()) {
        const entryValue = podContent.getValue(entryName);
        expect(entryValue).to.not.be.undefined;
        if (entryValue) {
          const circuitSignals =
            podContent.generateEntryCircuitSignals(entryName);
          expect(circuitSignals.proof).to.deep.eq(
            podContent.generateEntryProof(entryName)
          );
          expect(circuitSignals.nameHash).to.eq(podNameHash(entryName));
          expect(circuitSignals.valueHash).to.eq(podValueHash(entryValue));
          expect(circuitSignals.value).to.eq(
            isPODNumericValue(entryValue) ? entryValue.value : undefined
          );

          expect(PODContent.verifyEntryProof(circuitSignals.proof)).to.be.true;
        }
      }
    }
  });

  it("should handle absent entries", function () {
    for (const absentName of ["", "unknown"]) {
      expect(podContent1.getValue(absentName)).to.be.undefined;
      expect(podContent1.getRawValue(absentName)).to.be.undefined;
      expect(() => {
        podContent1.generateEntryProof(absentName);
      }).to.throw();
      expect(() => {
        podContent1.generateEntryCircuitSignals(absentName);
      }).to.throw();
    }
  });

  it("should serialize and deserialize as JSON objects", function () {
    const transferredContent1 = PODContent.fromJSON(podContent1.toJSON());
    expect(transferredContent1.size).to.eq(expectedCount1);
    expect(transferredContent1.contentID).to.eq(podContent1.contentID);
    expect(transferredContent1.merkleTreeDepth).to.eq(
      podContent1.merkleTreeDepth
    );
    expect(transferredContent1.asEntries()).to.deep.eq(podContent1.asEntries());
    expect(transferredContent1.listNames()).to.deep.eq(expectedNameOrder1);

    const transferredContent2 = PODContent.fromJSON(podContent2.toJSON());
    expect(transferredContent2.size).to.eq(expectedCount2);
    expect(transferredContent2.contentID).to.eq(podContent2.contentID);
    expect(transferredContent2.merkleTreeDepth).to.eq(
      podContent2.merkleTreeDepth
    );
    expect(transferredContent2.asEntries()).to.deep.eq(podContent2.asEntries());
    expect(transferredContent2.listNames()).to.deep.eq(expectedNameOrder2);
  });

  it("should serialize and deserialize as JSON strings", function () {
    const transferredContent1 = PODContent.fromJSON(
      JSON.parse(JSON.stringify(podContent1.toJSON()))
    );
    expect(transferredContent1.size).to.eq(expectedCount1);
    expect(transferredContent1.contentID).to.eq(podContent1.contentID);
    expect(transferredContent1.merkleTreeDepth).to.eq(
      podContent1.merkleTreeDepth
    );
    expect(transferredContent1.asEntries()).to.deep.eq(podContent1.asEntries());
    expect(transferredContent1.listNames()).to.deep.eq(expectedNameOrder1);

    const transferredContent2 = PODContent.fromJSON(
      JSON.parse(JSON.stringify(podContent2.toJSON()))
    );
    expect(transferredContent2.size).to.eq(expectedCount2);
    expect(transferredContent2.contentID).to.eq(podContent2.contentID);
    expect(transferredContent2.merkleTreeDepth).to.eq(
      podContent2.merkleTreeDepth
    );
    expect(transferredContent2.asEntries()).to.deep.eq(podContent2.asEntries());
    expect(transferredContent2.listNames()).to.deep.eq(expectedNameOrder2);
  });

  it("should reject invalid JSON input", function () {
    const goodJSON = podEntriesToJSON(sampleEntries1);
    const badInputs = [
      [{ ...goodJSON, "!@#$": "hello" }, TypeError],
      [{ ...goodJSON, hello: undefined }, TypeError],
      [{ ...goodJSON, hello: null }, TypeError],
      [{ ...goodJSON, hello: { type: "string", value: 123n } }, TypeError]
    ] as [JSONPODEntries, ErrorConstructor][];

    for (const [badInput, expectedError] of badInputs) {
      const fn = (): PODContent => PODContent.fromJSON(badInput);
      expect(fn).to.throw(expectedError);
    }
  });

  it("should not be mutable via getValue", function () {
    const pc = PODContent.fromEntries(sampleEntries1);
    expect(pc.getValue("A")).to.deep.eq({ type: "int", value: 123n });
    expect(pc.getRawValue("A")).to.eq(123n);

    const gotValue = pc.getValue("A");
    if (!gotValue) {
      throw new Error("Missing value A");
    }
    gotValue.type = "string";
    gotValue.value = "foo";
    expect(pc.getValue("A")).to.deep.eq({ type: "int", value: 123n });
    expect(pc.getRawValue("A")).to.eq(123n);
  });

  it("should not be mutable via asEntries", function () {
    const pc = PODContent.fromEntries(sampleEntries1);
    expect(pc.getValue("A")).to.deep.eq({ type: "int", value: 123n });
    expect(pc.getRawValue("A")).to.eq(123n);

    const gotEntries = pc.asEntries() as Record<PODName, PODValue>;
    gotEntries["A"].value = 42n;
    expect(pc.getValue("A")).to.deep.eq({ type: "int", value: 123n });
    expect(pc.getRawValue("A")).to.eq(123n);
    gotEntries["A"] = { type: "string", value: "foo" };
    expect(pc.getValue("A")).to.deep.eq({ type: "int", value: 123n });
    expect(pc.getRawValue("A")).to.eq(123n);
  });

  it("should not be mutable via listEntries", function () {
    const pc = PODContent.fromEntries(sampleEntries1);
    expect(pc.getValue("A")).to.deep.eq({ type: "int", value: 123n });
    expect(pc.getRawValue("A")).to.eq(123n);

    for (const { name, value } of pc.listEntries()) {
      if (name === "A") {
        value.type = "string";
        value.value = "foo";
        break;
      }
    }
    expect(pc.getValue("A")).to.deep.eq({ type: "int", value: 123n });
    expect(pc.getRawValue("A")).to.eq(123n);
  });

  it("should reject invalid types at construction", function () {
    const badInputs = [
      "",
      "hello",
      123,
      undefined,
      null,
      ["hello", "world"],
      [1, 2, 3]
    ];
    for (const badInput of badInputs) {
      const fn = (): void => {
        PODContent.fromEntries(badInput as unknown as PODEntries);
      };
      expect(fn).to.throw(TypeError);
    }
  });

  it("should reject invalid names at construction", function () {
    const badNames = [
      "",
      "1",
      "0x123",
      "123abc",
      "1_2_3",
      "foo.bar.baz",
      "foo:bar",
      ":",
      "!bang",
      "no spaces",
      "no\ttabs"
    ];
    for (const badName of badNames) {
      const testEntries = clonePODEntries(sampleEntries1) as Record<
        PODName,
        PODValue
      >;
      testEntries[badName] = { type: "string", value: "bad" };

      const fn = (): void => {
        PODContent.fromEntries(testEntries);
      };
      expect(fn).to.throw(TypeError);
    }
  });

  it("should reject invalid values at construction", function () {
    const testCases = [
      [undefined, TypeError],
      [{}, TypeError],
      [{ type: "int" }, TypeError],
      [{ value: 0n }, TypeError],
      [{ type: undefined, value: 0n }, TypeError],
      [{ type: "string", value: undefined }, TypeError],
      [{ type: "something", value: 0n }, TypeError],
      [{ type: "bigint", value: 0n }, TypeError],
      [{ type: "something", value: "something" }, TypeError],
      [{ type: "string", value: 0n }, TypeError],
      [{ type: "string", value: 123 }, TypeError],
      [{ type: "cryptographic", value: "hello" }, TypeError],
      [{ type: "cryptographic", value: 123 }, TypeError],
      [{ type: "cryptographic", value: -1n }, RangeError],
      [
        { type: "cryptographic", value: POD_CRYPTOGRAPHIC_MIN - 1n },
        RangeError
      ],
      [
        { type: "cryptographic", value: POD_CRYPTOGRAPHIC_MAX + 1n },
        RangeError
      ],
      [{ type: "int", value: "hello" }, TypeError],
      [{ type: "int", value: 123 }, TypeError],
      [{ type: "int", value: POD_INT_MIN - 1n }, RangeError],
      [{ type: "int", value: POD_INT_MAX + 1n }, RangeError]
    ] as [PODValue, ErrorConstructor][];
    for (const [testInput, expectedError] of testCases) {
      const testEntries = clonePODEntries(sampleEntries1) as Record<
        PODName,
        PODValue
      >;
      testEntries["badValueName"] = clonePODValue(testInput);

      const fn = (): void => {
        PODContent.fromEntries(testEntries);
      };
      expect(fn).to.throw(expectedError, "badValueName");
    }
  });
});

describe("PODContent helpers should work", async function () {
  it("calcMinMerkleDepthForEntries should calculate correctly", function () {
    // Valid queries
    expect(calcMinMerkleDepthForEntries(1)).to.eq(1);
    expect(calcMinMerkleDepthForEntries(2)).to.eq(2);
    expect(calcMinMerkleDepthForEntries(3)).to.eq(3);
    expect(calcMinMerkleDepthForEntries(4)).to.eq(3);
    expect(calcMinMerkleDepthForEntries(5)).to.eq(4);
    expect(calcMinMerkleDepthForEntries(123)).to.eq(8);
    expect(calcMinMerkleDepthForEntries(4095)).to.eq(13);
    expect(calcMinMerkleDepthForEntries(4096)).to.eq(13);
    expect(calcMinMerkleDepthForEntries(4097)).to.eq(14);

    // Invalid queries
    expect(calcMinMerkleDepthForEntries(0)).to.eq(-Infinity);
    expect(calcMinMerkleDepthForEntries(2.5)).to.eq(3);
    expect(calcMinMerkleDepthForEntries(-1)).to.be.NaN;
  });

  it("calcMaxEntriesForMerkleDepth should calculate correctly", function () {
    // Valid queries
    expect(calcMaxEntriesForMerkleDepth(1)).to.eq(1);
    expect(calcMaxEntriesForMerkleDepth(2)).to.eq(2);
    expect(calcMaxEntriesForMerkleDepth(3)).to.eq(4);
    expect(calcMaxEntriesForMerkleDepth(4)).to.eq(8);
    expect(calcMaxEntriesForMerkleDepth(5)).to.eq(16);
    expect(calcMaxEntriesForMerkleDepth(13)).to.eq(4096);

    // Invalid queries
    expect(calcMaxEntriesForMerkleDepth(0)).to.eq(0);
    expect(calcMaxEntriesForMerkleDepth(2.5)).to.eq(2);
    expect(calcMaxEntriesForMerkleDepth(-1)).to.eq(0);
  });
});
