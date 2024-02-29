import { expect } from "chai";
import "mocha";
import {
  PODContent,
  isPODNumericValue,
  podNameHash,
  podValueHash
} from "../src";
import { sampleEntries1, sampleEntries2 } from "./common";

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

  it("should allow access to entries by name", function () {
    for (const entryName of podContent1.listNames()) {
      expect(podContent1.getValue(entryName)).to.deep.eq(
        sampleEntries1[entryName]
      );
      expect(podContent1.getRawValue(entryName)).to.eq(
        sampleEntries1[entryName].value
      );
    }
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

  // TODO(artwyman): Tests for illegal names & values in PODEntries
});
