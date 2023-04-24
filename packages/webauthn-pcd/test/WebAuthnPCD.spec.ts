import { generateRegistrationOptions } from "@simplewebauthn/server";
// import { WebAuthnPCDArgs, WebAuthnPCDPackage } from "../src/WebAuthnPCD";

// jest.mock("../helpers/browserSupportsWebAuthn");

// replace
// const mockNavigatorCreate = window.navigator.credentials.create as jest.Mock;
// const mockSupportsWebauthn = browserSupportsWebAuthn as jest.Mock;

describe("WebAuthn PCD", function () {
  // let args: WebAuthnPCDArgs;
  this.beforeAll(async function () {
    const generatedRegistrationOptions = await generateRegistrationOptions({
      rpName: "test-rp-name",
      rpID: "test-rpID",
      userID: "test-user-id",
      userName: "test-username",
      attestationType: "direct",
      challenge: "test-challenge",
      supportedAlgorithmIDs: [-7],
    });
    // const registrationResponse = await startRegistration(
    //   generatedRegistrationOptions
    // );
    // const { verified, registrationInfo } = await verifyRegistrationResponse({
    //   response: registrationResponse,
    //   expectedOrigin: window.location.hostname,
    //   expectedChallenge: generatedRegistrationOptions.challenge,
    //   supportedAlgorithmIDs: [-7],
    // });
    // assert.equal(verified, true, "registration verification failed");
    // assert(registrationInfo, "registrationInfo should be defined");
    // const { counter, credentialID, credentialPublicKey } = registrationInfo;

    // args = {
    //   rpID: "test-rp-id",
    //   origin: window.location.hostname,
    //   challenge: "test-challenge",
    //   authenticator: {
    //     credentialPublicKey,
    //     credentialID,
    //     counter,
    //   },
    // };
  });

  it("should be able to generate a proof that verifies", async function () {
    // TODO
  });

  it("should not verify an incorrect proof", async function () {
    // TODO
  });

  // it("serializing and then deserializing a PCD should result in equal PCDs", async function () {
  //   const { prove, verify, serialize, deserialize } = WebAuthnPCDPackage;
  //   const pcd = await prove(args);

  //   const serialized_pcd = await serialize(pcd);
  //   const deserialized_pcd = await deserialize(serialized_pcd.pcd);
  //   const verified = await verify(deserialized_pcd);

  //   assert.equal(verified, true);
  // });
});
