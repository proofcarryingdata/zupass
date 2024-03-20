/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ArgumentTypeName } from "@pcd/pcd-types";
import {
  SemaphoreIdentityPCDPackage,
  SemaphoreIdentityPCDTypeName
} from "@pcd/semaphore-identity-pcd";
import { Identity } from "@semaphore-protocol/identity";
import assert from "assert";
import { ethers } from "ethers";
import "mocha";
import * as path from "path";
import { EthereumOwnershipPCDPackage } from "../src/EthereumOwnershipPCD";

const zkeyFilePath: string = path.join(__dirname, "../artifacts/16.zkey");
const wasmFilePath: string = path.join(__dirname, "../artifacts/16.wasm");

describe("Ethereum ownership PCD", function () {
  this.beforeAll(async function () {
    await EthereumOwnershipPCDPackage.init!({
      zkeyFilePath,
      wasmFilePath
    });
  });

  it("should work", async function () {
    const wallet = ethers.Wallet.createRandom();
    const identity = await SemaphoreIdentityPCDPackage.prove({
      identity: new Identity()
    });
    const serializedIdentity =
      await SemaphoreIdentityPCDPackage.serialize(identity);
    const signatureOfIdentityCommitment = await wallet.signMessage(
      identity.claim.identity.commitment.toString()
    );

    const ethereumPCD = await EthereumOwnershipPCDPackage.prove({
      ethereumAddress: {
        argumentType: ArgumentTypeName.String,
        value: wallet.address
      },
      ethereumSignatureOfCommitment: {
        argumentType: ArgumentTypeName.String,
        value: signatureOfIdentityCommitment
      },
      identity: {
        argumentType: ArgumentTypeName.PCD,
        pcdType: SemaphoreIdentityPCDTypeName,
        value: serializedIdentity
      }
    });

    assert(
      await EthereumOwnershipPCDPackage.verify(ethereumPCD),
      `Verification failed for Ethereum ownership PCD: ${EthereumOwnershipPCDPackage.serialize(
        ethereumPCD
      )}`
    );
  });

  it("should not be able create a PCD from an invalid signature", async function () {
    const wallet = ethers.Wallet.createRandom();
    const identity = await SemaphoreIdentityPCDPackage.prove({
      identity: new Identity()
    });
    const serializedIdentity =
      await SemaphoreIdentityPCDPackage.serialize(identity);
    const signatureOfIdentityCommitment = await wallet.signMessage(
      identity.claim.identity.commitment.toString()
    );
    const mangledSignature =
      signatureOfIdentityCommitment.substring(
        0,
        signatureOfIdentityCommitment.length - 1
      ) + "0";

    await assert.rejects(async () => {
      await EthereumOwnershipPCDPackage.prove({
        ethereumAddress: {
          argumentType: ArgumentTypeName.String,
          value: wallet.address
        },
        ethereumSignatureOfCommitment: {
          argumentType: ArgumentTypeName.String,
          value: mangledSignature
        },
        identity: {
          argumentType: ArgumentTypeName.PCD,
          pcdType: SemaphoreIdentityPCDTypeName,
          value: serializedIdentity
        }
      });
    }, "Invalid signature of PCD should have failed:");
  });

  it("should not be able create a PCD where identity does not match identity pcd", async function () {
    const wallet = ethers.Wallet.createRandom();
    const identity = await SemaphoreIdentityPCDPackage.prove({
      identity: new Identity()
    });
    const signatureOfIdentityCommitment = await wallet.signMessage(
      identity.claim.identity.commitment.toString()
    );

    const identity2 = await SemaphoreIdentityPCDPackage.prove({
      identity: new Identity()
    });
    const serializedIdentity2 =
      await SemaphoreIdentityPCDPackage.serialize(identity2);

    await assert.rejects(
      async () =>
        await EthereumOwnershipPCDPackage.prove({
          ethereumAddress: {
            argumentType: ArgumentTypeName.String,
            value: wallet.address
          },
          ethereumSignatureOfCommitment: {
            argumentType: ArgumentTypeName.String,
            value: signatureOfIdentityCommitment
          },
          identity: {
            argumentType: ArgumentTypeName.PCD,
            pcdType: SemaphoreIdentityPCDTypeName,
            value: serializedIdentity2
          }
        }),
      "Identity does not match identity PCD - should have failed"
    );
  });

  it("should not be able verify a PCD whose Ethereum address was tampered with", async function () {
    const wallet = ethers.Wallet.createRandom();
    const identity = await SemaphoreIdentityPCDPackage.prove({
      identity: new Identity()
    });
    const serializedIdentity =
      await SemaphoreIdentityPCDPackage.serialize(identity);
    const signatureOfIdentityCommitment = await wallet.signMessage(
      identity.claim.identity.commitment.toString()
    );

    const pcd = await EthereumOwnershipPCDPackage.prove({
      ethereumAddress: {
        argumentType: ArgumentTypeName.String,
        value: wallet.address
      },
      ethereumSignatureOfCommitment: {
        argumentType: ArgumentTypeName.String,
        value: signatureOfIdentityCommitment
      },
      identity: {
        argumentType: ArgumentTypeName.PCD,
        pcdType: SemaphoreIdentityPCDTypeName,
        value: serializedIdentity
      }
    });
    const finalCharacter = pcd.claim.ethereumAddress.substring(
      pcd.claim.ethereumAddress.length - 1
    );
    const replacementCharacter = finalCharacter === "0" ? "1" : "0";
    const mangledAddress =
      pcd.claim.ethereumAddress.substring(
        0,
        pcd.claim.ethereumAddress.length - 1
      ) + replacementCharacter;

    console.log(mangledAddress);
    console.log(pcd.claim.ethereumAddress);

    pcd.claim.ethereumAddress = mangledAddress;

    assert(
      !(await EthereumOwnershipPCDPackage.verify(pcd)),
      `Ethereum ownership PCD should have failed to verify but passed: ${await EthereumOwnershipPCDPackage.serialize(
        pcd
      )}`
    );
  });
});
