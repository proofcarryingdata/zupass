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
  it("should be able to generate a proof that verifies", async function () {
    const { prove, verify, serialize, deserialize } = SemaphoreGroupPCDPackage;

    const identity = new Identity();
    const group = new Group(1, 16);
    group.addMember(identity.commitment);
    const externalNullifier = group.root;
    const signal = 1;

    const args: SemaphoreGroupPCDArgs = {
      externalNullifier: BigInt(externalNullifier),
      signal: BigInt(signal),
      group,
      identity,
      zkeyFilePath,
      wasmFilePath,
    };

    const pcd = await prove(args);
    const verified = await verify(pcd);
    assert.equal(verified, true);
  });

  it("should not verify an incorrect proof", async function () {
    // TODO:
  });

  it("serializing and then deserializing a PCD should result in equal PCDs", async function () {
    // TODO:
  });

  it("verifying a deserialized PCD that is valid should result in a correct verification", async function () {
    // TODO:
  });
});
