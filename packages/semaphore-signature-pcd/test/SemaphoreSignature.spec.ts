/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { Group } from "@semaphore-protocol/group";
import { Identity } from "@semaphore-protocol/identity";
import { generateProof, verifyProof } from "@semaphore-protocol/proof";
import assert from "assert";
import * as path from "path";
import {
  SemaphoreSignaturePCD,
  SemaphoreSignaturePCDArgs,
  SemaphoreSignaturePCDClaim,
  SemaphoreSignaturePCDPackage,
  SemaphoreSignaturePCDProof,
} from "../src/SemaphoreSignaturePCD";

const zkeyFilePath: string = path.join(__dirname, "../artifacts/16.zkey");
const wasmFilePath: string = path.join(__dirname, "../artifacts/16.wasm");

describe("semaphore signature should work", function () {
  this.timeout(1000 * 30);

  // sets up shared Semaphore args across test cases
  let args: SemaphoreSignaturePCDArgs;
  this.beforeAll(async function () {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    await SemaphoreSignaturePCDPackage.init!({
      zkeyFilePath,
      wasmFilePath,
    });

    const identity = new Identity();
    const identityPCD = await SemaphoreIdentityPCDPackage.serialize(
      await SemaphoreIdentityPCDPackage.prove({ identity })
    );

    args = {
      identity: {
        argumentType: ArgumentTypeName.PCD,
        value: identityPCD,
      },
      signedMessage: {
        argumentType: ArgumentTypeName.String,
        value: "Test message",
      },
    };
  });

  it("should be able to generate a proof that verifies", async function () {
    const { prove, verify } = SemaphoreSignaturePCDPackage;
    const pcd = await prove(args);
    const verified = await verify(pcd);
    assert.equal(verified, true);
  });

  it("should not verify an incorrect proof", async function () {
    const { prove, verify } = SemaphoreSignaturePCDPackage;
    // change merkle root to make it invalid
    const pcd = await prove(args);
    pcd.proof.proof[0] = "1";
    const verified = await verify(pcd);
    assert.equal(verified, false);
  });

  it("should not verify a valid semaphore proof over a non singleton group", async function () {
    const { prove, verify } = SemaphoreSignaturePCDPackage;

    // generate a valid proof to get hashed version of signal
    const pcd = await prove(args);

    // pull out original identity from parameters
    const serializedIdentityPCD = args.identity.value?.pcd;
    const identityPCD = await SemaphoreIdentityPCDPackage.deserialize(
      serializedIdentityPCD!
    );

    // group with other members, non-singleton
    const group = new Group(1, 16);
    group.addMember(identityPCD.claim.identity.commitment);
    group.addMember("1");
    group.addMember("2");
    const fullProof = await generateProof(
      identityPCD.claim.identity,
      group,
      identityPCD.claim.identity.commitment,
      pcd.claim.signal,
      {
        zkeyFilePath: zkeyFilePath,
        wasmFilePath: wasmFilePath,
      }
    );

    // make PCD with this proof
    const fakeClaim: SemaphoreSignaturePCDClaim = {
      identityCommitment: identityPCD.claim.identity.commitment.toString(),
      signedMessage: pcd.claim.signedMessage,
      nullifierHash: pcd.claim.nullifierHash,
      externalNullifier: pcd.claim.externalNullifier,
      signal: pcd.claim.signal,
    };

    const fakeProof: SemaphoreSignaturePCDProof = {
      proof: fullProof.proof,
    };

    const fakePCD = new SemaphoreSignaturePCD("0", fakeClaim, fakeProof);

    // verify just the proof
    const validProof = await verifyProof(fullProof, 16);
    assert.equal(validProof, true);

    // attempt to verify the entire PCD
    const verified = await verify(fakePCD);
    assert.equal(verified, false);
  });

  it("should not verify a PCD with a different message in claim from the signal in a (valid) semaphore proof", async function () {
    const { verify } = SemaphoreSignaturePCDPackage;

    // pull out original identity from parameters
    const serializedIdentityPCD = args.identity.value?.pcd;
    const identityPCD = await SemaphoreIdentityPCDPackage.deserialize(
      serializedIdentityPCD!
    );

    // singleton group, but a different signal
    const group = new Group(1, 16);
    group.addMember(identityPCD.claim.identity.commitment);
    const fullProof = await generateProof(
      identityPCD.claim.identity,
      group,
      identityPCD.claim.identity.commitment,
      "1",
      {
        zkeyFilePath: zkeyFilePath,
        wasmFilePath: wasmFilePath,
      }
    );

    // make PCD with this proof, but the same message as the original args
    const fakeClaim: SemaphoreSignaturePCDClaim = {
      identityCommitment: identityPCD.claim.identity.commitment.toString(),
      signedMessage: args.signedMessage.value!,
      nullifierHash: fullProof.nullifierHash + "",
      externalNullifier: fullProof.externalNullifier + "",
      signal: fullProof.signal + "",
    };
    const fakeProof: SemaphoreSignaturePCDProof = {
      proof: fullProof.proof,
    };

    const fakePCD = new SemaphoreSignaturePCD("0", fakeClaim, fakeProof);

    // verify just the proof
    const validProof = await verifyProof(fullProof, 16);
    assert.equal(validProof, true);

    // attempt to verify the entire PCD
    const verified = await verify(fakePCD);
    assert.equal(verified, false);
  });

  it("serializing and then deserializing a PCD should result in equal PCDs", async function () {
    const { prove, serialize, deserialize } = SemaphoreSignaturePCDPackage;
    const pcd = await prove(args);
    const serialized_pcd = await serialize(pcd);
    const deserialized_pcd = await deserialize(serialized_pcd.pcd);
    assert.deepEqual(deserialized_pcd, pcd);
  });

  it("verifying a deserialized PCD that is valid should result in a correct verification", async function () {
    const { prove, verify, serialize, deserialize } =
      SemaphoreSignaturePCDPackage;
    const pcd = await prove(args);
    const serialized_pcd = await serialize(pcd);
    const deserialized_pcd = await deserialize(serialized_pcd.pcd);
    const verified = await verify(deserialized_pcd);
    assert.equal(verified, true);
  });
});
