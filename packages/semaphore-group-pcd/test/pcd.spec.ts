import { Group } from "@semaphore-protocol/group";
import { Identity } from "@semaphore-protocol/identity";
import assert from "assert";
import * as path from "path";
import {
  SemaphoreGroupPCDArgs,
  SemaphoreGroupPCDPackage,
} from "../src/SemaphoreGroupPCD";

const zkeyFilePath = path.join(__dirname, "../artifacts/16.zkey");
const wasmFilePath = path.join(__dirname, "../artifacts/16.wasm");

describe("semaphore group identity should work", function () {
  // sets up shared Semaphore args across test cases
  let args: SemaphoreGroupPCDArgs;
  beforeEach(function () {
    const identity = new Identity();
    const group = new Group(1, 16);
    group.addMember(identity.commitment);
    const externalNullifier = group.root;
    const signal = 1;

    args = {
      externalNullifier: BigInt(externalNullifier),
      signal: BigInt(signal),
      group,
      identity,
      zkeyFilePath,
      wasmFilePath,
    };
  });

  it("should be able to generate a proof that verifies", async function () {
    const { prove, verify } = SemaphoreGroupPCDPackage;
    const pcd = await prove(args);
    const verified = await verify(pcd);
    assert.equal(verified, true);
  });

  it("should not verify an incorrect proof", async function () {
    const { prove, verify } = SemaphoreGroupPCDPackage;

    // change merkle root to make it invalid
    const pcd = await prove(args);
    pcd.proof.proof.merkleTreeRoot = "0";

    const verified = await verify(pcd);
    assert.equal(verified, false);
  });

  it("serializing and then deserializing a PCD should result in equal PCDs", async function () {
    const { prove, serialize, deserialize } = SemaphoreGroupPCDPackage;
    const pcd = await prove(args);

    const serialized_pcd = await serialize(pcd);
    const deserialized_pcd = await deserialize(serialized_pcd);

    assert.deepEqual(deserialized_pcd, pcd);
  });

  it("verifying a deserialized PCD that is valid should result in a correct verification", async function () {
    const { prove, verify, serialize, deserialize } = SemaphoreGroupPCDPackage;
    const pcd = await prove(args);

    const serialized_pcd = await serialize(pcd);
    const deserialized_pcd = await deserialize(serialized_pcd);
    const verified = await verify(deserialized_pcd);

    assert.equal(verified, true);
  });
});
