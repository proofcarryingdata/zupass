import { ArgumentTypeName } from "@pcd/pcd-types";
import { serializeSemaphoreGroup } from "@pcd/semaphore-group-pcd";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { Identity as IdentityV3 } from "@pcd/semaphore-identity-v3-wrapper";
import { Group } from "@semaphore-protocol/group";
import assert from "assert";
import "mocha";
import * as path from "path";
import { RLNPCDArgs, RLNPCDPackage } from "../src";

const TREE_DEPTH = 16;

const zkeyFilePath = path.join(__dirname, `../artifacts/${TREE_DEPTH}.zkey`);
const wasmFilePath = path.join(__dirname, `../artifacts/${TREE_DEPTH}.wasm`);

describe("rln-pcd should work", function () {
  this.beforeAll(async function () {
    if (!RLNPCDPackage.init) return;
    await RLNPCDPackage.init({
      zkeyFilePath,
      wasmFilePath
    });
  });

  let args: RLNPCDArgs;

  beforeEach(async function () {
    const identity = new IdentityV3();
    const group = new Group(1, TREE_DEPTH);
    group.addMember(identity.commitment);
    const signal = "hey hey";
    const rlnIdentifier = BigInt(5566);
    const epoch = BigInt(42);

    const identityPCD = await SemaphoreIdentityPCDPackage.serialize(
      await SemaphoreIdentityPCDPackage.prove({ identityV3: identity })
    );

    // Arguments required for proving
    args = {
      rlnIdentifier: {
        argumentType: ArgumentTypeName.BigInt,
        value: String(rlnIdentifier)
      },
      identity: {
        argumentType: ArgumentTypeName.PCD,
        value: identityPCD
      },
      group: {
        argumentType: ArgumentTypeName.Object,
        value: serializeSemaphoreGroup(group, "test name")
      },
      signal: {
        argumentType: ArgumentTypeName.String,
        value: signal
      },
      epoch: {
        argumentType: ArgumentTypeName.BigInt,
        value: String(epoch)
      }
    };
  });

  it("should be able to generate a proof that verifies", async function () {
    const { prove, verify } = RLNPCDPackage;
    const pcd = await prove(args);
    const verified = await verify(pcd);
    assert.equal(verified, true);
  });

  it("should not verify an incorrect proof", async function () {
    const { prove, verify } = RLNPCDPackage;
    const pcd = await prove(args);
    // change merkle root to make it invalid
    pcd.claim.merkleRoot = BigInt(0);
    const verified = await verify(pcd);
    assert.equal(verified, false);
  });

  it("should throw when verifying if pcd claim and proof mismatch", async function () {
    const { prove, verify } = RLNPCDPackage;
    const pcd = await prove(args);
    const wrongEpoch = BigInt(43);
    pcd.claim.epoch = wrongEpoch;
    await assert.rejects(async () => {
      await verify(pcd);
    }, /claim and proof mismatch/);
  });

  it("serializing and then deserializing a PCD should result in equal PCDs", async function () {
    const { prove, serialize, deserialize } = RLNPCDPackage;
    const pcd = await prove(args);

    const serialized_pcd = await serialize(pcd);
    const deserialized_pcd = await deserialize(serialized_pcd.pcd);

    assert.deepEqual(deserialized_pcd, pcd);
  });

  it("verifying a deserialized PCD that is valid should result in a correct verification", async function () {
    const { prove, verify, serialize, deserialize } = RLNPCDPackage;
    const pcd = await prove(args);

    const serialized_pcd = await serialize(pcd);
    const deserialized_pcd = await deserialize(serialized_pcd.pcd);
    const verified = await verify(deserialized_pcd);

    assert.equal(verified, true);
  });
});
