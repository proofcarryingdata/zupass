import assert from "assert";
import { WebAuthnPCDArgs, WebAuthnPCDPackage } from "../src/WebAuthnPCD";

jest.mock("@simplewebauthn/browser", () => ({
  startRegistration: async () => ({
    id: "my-new-credential",
    rawId: "my-new-credential",
    response: {
      clientDataJSON: "",
      attestationObject: "",
    },
    clientExtensionResults: {},
    type: "public-key",
  }),
  startAuthentication: async () => ({
    id: "my-existing-credential",
    rawId: "my-existing-credential",
    response: {
      clientDataJSON: "",
      attestationObject: "",
    },
    clientExtensionResults: {},
    type: "public-key",
  }),
}));

const args: WebAuthnPCDArgs = {
  challenge: "challenge",
  origin: "localhost",
  rpID: "rpID",
  authenticator: {
    credentialID: new Uint8Array([1, 2, 3, 4]),
    credentialPublicKey: new Uint8Array([1, 2, 3, 4]),
    counter: 0,
  },
};

describe("WebAuthn PCD", function () {
  it("should be able to generate a proof that verifies", async function () {
    const { prove, verify } = WebAuthnPCDPackage;
    const pcd = await prove(args);
    const verified = await verify(pcd);
    assert.equal(verified, true);
  });

  it("should not verify an incorrect proof", async function () {
    const { prove, verify } = WebAuthnPCDPackage;

    const pcd = await prove(args);
    // make the pcd invalid by changing its claim
    pcd.claim.challenge = pcd.claim.challenge + "1";

    const verified = await verify(pcd);
    assert.equal(verified, false);
  });

  it("serializing and then deserializing a PCD should result in equal PCDs", async function () {
    const { prove, verify, serialize, deserialize } = WebAuthnPCDPackage;
    const pcd = await prove(args);

    const serialized_pcd = await serialize(pcd);
    const deserialized_pcd = await deserialize(serialized_pcd.pcd);
    const verified = await verify(deserialized_pcd);

    assert.equal(verified, true);
  });
});
