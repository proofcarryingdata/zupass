import { Group } from "@semaphore-protocol/group";
import { Identity } from "@semaphore-protocol/identity";
import { generateProof, verifyProof } from "@semaphore-protocol/proof";
import assert from "assert";
import * as path from "path";
import {
  SemaphorePubKeyRevealPCD,
  SemaphorePubKeyRevealPCDArgs,
  SemaphorePubKeyRevealPCDClaim,
  SemaphorePubKeyRevealPCDPackage,
  SemaphorePubKeyRevealPCDProof,
} from "../src/SemaphorePubKeyRevealPCD";

const zkeyFilePath = path.join(__dirname, "../artifacts/16.zkey");
const wasmFilePath = path.join(__dirname, "../artifacts/16.wasm");

describe("semaphore group identity should work", function () {
  this.timeout(1000 * 30);

  // sets up shared Semaphore args across test cases
  let args: SemaphorePubKeyRevealPCDArgs;
  beforeEach(function () {
    const identity = new Identity();
    const externalNullifier = "1";
    const signal = 1;

    args = {
      externalNullifier: BigInt(externalNullifier),
      signal: BigInt(signal),
      identity,
      zkeyFilePath,
      wasmFilePath,
    };
  });

  it("should be able to generate a proof that verifies", async function () {
    const { prove, verify } = SemaphorePubKeyRevealPCDPackage;
    const pcd = await prove(args);
    const verified = await verify(pcd);
    assert.equal(verified, true);
  });

  it("should not verify an incorrect proof", async function () {
    const { prove, verify } = SemaphorePubKeyRevealPCDPackage;
    // change merkle root to make it invalid
    const pcd = await prove(args);
    pcd.proof.proof.merkleTreeRoot = "0";
    const verified = await verify(pcd);
    assert.equal(verified, false);
  });

  it("should not verify a valid semaphore proof over a non singleton group", async function () {
    const { verify } = SemaphorePubKeyRevealPCDPackage;

    // group with other members, non-singleton
    const group = new Group(1, 16);
    group.addMember(args.identity.commitment);
    group.addMember("1");
    group.addMember("2");
    const fullProof = await generateProof(
      args.identity,
      group,
      args.externalNullifier,
      args.signal,
      {
        zkeyFilePath: args.zkeyFilePath,
        wasmFilePath: args.wasmFilePath,
      }
    );

    // make PCD with this proof
    const fakeClaim: SemaphorePubKeyRevealPCDClaim = {
      groupDepth: 16,
      identityCommitment: args.identity.commitment.toString(),
      externalNullifier: args.externalNullifier.toString(),
      nullifierHash: fullProof.nullifierHash.toString(),
      signal: args.signal.toString(),
    };
    const fakeProof: SemaphorePubKeyRevealPCDProof = {
      proof: fullProof,
    };
    const fakePCD = new SemaphorePubKeyRevealPCD(fakeClaim, fakeProof);

    // verify just the proof
    const validProof = await verifyProof(
      fakePCD.proof.proof,
      fakePCD.claim.groupDepth
    );
    assert.equal(validProof, true);

    // attempt to verify the entire PCD
    const verified = await verify(fakePCD);
    assert.equal(verified, false);
  });

  it("serializing and then deserializing a PCD should result in equal PCDs", async function () {
    const { prove, serialize, deserialize } = SemaphorePubKeyRevealPCDPackage;
    const pcd = await prove(args);
    const serialized_pcd = await serialize(pcd);
    const deserialized_pcd = await deserialize(serialized_pcd);
    assert.deepEqual(deserialized_pcd, pcd);
  });

  it("verifying a deserialized PCD that is valid should result in a correct verification", async function () {
    const { prove, verify, serialize, deserialize } =
      SemaphorePubKeyRevealPCDPackage;
    const pcd = await prove(args);
    const serialized_pcd = await serialize(pcd);
    const deserialized_pcd = await deserialize(serialized_pcd);
    const verified = await verify(deserialized_pcd);
    assert.equal(verified, true);
  });
});
