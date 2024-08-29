import { encodePublicKey, POD } from "@pcd/pod";
import {
  newV3Identity,
  SemaphoreIdentityPCD
} from "@pcd/semaphore-identity-pcd";
import { randomUUID } from "@pcd/util";
import { Identity } from "@semaphore-protocol/identity";
import assert from "assert";
import { expect } from "chai";
import "mocha";
import { SemaphoreIdentityV4PCDPackage } from "../src/SemaphoreIdentityV4PCDPackage";
import {
  v3tov4Identity,
  v4PrivateKey,
  v4PublicKey,
  v4PublicKeyToCommitment
} from "../src/utils";

describe("Semaphore Identity PCD", function () {
  it("should be instantiatable", async function () {
    const { prove, verify } = SemaphoreIdentityV4PCDPackage;
    const identity = new Identity();

    const identityPCD = await prove({ identity });
    const valid = await verify(identityPCD);

    assert.equal(valid, true);
  });

  it("should serialize and deserialize properly", async function () {
    const { prove, serialize, deserialize } = SemaphoreIdentityV4PCDPackage;
    const identity = new Identity();

    const identityPCD = await prove({ identity });

    const serialized = await serialize(identityPCD);
    const deserialized = await deserialize(serialized.pcd);

    assert.equal(
      identityPCD.claim.identity.export(),
      deserialized.claim.identity.export()
    );

    assert.equal(deserialized.claim.identity instanceof Identity, true);
  });

  it("public and private key extraction should work", async function () {
    const original = new Identity();

    expect(original.export()).to.eq(
      Identity.import(v4PrivateKey(original)).export()
    );

    const pod = POD.sign(
      { a: { type: "int", value: 0n } },
      v4PrivateKey(original)
    );

    expect(pod.signerPublicKey).to.eq(v4PublicKey(original));

    const v4IdentityPCD = await SemaphoreIdentityV4PCDPackage.prove({
      identity: original
    });
    const serialized =
      await SemaphoreIdentityV4PCDPackage.serialize(v4IdentityPCD);
    const deserialized = await SemaphoreIdentityV4PCDPackage.deserialize(
      serialized.pcd
    );
    expect(deserialized.claim.identity.export()).to.eq(original.export());

    expect(v4PublicKey(deserialized.claim.identity)).to.eq(
      v4PublicKey(original)
    );
  });

  it("should be able to compatibly deserialize a saved PCD", async function () {
    const { deserialize, name, verify } = SemaphoreIdentityV4PCDPackage;

    // PCD serialized on 2024-08-22 by code of this test
    const savedPCD =
      '{"type":"semaphore-identity-v4-pcd","pcd":"{\\"type\\":\\"semaphore-identity-v4-pcd\\",\\"id\\":\\"2e02917f-99e7-4ee0-b2bb-0832d1e608e4-v4\\",\\"identity\\":\\"MjAzMTU5OTAwNzk4NDM2MTU4MTQ5MDY1Mjc0OTMxNDY=\\"}"}';
    const serialized = JSON.parse(savedPCD);
    expect(serialized.type).to.eq(name);
    const deserialized = await deserialize(serialized.pcd);
    const deserializedValid = await verify(deserialized);
    expect(deserializedValid).to.eq(true);
    expect(deserialized.id).to.eq("2e02917f-99e7-4ee0-b2bb-0832d1e608e4-v4");
    expect(deserialized.claim.identity).to.deep.eq(
      Identity.import("MjAzMTU5OTAwNzk4NDM2MTU4MTQ5MDY1Mjc0OTMxNDY=")
    );
  });

  it("v4PublicKey", function () {
    const identity = new Identity();
    const privateKey = identity.export();
    const pod = POD.sign({ a: { type: "int", value: 0n } }, privateKey);
    expect(pod.signerPublicKey).to.eq(v4PublicKey(identity));
    expect(encodePublicKey(identity.publicKey)).to.eq(v4PublicKey(identity));
  });

  it("v4PublicKeyToCommitment", function () {
    const identity = new Identity();
    expect(identity.commitment.toString()).to.eq(
      v4PublicKeyToCommitment(v4PublicKey(identity))
    );
  });

  it("v3tov4Identity is deterministic", function () {
    const v3Identity = new SemaphoreIdentityPCD(randomUUID(), {
      identity: newV3Identity()
    });
    expect(v3tov4Identity(v3Identity)).to.deep.eq(v3tov4Identity(v3Identity));
  });
});
