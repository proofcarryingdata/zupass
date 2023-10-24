import { EdDSAPCDClaim } from "@pcd/eddsa-pcd";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { expect } from "chai";
import JSONBig from "json-bigint";
import "mocha";
import {
  Biome,
  EdDSAFrogPCD,
  EdDSAFrogPCDArgs,
  EdDSAFrogPCDClaim,
  EdDSAFrogPCDPackage,
  IFrogData,
  Rarity,
  Temperament
} from "../src";

describe("EdDSA frog should work", function () {
  this.timeout(1000 * 30);

  let frog: EdDSAFrogPCD;
  let pcdArgs: EdDSAFrogPCDArgs;

  this.beforeAll(async () => {
    await EdDSAFrogPCDPackage.init?.({});

    // Key borrowed from https://github.com/iden3/circomlibjs/blob/4f094c5be05c1f0210924a3ab204d8fd8da69f49/test/eddsa.js#L103
    const prvKey =
      "0001020304050607080900010203040506070809000102030405060708090001";

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
      ownerSemaphoreId: "12345"
    };

    pcdArgs = {
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
    };

    frog = await EdDSAFrogPCDPackage.prove(pcdArgs);
  });

  it("should be able to create and verify a signed frog", async function () {
    expect(await EdDSAFrogPCDPackage.verify(frog)).to.be.true;
  });

  it("should be possible to serialize and deserialize the pcd", async function () {
    const serialized = await EdDSAFrogPCDPackage.serialize(frog);
    const deserialized = await EdDSAFrogPCDPackage.deserialize(serialized.pcd);
    expect(deserialized).to.deep.eq(frog);
  });

  it("should not verify a proof with incorrect frog claims", async function () {
    async function testVerifyBadClaim(
      mutateClaim: (claim: EdDSAFrogPCDClaim) => void
    ): Promise<void> {
      // Clone the valid PCD so we can mutate it to be invalid.
      const invalidPCD: EdDSAFrogPCD = JSONBig.parse(JSONBig.stringify(frog));
      mutateClaim(invalidPCD.claim);

      const verificationRes = await EdDSAFrogPCDPackage.verify(invalidPCD);
      expect(verificationRes).to.be.false;
    }

    await testVerifyBadClaim((claim) => {
      claim.data.frogId = 1;
    });
    await testVerifyBadClaim((claim) => {
      claim.data.biome = 1;
    });
    await testVerifyBadClaim((claim) => {
      claim.data.rarity = 1;
    });
    await testVerifyBadClaim((claim) => {
      claim.data.temperament = 1;
    });
    await testVerifyBadClaim((claim) => {
      claim.data.jump = 1;
    });
    await testVerifyBadClaim((claim) => {
      claim.data.speed = 1;
    });
    await testVerifyBadClaim((claim) => {
      claim.data.intelligence = 1;
    });
    await testVerifyBadClaim((claim) => {
      claim.data.intelligence = 1;
    });
    await testVerifyBadClaim((claim) => {
      claim.data.beauty = 1;
    });
    await testVerifyBadClaim((claim) => {
      claim.data.timestampSigned = 1;
    });
    await testVerifyBadClaim((claim) => {
      claim.data.ownerSemaphoreId = "123";
    });
  });

  it("should not verify a proof with incorrect eddsa claims", async function () {
    async function testVerifyBadClaim(
      mutateClaim: (claim: EdDSAPCDClaim) => void
    ): Promise<void> {
      // Clone the valid PCD so we can mutate it to be invalid.
      const invalidPCD: EdDSAFrogPCD = JSONBig.parse(JSONBig.stringify(frog));
      mutateClaim(invalidPCD.proof.eddsaPCD.claim);

      const verificationRes = await EdDSAFrogPCDPackage.verify(invalidPCD);
      expect(verificationRes).to.be.false;
    }

    await testVerifyBadClaim((claim) => {
      claim.message[0] = BigInt(1);
    });
    await testVerifyBadClaim((claim) => {
      claim.publicKey[0] = "123";
    });
    await testVerifyBadClaim((claim) => {
      claim.publicKey[1] = "123";
    });
  });
});
