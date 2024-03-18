import { EdDSAPCDPackage, getEdDSAPublicKey } from "@pcd/eddsa-pcd";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { fromHexString } from "@pcd/util";
import { expect } from "chai";
import "mocha";
import { poseidon2 } from "poseidon-lite/poseidon2";
import {
  PODContent,
  decodePublicKey,
  signPODRoot,
  verifyPODRootSignature
} from "../src";
import { AltCryptCircomlibjs } from "./alternateCrypto";
import { privateKey, sampleEntries1 } from "./common";

describe("podCrypto helpers should work", async function () {
  // TODO(POD-P1): Test crypto helpers, removing this placeholder.
  it("podCrypto should do something", function () {
    expect(true).to.eq(true);
  });
});

describe("podCrypto use of zk-kit should be compatible with EdDSAPCD", async function () {
  it("EdDSA public/private key handling should match", async function () {
    const podContent = PODContent.fromEntries(sampleEntries1);
    const { publicKey } = signPODRoot(podContent.contentID, privateKey);
    const unpackedPublicKey = decodePublicKey(publicKey);
    expect(unpackedPublicKey).to.not.be.null;
    if (!unpackedPublicKey) {
      throw new Error("Bad public key point!");
    }

    // EdDSAPCD represents its signatures as an EC point (2 field elements)
    // in an array, with each element being 32 bytes encoded as 64 hex digits.
    const stringifiedPublicKey = unpackedPublicKey.map((n) =>
      n.toString(16).padStart(64, "0")
    );

    const pubFromString = await getEdDSAPublicKey(privateKey);
    expect(pubFromString).to.deep.eq(stringifiedPublicKey);

    const pubFromBuffer = await getEdDSAPublicKey(fromHexString(privateKey));
    expect(pubFromBuffer).to.deep.eq(stringifiedPublicKey);
  });

  it("EdDSA signing should match", async function () {
    // EdDSAPCD has an extra step where it hashes a list of bigints (the PCD's
    // message) into a single bigint (EdDSA's message) to sign.  Our root takes
    // the place of the already-hashed message.  To simulate steps which should
    // produce the same output, we calculate a poseidon signature of the input
    // message, and pretend that's a POD root.
    const pcdMessageNumbers = [0x12345n, 0xdeadbeefn];
    const pcdMessageStrings = pcdMessageNumbers.map((n) => n.toString());

    // Create an EdDSAPCD for comparison
    const pcd = await EdDSAPCDPackage.prove({
      message: {
        value: pcdMessageStrings,
        argumentType: ArgumentTypeName.StringArray
      },
      privateKey: {
        value: privateKey,
        argumentType: ArgumentTypeName.String
      },
      id: {
        value: undefined,
        argumentType: ArgumentTypeName.String
      }
    });

    // Perform the same signing operation as if for a POD.
    const hashedMessage = poseidon2(pcdMessageNumbers);
    const { publicKey, signature } = signPODRoot(hashedMessage, privateKey);
    const unpackedPublicKey = decodePublicKey(publicKey);
    expect(unpackedPublicKey).to.not.be.null;
    if (!unpackedPublicKey) {
      throw new Error("Bad public key point!");
    }

    // EdDSAPCD represents its signatures as an EC point (2 field elements)
    // in an array, with each element being 32 bytes encoded as 64 hex digits.
    const stringifiedPublicKey = unpackedPublicKey.map((n) =>
      n.toString(16).padStart(64, "0")
    );

    expect(stringifiedPublicKey).to.deep.eq(pcd.claim.publicKey);
    expect(signature).to.deep.eq(pcd.proof.signature);
  });
});

describe("podCrypto use of zk-kit should be compatible with circomlibjs", async function () {
  let altCrypto: AltCryptCircomlibjs;

  this.beforeAll(async function () {
    altCrypto = await AltCryptCircomlibjs.create();
  });

  // TODO(POD-P1): Compare hashing functions
  // TODO(POD-P1): Compare pack/unpack point
  // TODO(POD-P1): Compare pack/unpack public key
  // TODO(POD-P1): Compare pack/unpack signature

  it("signPODRoot should match", function () {
    const podContent = PODContent.fromEntries(sampleEntries1);
    const primaryImpl = signPODRoot(podContent.contentID, privateKey);
    const altImpl = altCrypto.signPODRoot(podContent.contentID, privateKey);
    expect(altImpl).to.deep.eq(primaryImpl);
  });

  it("verifyPODRootSignature should match", function () {
    const podContent = PODContent.fromEntries(sampleEntries1);
    const primaryImpl = signPODRoot(podContent.contentID, privateKey);
    const altImpl = altCrypto.signPODRoot(podContent.contentID, privateKey);
    expect(altImpl).to.deep.eq(primaryImpl);

    // Swap data to prove that primary impl can verify alternate impl's output,
    // and vice versa.
    expect(
      verifyPODRootSignature(
        podContent.contentID,
        altImpl.signature,
        altImpl.publicKey
      )
    ).to.be.true;
    expect(
      altCrypto.verifyPODRootSignature(
        podContent.contentID,
        primaryImpl.signature,
        primaryImpl.publicKey
      )
    ).to.be.true;
  });
});
