import { Identity } from "@semaphore-protocol/identity";
import assert from "assert";
import { SemaphoreIdentityPCDPackage } from "../src/SemaphoreIdentityPCD";

describe("Semaphore Identity PCD", function () {
  it("should be instantiatable", async function () {
    const { prove, verify } = SemaphoreIdentityPCDPackage;
    const identity = new Identity();

    const identityPCD = await prove({ identity });
    const valid = await verify(identityPCD);

    assert.equal(valid, true);
  });

  it("should serialize and deserialize properly", async function () {
    const { prove, serialize, deserialize } = SemaphoreIdentityPCDPackage;
    const identity = new Identity();

    const identityPCD = await prove({ identity });

    const serialized = await serialize(identityPCD);
    const deserialized = await deserialize(serialized.pcd);

    assert.equal(
      identityPCD.claim.identity.toString(),
      deserialized.claim.identity.toString()
    );

    assert.equal(deserialized.claim.identity instanceof Identity, true);
  });
});
