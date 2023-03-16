import { Identity } from "@semaphore-protocol/identity";
import assert from "assert";
import { SemaphorePrivateKeyPCDPackage } from "../src/SemaphorePrivateKeyPCD";

describe("Semaphore Private Key PCD", function () {
  it("should be instantiatable", async function () {
    const { prove, verify } = SemaphorePrivateKeyPCDPackage;
    const identity = new Identity();

    const identityPCD = await prove({ privateKey: identity });
    const valid = await verify(identityPCD);

    assert.equal(valid, true);
  });

  it("should serialize and deserialize properly", async function () {
    const { prove, serialize, deserialize } = SemaphorePrivateKeyPCDPackage;
    const identity = new Identity();

    const identityPCD = await prove({ privateKey: identity });

    const serialized = await serialize(identityPCD);
    const deserialized = await deserialize(serialized);

    assert.equal(
      identityPCD.claim.privateKey.toString(),
      deserialized.claim.privateKey.toString()
    );

    assert.equal(deserialized.claim.privateKey instanceof Identity, true);
  });

  it("should work with SemaphorePubKeyRevealPCD", async function () {
    // TODO: implement
  });
});
