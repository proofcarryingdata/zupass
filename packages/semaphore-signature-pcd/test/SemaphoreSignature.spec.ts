/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { Identity } from "@semaphore-protocol/identity";
import assert from "assert";
import "mocha";
import * as path from "path";
import {
  SemaphoreSignaturePCDArgs,
  SemaphoreSignaturePCDPackage
} from "../src/SemaphoreSignaturePCD";

const zkeyFilePath: string = path.join(__dirname, "../artifacts/16.zkey");
const wasmFilePath: string = path.join(__dirname, "../artifacts/16.wasm");

describe("semaphore signature PCD should work", function () {
  this.timeout(1000 * 30);

  // sets up shared Semaphore args across test cases
  let args: SemaphoreSignaturePCDArgs;
  this.beforeAll(async function () {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    await SemaphoreSignaturePCDPackage.init!({
      zkeyFilePath,
      wasmFilePath
    });

    const identity = new Identity();
    const identityPCD = await SemaphoreIdentityPCDPackage.serialize(
      await SemaphoreIdentityPCDPackage.prove({ identity })
    );

    args = {
      identity: {
        argumentType: ArgumentTypeName.PCD,
        pcdType: SemaphoreIdentityPCDPackage.name,
        value: identityPCD
      },
      signedMessage: {
        argumentType: ArgumentTypeName.String,
        value: "Test message"
      }
    };
  });

  it("should be able to generate a PCD that verifies", async function () {
    const { prove, verify } = SemaphoreSignaturePCDPackage;
    const pcd = await prove(args);
    const verified = await verify(pcd);
    assert.equal(verified, true);
  });

  it("should not verify a PCD with an incorrect signed message", async function () {
    const { prove, verify } = SemaphoreSignaturePCDPackage;
    const pcd = await prove(args);
    pcd.claim.signedMessage += "1";
    const verified = await verify(pcd);
    assert.equal(verified, false);
  });

  it("should not verify a PCD with an incorrect nullifier hash", async function () {
    const { prove, verify } = SemaphoreSignaturePCDPackage;
    const pcd = await prove(args);
    pcd.claim.nullifierHash += "1";
    const verified = await verify(pcd);
    assert.equal(verified, false);
  });

  it("should not verify a PCD with an incorrect identity commitment", async function () {
    const { prove, verify } = SemaphoreSignaturePCDPackage;
    const pcd = await prove(args);
    pcd.claim.identityCommitment += "1";
    const verified = await verify(pcd);
    assert.equal(verified, false);
  });

  it("should not verify a proof with an incorrect proof", async function () {
    const { prove, verify } = SemaphoreSignaturePCDPackage;
    const pcd = await prove(args);
    pcd.proof[0] += "1";
    const verified = await verify(pcd);
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
