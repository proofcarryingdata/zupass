import { ecsign, hashPersonalMessage, privateToPublic } from "@ethereumjs/util";
import { Poseidon, Tree } from "@personaelabs/spartan-ecdsa";
import assert from "assert";
import * as path from "path";
import {
  ETHPubkeyGroupPCDArgs,
  ETHPubkeyGroupPCDPackage,
} from "../src/ETHPubkeyGroupPCD";

const circuitFilePath = path.join(
  __dirname,
  "../artifacts/pubkey_membership.circuit"
);
const wasmFilePath = path.join(
  __dirname,
  "../artifacts/pubkey_membership.wasm"
);

describe("ETH pubkey group membership check should work", function () {
  this.timeout(1000 * 30);

  // Set up initial tree
  const treeDepth = 20;
  const privKeys = ["1", "a", "bb", "ccc", "dddd", "ffff"].map((val) =>
    Buffer.from(val.padStart(64, "0"), "hex")
  );

  // Signature (Use privKeys[0] for proving)
  const proverIndex = 0;
  const proverPrivKey = privKeys[proverIndex];
  let msg = Buffer.from("Test message");
  const msgHash = hashPersonalMessage(msg);

  const { v, r, s } = ecsign(msgHash, proverPrivKey);
  const sig = `0x${r.toString("hex")}${s.toString("hex")}${v.toString(16)}`;

  // Set up shared args across test cases
  let poseidon: Poseidon;
  let args: ETHPubkeyGroupPCDArgs;

  this.beforeAll(async () => {
    // Init Poseidon
    poseidon = new Poseidon();
    await poseidon.initWasm();

    // Insert the members into the tree
    const pubKeyTree = new Tree(treeDepth, poseidon);
    let pubKeyPoseidonHash: bigint = BigInt("0");
    for (const privKey of privKeys) {
      const pubKey = privateToPublic(privKey);
      const pubKeyHash = poseidon.hashPubKey(pubKey);
      pubKeyTree.insert(pubKeyHash);

      if (proverPrivKey === privKey) pubKeyPoseidonHash = pubKeyHash;
    }

    args = {
      tree: pubKeyTree,
      pubKeyPoseidonHash,
      msgHash,
      sig,
      wasmFilePath,
      circuitFilePath,
    };
  });

  it("should be able to generate a proof that verifies", async function () {
    const { prove, verify } = ETHPubkeyGroupPCDPackage;
    const pcd = await prove(args);
    const verified = await verify(pcd);
    assert.equal(verified, true);
  });

  it("should not verify a broken proof", async function () {
    const { prove, verify } = ETHPubkeyGroupPCDPackage;
    const pcd = await prove(args);

    // change merkle root
    pcd.claim.publicInput.circuitPubInput.merkleRoot = BigInt("0");

    const verified = await verify(pcd);
    assert.equal(verified, false);
  });

  it("serializing and then deserializing a PCD should result in equal PCDs", async function () {
    const { prove, serialize, deserialize } = ETHPubkeyGroupPCDPackage;
    const pcd = await prove(args);

    const serialized_pcd = await serialize(pcd);
    const deserialized_pcd = await deserialize(serialized_pcd);

    assert.deepEqual(deserialized_pcd, pcd);
  });

  it("verifying a deserialized PCD that is valid should result in a correct verification", async function () {
    const { prove, verify, serialize, deserialize } = ETHPubkeyGroupPCDPackage;
    const pcd = await prove(args);

    const serialized_pcd = await serialize(pcd);
    const deserialized_pcd = await deserialize(serialized_pcd);
    const verified = await verify(deserialized_pcd);

    assert.equal(verified, true);
  });
});
