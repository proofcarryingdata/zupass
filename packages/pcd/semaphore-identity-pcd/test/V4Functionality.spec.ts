import { decodePrivateKey, encodePublicKey, POD } from "@pcd/pod";
import {
  v4PublicKey,
  v4PublicKeyToCommitment
} from "@pcd/semaphore-identity-pcd";
import { expect } from "chai";
import "mocha";
import { v3tov4Identity, v4PrivateKey } from "../src";
import { IdentityV3, IdentityV4 } from "../src/forwardedTypes";

describe("Semaphore Identity PCD - extra v4 functionality", function () {
  it("public and private key extraction should work", async function () {
    const original = new IdentityV4();
    expect(original.export()).to.eq(
      IdentityV4.import(v4PrivateKey(original)).export()
    );
    const pod = POD.sign(
      { a: { type: "int", value: 0n } },
      v4PrivateKey(original)
    );
    expect(pod.signerPublicKey).to.eq(v4PublicKey(original));
  });

  it("v4PublicKey", function () {
    const identity = new IdentityV4();
    const privateKey = identity.export();
    const pod = POD.sign({ a: { type: "int", value: 0n } }, privateKey);
    expect(pod.signerPublicKey).to.eq(v4PublicKey(identity));
    expect(encodePublicKey(identity.publicKey)).to.eq(v4PublicKey(identity));
  });

  it("v4PublicKeyToCommitment", function () {
    const identity = new IdentityV4();
    expect(identity.commitment.toString()).to.eq(
      v4PublicKeyToCommitment(v4PublicKey(identity))
    );
  });

  it("v3tov4Identity is deterministic", function () {
    const v3Identity = new IdentityV3(
      '["0x6fc23c81d915921b861d918e7a15f92c11264940c6f37900c9ec9969986cfd","0x748cf7a168a89a78a724ea3b7913956fde6d822ef719af50368b402ce9277c"]'
    );
    expect(v3tov4Identity(v3Identity).export()).to.eq(
      "lpfjxUsaJh6C5q7G7glXR6X1mSt4fiA6s0ewLeCi9f4="
    );
    expect(v3tov4Identity(v3Identity)).to.deep.eq(v3tov4Identity(v3Identity));
    const privateKey = decodePrivateKey(v3tov4Identity(v3Identity).export());
    expect(privateKey.length).to.eq(32);
  });
});
