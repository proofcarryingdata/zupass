import { ArgumentTypeName } from "@pcd/pcd-types";
import { expect } from "chai";
import "mocha";
import {
  Biome,
  EdDSAFrogPCD,
  EdDSAFrogPCDPackage,
  IFrogData,
  Rarity,
  Temperament
} from "../src";

describe("EdDSA frog should work", function () {
  this.timeout(1000 * 30);

  let frog: EdDSAFrogPCD;

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

    frog = await EdDSAFrogPCDPackage.prove({
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
  });

  it("should be able to create and verify a signed frog", async function () {
    expect(await EdDSAFrogPCDPackage.verify(frog)).to.be.true;
  });

  it("should be possible to serialize and deserialize the pcd", async function () {
    const serialized = await EdDSAFrogPCDPackage.serialize(frog);
    const deserialized = await EdDSAFrogPCDPackage.deserialize(serialized.pcd);
    expect(deserialized).to.deep.eq(frog);
  });
});
