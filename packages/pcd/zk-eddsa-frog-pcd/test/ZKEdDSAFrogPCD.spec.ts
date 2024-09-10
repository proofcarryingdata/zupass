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

const zkeyFilePath = path.join(__dirname, `../artifacts/circuit.zkey`);
const wasmFilePath = path.join(__dirname, `../artifacts/circuit.wasm`);

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
  // Single PCD shared among test cases for simplicity.
  let sharedPCD: ZKEdDSAFrogPCD;

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
      identityV3: identity
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
    sharedPCD = await ZKEdDSAFrogPCDPackage.prove(pcdArgs);

    const claim = sharedPCD.claim;
    expect(claim.partialFrog.frogId).to.be.equal(0);
    expect(claim.partialFrog.ownerSemaphoreId).to.be.equal(
      identity1.getCommitment().toString()
    );

    const pubKey = await getEdDSAPublicKey(prvKey);
    expect(claim.signerPublicKey).to.be.deep.equal(pubKey);

    expect(claim.externalNullifier).to.be.equal(EXTERNAL_NULLIFIER.toString());
    expect(claim.nullifierHash).to.be.not.be.undefined;
    expect(claim.watermark).to.be.equal(WATERMARK.toString());

    const verificationRes = await ZKEdDSAFrogPCDPackage.verify(sharedPCD);
    expect(verificationRes).to.be.true;
  });

  it("should prove using default external nullifier if one is not specified", async function () {
    const pcdArgs = await toArgs(frogData);
    pcdArgs.externalNullifier.value = undefined;
    const pcd = await ZKEdDSAFrogPCDPackage.prove(pcdArgs);

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
    const serialized = await ZKEdDSAFrogPCDPackage.serialize(sharedPCD);
    const deserialized = await ZKEdDSAFrogPCDPackage.deserialize(
      serialized.pcd
    );
    expect(sharedPCD).to.deep.eq(deserialized);

    const deserializedValid = await ZKEdDSAFrogPCDPackage.verify(deserialized);
    expect(deserializedValid).to.eq(true);
  });

  it("should be able to compatibly deserialize a saved PCD", async function () {
    // PCD serialized on 2024-02-08 by code of this test as of main commit 8478b75f5a
    const savedPCD =
      '{"type":"zk-eddsa-frog-pcd","pcd":"{\\"id\\":\\"ef3c45d5-466b-4a8b-bbb9-d68d5f68e095\\",\\"claim\\":{\\"partialFrog\\":{\\"name\\":\\"test name\\",\\"description\\":\\"test description\\",\\"imageUrl\\":\\"/frog.png\\",\\"frogId\\":0,\\"biome\\":0,\\"rarity\\":0,\\"temperament\\":0,\\"jump\\":0,\\"speed\\":0,\\"intelligence\\":0,\\"beauty\\":0,\\"timestampSigned\\":1707360738783,\\"ownerSemaphoreId\\":\\"18711405342588116796533073928767088921854096266145046362753928030796553161041\\"},\\"signerPublicKey\\":[\\"1d5ac1f31407018b7d413a4f52c8f74463b30e6ac2238220ad8b254de4eaa3a2\\",\\"1e1de8a908826c3f9ac2e0ceee929ecd0caf3b99b3ef24523aaab796a6f733c4\\"],\\"externalNullifier\\":\\"42\\",\\"watermark\\":\\"6\\",\\"nullifierHash\\":\\"1517081033071132720435657432021139876572843496027662548196342287861804968602\\"},\\"proof\\":{\\"pi_a\\":[\\"6309217738118897492286114944253760964829823857206059388878610024710014231054\\",\\"12838248983233243152443672744507962169655481323747186320281973636531593384531\\",\\"1\\"],\\"pi_b\\":[[\\"4470107523527921425119063142735752124959897982885298605926564840599163958362\\",\\"21615439528607569986503726881022241496801091076315742457850970676731934444679\\"],[\\"19379548862919133605546657181529806768597627690041452921129174219009405473168\\",\\"3770768116621795640112301289924098960032080115318826372024438011964893835611\\"],[\\"1\\",\\"0\\"]],\\"pi_c\\":[\\"12613842215064694156046209713267405505098974946239483122608822886164077872149\\",\\"14117291538912409884010319692830839171281576682980709352277599727228749407236\\",\\"1\\"],\\"protocol\\":\\"groth16\\",\\"curve\\":\\"bn128\\"},\\"type\\":\\"zk-eddsa-frog-pcd\\"}"}';
    const expectedFrogData: IFrogData = {
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
      timestampSigned: 1707360738783,
      ownerSemaphoreId: identity1.getCommitment().toString()
    };
    const serialized = JSON.parse(savedPCD);
    expect(serialized.type).to.eq(ZKEdDSAFrogPCDPackage.name);
    const deserialized = await ZKEdDSAFrogPCDPackage.deserialize(
      serialized.pcd
    );
    const deserializedValid = await ZKEdDSAFrogPCDPackage.verify(deserialized);
    expect(deserializedValid).to.eq(true);
    expect(deserialized.id).to.eq("ef3c45d5-466b-4a8b-bbb9-d68d5f68e095");
    expect(deserialized.claim.partialFrog).to.deep.eq(expectedFrogData);
    expect(deserialized.claim.signerPublicKey).to.deep.eq([
      "1d5ac1f31407018b7d413a4f52c8f74463b30e6ac2238220ad8b254de4eaa3a2",
      "1e1de8a908826c3f9ac2e0ceee929ecd0caf3b99b3ef24523aaab796a6f733c4"
    ]);
    expect(deserialized.claim.externalNullifier).to.eq(
      EXTERNAL_NULLIFIER.toString()
    );
    expect(deserialized.claim.nullifierHash).to.eq(
      "1517081033071132720435657432021139876572843496027662548196342287861804968602"
    );
    expect(deserialized.claim.watermark).to.eq(WATERMARK.toString());
  });
});
