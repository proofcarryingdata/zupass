/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ArgumentTypeName } from "@pcd/pcd-types";
import {
  SemaphoreIdentityPCDPackage,
  SemaphoreIdentityPCDTypeName,
} from "@pcd/semaphore-identity-pcd";
import { Identity } from "@semaphore-protocol/identity";
import assert from "assert";
import { ethers } from "ethers";
import * as path from "path";
import { EthereumOwnershipPCDPackage } from "../src/EthereumOwnershipPCD";

const zkeyFilePath: string = path.join(__dirname, "../artifacts/16.zkey");
const wasmFilePath: string = path.join(__dirname, "../artifacts/16.wasm");

describe("Ethereum ownership PCD", function () {
  this.timeout(30 * 1000);

  this.beforeAll(async function () {
    await EthereumOwnershipPCDPackage.init!({
      zkeyFilePath,
      wasmFilePath,
    });
  });

  it("should work", async function () {
    const wallet = ethers.Wallet.createRandom(null);
    const identity = await SemaphoreIdentityPCDPackage.prove({
      identity: new Identity(),
    });
    const serializedIdentity = await SemaphoreIdentityPCDPackage.serialize(
      identity
    );
    const signatureOfIdentityCommitment = await wallet.signMessage(
      new TextEncoder().encode(identity.claim.identity.commitment.toString())
    );

    const ethereumPCD = await EthereumOwnershipPCDPackage.prove({
      ethereumAddress: {
        argumentType: ArgumentTypeName.String,
        value: wallet.address,
      },
      ethereumSignatureOfCommitment: {
        argumentType: ArgumentTypeName.String,
        value: signatureOfIdentityCommitment,
      },
      identity: {
        argumentType: ArgumentTypeName.PCD,
        pcdType: SemaphoreIdentityPCDTypeName,
        value: serializedIdentity,
      },
      identityCommitment: {
        argumentType: ArgumentTypeName.String,
        value: identity.claim.identity.commitment.toString(),
      },
    });

    await EthereumOwnershipPCDPackage.verify(ethereumPCD);
  });

  it("should not be able create a PCD from an invalid signature", async function () {
    const wallet = ethers.Wallet.createRandom(null);
    const identity = await SemaphoreIdentityPCDPackage.prove({
      identity: new Identity(),
    });
    const serializedIdentity = await SemaphoreIdentityPCDPackage.serialize(
      identity
    );
    const signatureOfIdentityCommitment = await wallet.signMessage(
      new TextEncoder().encode(identity.claim.identity.commitment.toString())
    );
    const mangledSignature =
      signatureOfIdentityCommitment.substring(
        0,
        signatureOfIdentityCommitment.length - 1
      ) + "0";

    assert.rejects(async () => {
      await EthereumOwnershipPCDPackage.prove({
        ethereumAddress: {
          argumentType: ArgumentTypeName.String,
          value: wallet.address,
        },
        ethereumSignatureOfCommitment: {
          argumentType: ArgumentTypeName.String,
          value: mangledSignature,
        },
        identity: {
          argumentType: ArgumentTypeName.PCD,
          pcdType: SemaphoreIdentityPCDTypeName,
          value: serializedIdentity,
        },
        identityCommitment: {
          argumentType: ArgumentTypeName.String,
          value: identity.claim.identity.commitment.toString(),
        },
      });
    });
  });
});
