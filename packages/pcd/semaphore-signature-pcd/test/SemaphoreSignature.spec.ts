/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { Identity } from "@semaphore-protocol/identity";
import assert from "assert";
import { expect } from "chai";
import "mocha";
import * as path from "path";
import {
  SemaphoreSignaturePCDArgs,
  SemaphoreSignaturePCDPackage
} from "../src/SemaphoreSignaturePCD";

const zkeyFilePath: string = path.join(__dirname, "../artifacts/16.zkey");
const wasmFilePath: string = path.join(__dirname, "../artifacts/16.wasm");

describe("semaphore signature PCD should work", function () {
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

  it("should be able to compatibly deserialize a saved PCD", async function () {
    const { name, verify, deserialize } = SemaphoreSignaturePCDPackage;

    // PCD serialized on 2024-02-08 by code of this test as of main commit 8478b75f5a
    const savedPCD =
      '{"type":"semaphore-signature-pcd","pcd":"{\\"type\\":\\"semaphore-signature-pcd\\",\\"id\\":\\"2b1c202d-a56a-4a8d-8d6c-5d817f16b3dd\\",\\"claim\\":{\\"identityCommitment\\":\\"12788772897535392583695855696168563134694672003423446958896852816015996829870\\",\\"signedMessage\\":\\"Test message\\",\\"nullifierHash\\":\\"1722664411236023567887444421628658926610975507814032936057372856390467008388\\"},\\"proof\\":[\\"15344209994527791075553029912782890147017378428301600919469315168336721680092\\",\\"20004382924472058723282326591775535044150676792437018864894904023709918788378\\",\\"16515060290618401962196251599596042030070134818780206877532429756871429880048\\",\\"10310874745308485955583376052377856581932573823732067629505536752703874895848\\",\\"6959651908903658415359556858481936359398668701823108108474877896331704744538\\",\\"19364970573682319689576995539625000134346492336657653342001453633202158547212\\",\\"7884527367616373506701198359631870281011186467010352756620505578841186488194\\",\\"3370193586682816576351606365279606036337224044955136538706783773832737431258\\"]}"}';
    const serialized = JSON.parse(savedPCD);
    expect(serialized.type).to.eq(name);
    const deserialized = await deserialize(serialized.pcd);
    const deserializedValid = await verify(deserialized);
    expect(deserializedValid).to.eq(true);
    expect(deserialized.id).to.eq("2b1c202d-a56a-4a8d-8d6c-5d817f16b3dd");
    expect(deserialized.claim.signedMessage).to.eq("Test message");
    expect(deserialized.claim.identityCommitment).to.eq(
      "12788772897535392583695855696168563134694672003423446958896852816015996829870"
    );
    expect(deserialized.claim.nullifierHash).to.eq(
      "1722664411236023567887444421628658926610975507814032936057372856390467008388"
    );
  });
});
