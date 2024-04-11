import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { Group } from "@semaphore-protocol/group";
import { Identity } from "@semaphore-protocol/identity";
import assert from "assert";
import { expect } from "chai";
import "mocha";
import * as path from "path";
import { SemaphoreGroupPCDArgs, SemaphoreGroupPCDPackage } from "../src";
import { serializeSemaphoreGroup } from "../src/SerializedSemaphoreGroup";

const zkeyFilePath = path.join(__dirname, "../artifacts/16.zkey");
const wasmFilePath = path.join(__dirname, "../artifacts/16.wasm");

describe("semaphore group identity should work", function () {
  // sets up shared Semaphore args across test cases
  let args: SemaphoreGroupPCDArgs;
  this.beforeAll(async function () {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    await SemaphoreGroupPCDPackage.init!({
      zkeyFilePath,
      wasmFilePath
    });

    const identity = new Identity();
    const group = new Group(1, 16);
    group.addMember(identity.commitment);
    const externalNullifier = group.root;
    const signal = 1;

    const identityPCD = await SemaphoreIdentityPCDPackage.serialize(
      await SemaphoreIdentityPCDPackage.prove({ identity })
    );

    args = {
      externalNullifier: {
        argumentType: ArgumentTypeName.BigInt,
        value: externalNullifier + ""
      },
      signal: {
        argumentType: ArgumentTypeName.BigInt,
        value: signal + ""
      },
      group: {
        argumentType: ArgumentTypeName.Object,
        value: serializeSemaphoreGroup(group, "test name")
      },
      identity: {
        argumentType: ArgumentTypeName.PCD,
        pcdType: SemaphoreIdentityPCDPackage.name,
        value: identityPCD
      }
    };
  });

  it("should be able to generate a proof that verifies", async function () {
    const { prove, verify } = SemaphoreGroupPCDPackage;
    const pcd = await prove(args);
    const verified = await verify(pcd);
    assert.equal(verified, true);
  });

  it("should not verify an incorrect proof", async function () {
    const { prove, verify } = SemaphoreGroupPCDPackage;

    const pcd = await prove(args);
    // make the pcd invalid by changing its claim
    pcd.claim.signal = pcd.claim.signal + "1";

    const verified = await verify(pcd);
    assert.equal(verified, false);
  });

  it("serializing and then deserializing a PCD should result in equal PCDs", async function () {
    const { prove, serialize, deserialize } = SemaphoreGroupPCDPackage;
    const pcd = await prove(args);

    const serialized_pcd = await serialize(pcd);
    const deserialized_pcd = await deserialize(serialized_pcd.pcd);

    assert.deepEqual(deserialized_pcd, pcd);
  });

  it("verifying a deserialized PCD that is valid should result in a correct verification", async function () {
    const { prove, verify, serialize, deserialize } = SemaphoreGroupPCDPackage;
    const pcd = await prove(args);

    const serialized_pcd = await serialize(pcd);
    const deserialized_pcd = await deserialize(serialized_pcd.pcd);
    const verified = await verify(deserialized_pcd);

    assert.equal(verified, true);
  });

  it("should be able to compatibly deserialize a saved PCD", async function () {
    const { deserialize, name, verify } = SemaphoreGroupPCDPackage;

    // PCD serialized on 2024-02-08 by code of this test as of main commit 8478b75f5a
    const savedPCD =
      '{"type":"semaphore-group-signal","pcd":"{\\"type\\":\\"semaphore-group-signal\\",\\"id\\":\\"89213886-689d-4c2f-b832-f7cf664d6c69\\",\\"claim\\":{\\"merkleRoot\\":\\"13064835580641604962911847171237268786845572724931247414059860376592812385346\\",\\"depth\\":16,\\"externalNullifier\\":\\"13064835580641604962911847171237268786845572724931247414059860376592812385346\\",\\"nullifierHash\\":\\"11209581975415589062381640485789221095524140851438994938565814911497117659197\\",\\"signal\\":\\"1\\"},\\"proof\\":[\\"1612981191359852074160354037026412973462563980749857114057227863539664830400\\",\\"21564157084736364225545469298119680108984878968361596755530892982316367710325\\",\\"13588435892966069961899366191208537126524505318296018960388658030642701891515\\",\\"11908545882911716754866109140906905341329389196526382122888677212818301759683\\",\\"8329330215849365268505945205468044375979526580081130244774083021411206934400\\",\\"489258648446445283749982817300603862882070444979802746154261441859904640698\\",\\"11185346921165070671736581837488900379001296718329102355834017885197898807278\\",\\"19962693819039176843041482957556179857761974186673045603301560128010677245119\\"]}"}';
    const serialized = JSON.parse(savedPCD);
    expect(serialized.type).to.eq(name);
    const deserialized = await deserialize(serialized.pcd);
    const deserializedValid = await verify(deserialized);
    expect(deserializedValid).to.eq(true);
    expect(deserialized.id).to.eq("89213886-689d-4c2f-b832-f7cf664d6c69");
    expect(deserialized.claim.merkleRoot).to.eq(
      "13064835580641604962911847171237268786845572724931247414059860376592812385346"
    );
    expect(deserialized.claim.depth).to.eq(16);
    expect(deserialized.claim.signal).to.eq("1");
    expect(deserialized.claim.externalNullifier).to.eq(
      "13064835580641604962911847171237268786845572724931247414059860376592812385346"
    );
    expect(deserialized.claim.nullifierHash).to.eq(
      "11209581975415589062381640485789221095524140851438994938565814911497117659197"
    );
  });
});
