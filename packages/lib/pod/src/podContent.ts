import { LeanIMT, LeanIMTMerkleProof } from "@zk-kit/imt";
import assert from "assert";
import { podMerkleTreeHash, podNameHash, podValueHash } from "./podCrypto";
import { PODEntries, PODName, PODValue } from "./podTypes";
import { checkPODName, checkPODValue, getPODValueForCircuit } from "./podUtil";

type PODEntryInfo = { index: number; value: PODValue };
type PODMap = Map<PODName, PODEntryInfo>;
type PODMerkleTree = LeanIMT<bigint>;

/**
 * Merkle proof of an entry in a POD.
 */
export type PODEntryProof = LeanIMTMerkleProof<bigint>;

/**
 * Full info about a POD entry for inclusion in a ZK circuit.
 */
export type PODEntryCircuitSignals = {
  proof: PODEntryProof;
  nameHash: bigint;
  valueHash: bigint;
  value: bigint | undefined;
};

/**
 * TODO(artwyman): Class & method docs.
 */
export class PODContent {
  private _map: PODMap;
  private _merkleTree?: PODMerkleTree;

  private constructor(map: PODMap, merkleTree?: LeanIMT<bigint>) {
    this._map = map;
    this._merkleTree = merkleTree;
  }

  public static fromEntries(entries: PODEntries): PODContent {
    const sortedNames = Object.keys(entries)
      .map((name) => checkPODName(name))
      .sort();
    const podMap: PODMap = new Map();
    for (let i = 0; i < sortedNames.length; i++) {
      const name = sortedNames[i];
      podMap.set(name, { index: i, value: checkPODValue(name, entries[name]) });
    }
    return new PODContent(podMap, undefined);
  }

  private get merkleTree(): LeanIMT<bigint> {
    if (this._merkleTree === undefined) {
      const merkleTree = new LeanIMT<bigint>(podMerkleTreeHash);
      const hashes: bigint[] = [];
      for (const [podName, podInfo] of this._map.entries()) {
        hashes.push(podNameHash(podName));
        hashes.push(podValueHash(podInfo.value));
      }
      assert.equal(hashes.length, this._map.size * 2);
      merkleTree.insertMany(hashes);
      assert.equal(merkleTree.size, hashes.length);
      this._merkleTree = merkleTree;
    }
    return this._merkleTree;
  }

  public get contentID(): bigint {
    return this.merkleTree.root;
  }

  public get merkleTreeDepth(): number {
    return this.merkleTree.depth;
  }

  public get size(): number {
    return this._map.size;
  }

  public asEntries(): PODEntries {
    const entries: PODEntries = {};
    for (const [entryName, entryInfo] of this._map.entries()) {
      entries[entryName] = entryInfo.value;
    }
    return entries;
  }

  public listNames(): string[] {
    return [...this._map.keys()];
  }

  public listEntries(): { name: string; value: PODValue }[] {
    return [...this._map.entries()].map((e) => {
      return { name: e[0], value: e[1].value };
    });
  }

  public getValue(name: string): PODValue | undefined {
    return this._map.get(name)?.value;
  }

  public getRawValue(name: string): PODValue["value"] | undefined {
    return this._map.get(name)?.value?.value;
  }

  public generateEntryProof(entryName: string): PODEntryProof {
    return this.merkleTree.generateProof(
      this._getRequiredEntry(entryName).index * 2
    );
  }

  public static verifyEntryProof(entryProof: PODEntryProof): boolean {
    // TODO(artwyman): LeanIMT.verifyProof doesn't need the tree, just the hash.
    // It could be made static in zk-kit via a PR submission.
    return new LeanIMT<bigint>(podMerkleTreeHash).verifyProof(entryProof);
  }

  public generateEntryCircuitSignals(
    entryName: string
  ): PODEntryCircuitSignals {
    const entryInfo = this._getRequiredEntry(entryName);
    const merkleProof = this.generateEntryProof(entryName);
    return {
      proof: merkleProof,
      nameHash: merkleProof.leaf,
      valueHash: merkleProof.siblings[0],
      value: getPODValueForCircuit(entryInfo.value)
    };
  }

  private _getRequiredEntry(entryName: string): PODEntryInfo {
    const entryInfo = this._map.get(entryName);
    if (entryInfo === undefined) {
      throw new Error(`POD doesn't contain entry ${entryName}.`);
    }
    return entryInfo;
  }
}
