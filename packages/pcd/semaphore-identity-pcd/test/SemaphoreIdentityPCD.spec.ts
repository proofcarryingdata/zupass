import { Identity as IdentityV3 } from "@pcd/semaphore-identity-v3-wrapper";
import assert from "assert";
import { expect } from "chai";
import {
  IdentityV4,
  SemaphoreIdentityPCDPackage,
  v3tov4Identity
} from "../src";

describe("Semaphore Identity PCD", function () {
  it("should be instantiatable", async function () {
    const { prove, verify } = SemaphoreIdentityPCDPackage;
    const identity = new IdentityV3();

    const identityPCD = await prove({ identityV3: identity });
    const valid = await verify(identityPCD);

    assert.equal(valid, true);
  });

  it("should serialize and deserialize properly", async function () {
    const { prove, serialize, deserialize } = SemaphoreIdentityPCDPackage;
    const identity = new IdentityV3();

    const identityPCD = await prove({ identityV3: identity });

    expect(identityPCD.claim.identityV4.export()).to.eq(
      v3tov4Identity(identity).export()
    );

    const serialized = await serialize(identityPCD);
    const deserialized = await deserialize(serialized.pcd);

    assert.equal(
      identityPCD.claim.identityV3.toString(),
      deserialized.claim.identityV3.toString()
    );
    assert.equal(
      identityPCD.claim.identityV4.export(),
      deserialized.claim.identityV4.export()
    );

    assert.equal(deserialized.claim.identityV3 instanceof IdentityV3, true);
    assert.equal(deserialized.claim.identityV4 instanceof IdentityV4, true);

    const serializedAgain = await serialize(deserialized);
    expect(serializedAgain).to.deep.eq(serialized);
    const deserializedAgain = await deserialize(serializedAgain.pcd);
    expect(deserializedAgain).to.deep.eq(deserialized);
  });

  it("should be able to compatibly deserialize a saved PCD", async function () {
    const { deserialize, name, verify } = SemaphoreIdentityPCDPackage;

    // PCD serialized on 2024-02-08 by code of this test as of main commit 8478b75f5a
    const savedPCD =
      '{"type":"semaphore-identity-pcd","pcd":"{\\"type\\":\\"semaphore-identity-pcd\\",\\"id\\":\\"e3bf14ca-b8eb-4a78-9485-c8b1982a497f\\",\\"identity\\":\\"[\\\\\\"0x5e169461d89b553370b4ac3bae0df93cd7f127abfee5c38d2c1b30d3ebf654\\\\\\",\\\\\\"0xc96157535de33d96ef25e41350cd569b34e97243180ec56a7497eb4f0c3d16\\\\\\"]\\"}"}';
    const serialized = JSON.parse(savedPCD);
    expect(serialized.type).to.eq(name);
    const deserialized = await deserialize(serialized.pcd);
    const deserializedValid = await verify(deserialized);
    expect(deserializedValid).to.eq(true);
    expect(deserialized.id).to.eq("e3bf14ca-b8eb-4a78-9485-c8b1982a497f");
    expect(deserialized.claim.identityV3).to.deep.eq(
      new IdentityV3(
        '["0x5e169461d89b553370b4ac3bae0df93cd7f127abfee5c38d2c1b30d3ebf654","0xc96157535de33d96ef25e41350cd569b34e97243180ec56a7497eb4f0c3d16"]'
      )
    );
    expect(deserialized.claim.identityV4.export()).to.deep.eq(
      "9KF/Pog6A6Qw0kbpvnj+J504cEO80/uJ1WbAwTJVhJ8="
    );
  });
});
