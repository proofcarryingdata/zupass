import {
  Biome,
  EdDSAFrogPCDPackage,
  EdDSAFrogPCDTypeName,
  IFrogData,
  Rarity,
  Temperament
} from "@pcd/eddsa-frog-pcd";
import { getEdDSAPublicKey } from "@pcd/eddsa-pcd";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import {
  SemaphoreIdentityPCD,
  SemaphoreIdentityPCDPackage,
  SemaphoreIdentityPCDTypeName
} from "@pcd/semaphore-identity-pcd";
import { Identity } from "@semaphore-protocol/identity";
import assert from "assert";
import { expect } from "chai";
import "mocha";
import * as path from "path";
import {
  STATIC_ZK_EDDSA_FROG_PCD_NULLIFIER,
  ZKEdDSAFrogPCD,
  ZKEdDSAFrogPCDArgs,
  ZKEdDSAFrogPCDClaim,
  ZKEdDSAFrogPCDPackage
} from "../src";

const zkeyFilePath = path.join(__dirname, `../src/artifacts/circuit.zkey`);
const wasmFilePath = path.join(__dirname, `../src/artifacts/circuit.wasm`);

const identity1 = new Identity(
  '["329061722381819402313027227353491409557029289040211387019699013780657641967", "99353161014976810914716773124042455250852206298527174581112949561812190422"]'
);

const identity2 = new Identity(
  '["222061722381819402313027227353491409557029289040211387019699013780657641967", "99353161014976810914716773124042455250852206298527174581112949561812190422"]'
);

// Key borrowed from https://github.com/iden3/circomlibjs/blob/4f094c5be05c1f0210924a3ab204d8fd8da69f49/test/eddsa.js#L103
const prvKey =
  "0001020304050607080900010203040506070809000102030405060708090001";

const EXTERNAL_NULLIFIER = BigInt(42);
const WATERMARK = BigInt(6);

describe("ZKEdDSAFrogPCD should work", function () {
  this.timeout(1000 * 30);

  let pcd: ZKEdDSAFrogPCD;

  const frogData: IFrogData = {
    // the fields below are not signed and are used for display purposes
    name: "test name",
    description: "test description",
    imageUrl: "/frog.png",

    // the fields below are signed using the server's private eddsa key
    frogId: 0,
    biome: Biome.Unknown,
    rarity: Rarity.Unknown,
    temperament: Temperament.UNKNOWN,
    jump: 0,
    speed: 0,
    intelligence: 0,
    beauty: 0,
    timestampSigned: Date.now(),
    ownerSemaphoreId: identity1.getCommitment().toString()
  };

  async function makeSerializedIdentityPCD(
    identity: Identity
  ): Promise<SerializedPCD<SemaphoreIdentityPCD>> {
    const identityPCD = await SemaphoreIdentityPCDPackage.prove({
      identity: identity
    });

    return await SemaphoreIdentityPCDPackage.serialize(identityPCD);
  }

  async function toArgs(frogData: IFrogData): Promise<ZKEdDSAFrogPCDArgs> {
    const frogPCD = await EdDSAFrogPCDPackage.prove({
      data: {
        value: frogData,
        argumentType: ArgumentTypeName.Object
      },
      privateKey: {
        value: prvKey,
        argumentType: ArgumentTypeName.String
      },
      id: {
        value: undefined,
        argumentType: ArgumentTypeName.String
      }
    });

    const serializedFrogPCD = await EdDSAFrogPCDPackage.serialize(frogPCD);

    const serializedIdentityPCD = await makeSerializedIdentityPCD(identity1);

    const ret: ZKEdDSAFrogPCDArgs = {
      frog: {
        value: serializedFrogPCD,
        argumentType: ArgumentTypeName.PCD,
        pcdType: EdDSAFrogPCDTypeName
      },
      identity: {
        value: serializedIdentityPCD,
        argumentType: ArgumentTypeName.PCD,
        pcdType: SemaphoreIdentityPCDTypeName
      },
      externalNullifier: {
        value: EXTERNAL_NULLIFIER.toString(),
        argumentType: ArgumentTypeName.BigInt
      },
      watermark: {
        value: WATERMARK.toString(),
        argumentType: ArgumentTypeName.BigInt
      }
    };

    return ret;
  }

  this.beforeAll(async function () {
    await EdDSAFrogPCDPackage.init?.({});
    await ZKEdDSAFrogPCDPackage.init?.({
      zkeyFilePath,
      wasmFilePath
    });
  });

  it("should be able to generate and verify a valid proof", async function () {
    const pcdArgs = await toArgs(frogData);
    pcd = await ZKEdDSAFrogPCDPackage.prove(pcdArgs);

    const claim = pcd.claim;
    expect(claim.partialFrog.frogId).to.be.equal(0);
    expect(claim.partialFrog.ownerSemaphoreId).to.be.equal(
      identity1.getCommitment().toString()
    );

    const pubKey = await getEdDSAPublicKey(prvKey);
    expect(claim.signerPublicKey).to.be.deep.equal(pubKey);

    expect(claim.externalNullifier).to.be.equal(EXTERNAL_NULLIFIER.toString());
    expect(claim.nullifierHash).to.be.not.be.undefined;
    expect(claim.watermark).to.be.equal(WATERMARK.toString());

    const verificationRes = await ZKEdDSAFrogPCDPackage.verify(pcd);
    expect(verificationRes).to.be.true;
  });

  it("should prove using default external nullifier if one is not specified", async function () {
    const pcdArgs = await toArgs(frogData);
    pcdArgs.externalNullifier.value = undefined;
    pcd = await ZKEdDSAFrogPCDPackage.prove(pcdArgs);

    const claim = pcd.claim;
    expect(claim.externalNullifier).to.be.equal(
      STATIC_ZK_EDDSA_FROG_PCD_NULLIFIER.toString()
    );
    expect(claim.nullifierHash).to.be.not.be.undefined;

    const verificationRes = await ZKEdDSAFrogPCDPackage.verify(pcd);
    expect(verificationRes).to.be.true;
  });

  async function testProveBadArgs(
    validArgs: ZKEdDSAFrogPCDArgs,
    mutateArgs: (args: ZKEdDSAFrogPCDArgs) => Promise<void>
  ): Promise<void> {
    // Clone validArgs to mutate them into invalidArgs while keeping originals.
    const invalidArgs: ZKEdDSAFrogPCDArgs = JSON.parse(
      JSON.stringify(validArgs)
    );
    await mutateArgs(invalidArgs);
    await assert.rejects(async () => {
      await ZKEdDSAFrogPCDPackage.prove(invalidArgs);
    });
  }

  async function testProveBadFrogArgs(
    validArgs: ZKEdDSAFrogPCDArgs,
    mutateFrog: (frog: IFrogData) => Promise<void>
  ): Promise<void> {
    await testProveBadArgs(validArgs, async (args: ZKEdDSAFrogPCDArgs) => {
      if (!args.frog.value?.pcd) {
        throw new Error("bad test data?");
      }
      const frogPCD = await EdDSAFrogPCDPackage.deserialize(
        args.frog.value.pcd
      );
      mutateFrog(frogPCD.claim.data);
      args.frog.value = await EdDSAFrogPCDPackage.serialize(frogPCD);
    });
  }

  // The frog data is signed using the signer's private eddsa key,
  // it should fail to generate a proof if the frog data was changed.
  it("should not prove with modified frog data", async function () {
    const validArgs = await toArgs(frogData);

    // Frog args set to incorrect values one at a time.
    await testProveBadFrogArgs(validArgs, async (frog: IFrogData) => {
      frog.frogId = 1;
    });

    await testProveBadFrogArgs(validArgs, async (frog: IFrogData) => {
      frog.biome = Biome.Jungle;
    });

    await testProveBadFrogArgs(validArgs, async (frog: IFrogData) => {
      frog.rarity = Rarity.Common;
    });

    await testProveBadFrogArgs(validArgs, async (frog: IFrogData) => {
      frog.temperament = Temperament.ANGY;
    });

    await testProveBadFrogArgs(validArgs, async (frog: IFrogData) => {
      frog.jump = 1;
    });

    await testProveBadFrogArgs(validArgs, async (frog: IFrogData) => {
      frog.speed = 1;
    });

    await testProveBadFrogArgs(validArgs, async (frog: IFrogData) => {
      frog.intelligence = 1;
    });

    await testProveBadFrogArgs(validArgs, async (frog: IFrogData) => {
      frog.beauty = 1;
    });

    await testProveBadFrogArgs(validArgs, async (frog: IFrogData) => {
      frog.timestampSigned = Date.now() + 10000;
    });

    await testProveBadFrogArgs(validArgs, async (frog: IFrogData) => {
      frog.ownerSemaphoreId = identity2.getCommitment().toString();
    });
  });

  it("should not prove if the semaphore identity doesn't match ownerSemaphoreId", async function () {
    const validArgs = await toArgs(frogData);

    const otherIdentityPCD = await makeSerializedIdentityPCD(identity2);
    await testProveBadArgs(validArgs, async (args: ZKEdDSAFrogPCDArgs) => {
      args.identity.value = otherIdentityPCD;
    });
  });

  async function testVerifyBadClaim(
    validPCD: ZKEdDSAFrogPCD,
    mutateClaim: (claim: ZKEdDSAFrogPCDClaim) => void
  ): Promise<void> {
    // Clone the valid PCD so we can mutate it to be invalid.
    const invalidPCD: ZKEdDSAFrogPCD = JSON.parse(JSON.stringify(validPCD));
    mutateClaim(invalidPCD.claim);

    const verificationRes = await ZKEdDSAFrogPCDPackage.verify(invalidPCD);
    expect(verificationRes).to.be.false;
  }

  it("should not verify a proof with incorrect frog claims", async function () {
    const pcdArgs = await toArgs(frogData);
    const validPCD = await ZKEdDSAFrogPCDPackage.prove(pcdArgs);

    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAFrogPCDClaim) => {
      claim.partialFrog.frogId = 1;
    });

    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAFrogPCDClaim) => {
      claim.partialFrog.biome = Biome.Jungle;
    });

    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAFrogPCDClaim) => {
      claim.partialFrog.rarity = Rarity.Common;
    });

    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAFrogPCDClaim) => {
      claim.partialFrog.temperament = Temperament.ANGY;
    });

    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAFrogPCDClaim) => {
      claim.partialFrog.jump = 1;
    });

    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAFrogPCDClaim) => {
      claim.partialFrog.speed = 1;
    });

    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAFrogPCDClaim) => {
      claim.partialFrog.intelligence = 1;
    });

    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAFrogPCDClaim) => {
      claim.partialFrog.beauty = 1;
    });

    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAFrogPCDClaim) => {
      claim.partialFrog.timestampSigned = Date.now() + 10000;
    });
  });

  it("should not verify a proof with incorrect non-frog claims", async function () {
    const pcdArgs = await toArgs(frogData);
    const validPCD = await ZKEdDSAFrogPCDPackage.prove(pcdArgs);

    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAFrogPCDClaim) => {
      claim.signerPublicKey[0] = "123";
    });

    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAFrogPCDClaim) => {
      claim.signerPublicKey[1] = "123";
    });

    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAFrogPCDClaim) => {
      claim.externalNullifier = "123";
    });

    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAFrogPCDClaim) => {
      claim.nullifierHash = "123";
    });

    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAFrogPCDClaim) => {
      claim.watermark = "123";
    });
  });

  it("should be able to serialize and deserialize a PCD", async function () {
    const serialized = await ZKEdDSAFrogPCDPackage.serialize(pcd);
    const deserialized = await ZKEdDSAFrogPCDPackage.deserialize(
      serialized.pcd
    );
    expect(pcd).to.deep.eq(deserialized);

    const deserializedValid = await ZKEdDSAFrogPCDPackage.verify(deserialized);
    expect(deserializedValid).to.eq(true);
  });
});
