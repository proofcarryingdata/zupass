import { ArgumentTypeName } from "@pcd/pcd-types";
import { SecretPhrasePCDPackage } from "@pcd/secret-phrase-pcd";
import assert from "assert";
import { Poseidon, buildPoseidon } from "circomlibjs";
import "mocha";
import path from "path";
import { phraseToBigints } from "../src/utils";


describe("RSA Ticket PCD should work", function () {
  this.timeout(1000 * 30);

  let poseidon: Poseidon;

  this.beforeAll(async () => {
    // get path to artifact directory
    const fullPath = path.join(__dirname, "../artifacts/");

    // initialize the PCD package with the circuit artifacts
    await SecretPhrasePCDPackage.init?.({
      verifyBaseURI: "https://localhost:3000", // not used in test
      wasmFilePath: `${fullPath}/../artifacts/circuit.wasm`,
      zkeyFilePath: `${fullPath}/../artifacts/circuit.zkey`
    });

    // initialize the Poseidon hash function
    poseidon = await buildPoseidon();
  });

  it("Check that PCD proving creates the right secet hash", async function () {
    // set the secret phrase to prove knowledge of
    const phrase = "hunter2";
    // convert the phrase to serialized field elements on Fr (BN254)
    const serializedPhrase = phraseToBigints(phrase);
    // compute the hash of the phrase to expect
    const expectedHash: bigint = poseidon.F.toObject(poseidon(serializedPhrase));

    // create the pcd by proving
    const pcd = await SecretPhrasePCDPackage.prove({
      includeSecret: {
        argumentType: ArgumentTypeName.Boolean,
        value: true,
      },
      phraseId: {
        argumentType: ArgumentTypeName.Number,
        value: "1",
      },
      username: {
        argumentType: ArgumentTypeName.String,
        value: "username",
      },
      secret: {
        argumentType: ArgumentTypeName.String,
        value: phrase,
      },
    });
    const empiricalHash = BigInt(pcd.claim.secretHash)
    // compare the hash of the secret phrase to the hash from the PCD's proof
    assert.equal(expectedHash, empiricalHash);
  });

  it("Check the creation of a PCD with the secret included", async function () {
    // define PCD args
    const includeSecret = true;
    const phrase = "hunter2";
    const username = "username";
    const phraseId = 1;

    // create the pcd by proving knowledge of the secret phrase
    const pcd = await SecretPhrasePCDPackage.prove({
      includeSecret: {
        argumentType: ArgumentTypeName.Boolean,
        value: includeSecret,
      },
      phraseId: {
        argumentType: ArgumentTypeName.Number,
        value: phraseId.toString(),
      },
      username: {
        argumentType: ArgumentTypeName.String,
        value: username,
      },
      secret: {
        argumentType: ArgumentTypeName.String,
        value: phrase,
      },
    });

    // verify the PCD
    const verified = await SecretPhrasePCDPackage.verify(pcd);
    assert(verified);

    // check the fields of the PCD are as expected (minus secret hash)
    // the secret phrase should be present in the claim
    assert.equal(pcd.claim.phraseId, phraseId);
    assert.equal(pcd.claim.secret, phrase);
    assert.equal(pcd.claim.username, username);
  });

  it("Check the creation of a PCD with the secret included", async function () {
    // define PCD args
    const includeSecret = false;
    const phrase = "hunter2";
    const username = "username";
    const phraseId = 1;

    // create the pcd by proving knowledge of the secret phrase
    const pcd = await SecretPhrasePCDPackage.prove({
      includeSecret: {
        argumentType: ArgumentTypeName.Boolean,
        value: includeSecret,
      },
      phraseId: {
        argumentType: ArgumentTypeName.Number,
        value: phraseId.toString(),
      },
      username: {
        argumentType: ArgumentTypeName.String,
        value: username,
      },
      secret: {
        argumentType: ArgumentTypeName.String,
        value: phrase,
      },
    });

    // verify the PCD
    const verified = await SecretPhrasePCDPackage.verify(pcd);
    assert(verified);

    // check the fields of the PCD are as expected (minus secret hash)
    // the secret phrase should be undefined in the claim
    assert.equal(pcd.claim.phraseId, phraseId);
    assert.equal(pcd.claim.secret, undefined);
    assert.equal(pcd.claim.username, username);
  });

  it("Should not verify an incorrect claim", async function () {
    // create the pcd by proving
    const pcd = await SecretPhrasePCDPackage.prove({
      includeSecret: {
        argumentType: ArgumentTypeName.Boolean,
        value: true,
      },
      phraseId: {
        argumentType: ArgumentTypeName.Number,
        value: "1",
      },
      username: {
        argumentType: ArgumentTypeName.String,
        value: "username",
      },
      secret: {
        argumentType: ArgumentTypeName.String,
        value: "hunter2",
      },
    });

    // change the secret hash to be incorrect
    pcd.claim.secretHash = (BigInt(pcd.claim.secretHash) + BigInt(1)).toString();

    // verify the PCD
    const verified = await SecretPhrasePCDPackage.verify(pcd);
    assert(!verified);
  })


  it("Serializing and then deserializing a PCD should result in equal PCDs", async function () {
    // create the pcd by proving
    const pcd = await SecretPhrasePCDPackage.prove({
      includeSecret: {
        argumentType: ArgumentTypeName.Boolean,
        value: true,
      },
      phraseId: {
        argumentType: ArgumentTypeName.Number,
        value: "1",
      },
      username: {
        argumentType: ArgumentTypeName.String,
        value: "username",
      },
      secret: {
        argumentType: ArgumentTypeName.String,
        value: "hunter2",
      },
    });

    // serialize the PCD
    const serializedPCD = await SecretPhrasePCDPackage.serialize(pcd);

    // deserialize the PCD
    const deserializedPCD = await SecretPhrasePCDPackage.deserialize(
      serializedPCD.pcd
    );

    // check the equivalence of the PCDs
    assert.deepEqual(deserializedPCD, pcd);
  });

  it("Verifying a deserialized PCD that is valid should result in a correct verification", async function () {
    // create the pcd by proving
    const pcd = await SecretPhrasePCDPackage.prove({
      includeSecret: {
        argumentType: ArgumentTypeName.Boolean,
        value: true,
      },
      phraseId: {
        argumentType: ArgumentTypeName.Number,
        value: "1",
      },
      username: {
        argumentType: ArgumentTypeName.String,
        value: "username",
      },
      secret: {
        argumentType: ArgumentTypeName.String,
        value: "hunter2",
      },
    });

    // serialize the PCD
    const serializedPCD = await SecretPhrasePCDPackage.serialize(pcd);

    // deserialize the PCD
    const deserializedPCD = await SecretPhrasePCDPackage.deserialize(
      serializedPCD.pcd
    );

    // verify the deserialized PCD
    const verified = await SecretPhrasePCDPackage.verify(deserializedPCD);
    assert(verified);
  });
});
