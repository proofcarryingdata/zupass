import {
  EdDSAPublicKey,
  getEdDSAPublicKey,
  isEqualEdDSAPublicKey,
  newEdDSAPrivateKey
} from "@pcd/eddsa-pcd";
import { EmailPCDPackage } from "@pcd/email-pcd";
import {
  PODBOX_CREDENTIAL_REQUEST,
  VerificationError,
  ZUPASS_CREDENTIAL_REQUEST,
  createCredentialPayload
} from "@pcd/passport-interface";
import { ONE_DAY_MS } from "@pcd/util";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import "mocha";
import { step } from "mocha-steps";
import MockDate from "mockdate";
import { CredentialSubservice } from "../../src/services/generic-issuance/subservices/CredentialSubservice";
import { overrideEnvironment, testingEnv } from "../util/env";
import { startTestingApp } from "../util/startTestingApplication";
import { expectToExist } from "../util/util";
import {
  makeTestCredential,
  proveEmailPCD,
  signCredentialPayload
} from "./util";

/**
 * Tests for {@link CredentialSubservice}
 */
describe("generic issuance - credential subservice", function () {
  let credentialSubservice: CredentialSubservice;
  let ZUPASS_EDDSA_PRIVATE_KEY: string;
  let zupassPublicKey: EdDSAPublicKey;

  /**
   * Sets up a Zupass/Generic issuance backend.
   */
  this.beforeAll(async () => {
    await overrideEnvironment({
      ...testingEnv,
      GENERIC_ISSUANCE_ZUPASS_PUBLIC_KEY: JSON.stringify(zupassPublicKey),
      STYTCH_BYPASS: "true",
      NODE_ENV: "test"
    });

    ZUPASS_EDDSA_PRIVATE_KEY = process.env.SERVER_EDDSA_PRIVATE_KEY as string;
    zupassPublicKey = await getEdDSAPublicKey(ZUPASS_EDDSA_PRIVATE_KEY);

    await startTestingApp({});
    credentialSubservice = new CredentialSubservice(zupassPublicKey);
  });

  this.afterAll(() => {
    MockDate.reset();
  });

  step("credential subservice can verify credentials", async () => {
    const identity = new Identity();
    const emailAddress = "test@example.com";
    {
      const credential = await makeTestCredential(
        identity,
        PODBOX_CREDENTIAL_REQUEST,
        emailAddress,
        ZUPASS_EDDSA_PRIVATE_KEY
      );

      // Same promise will be returned for the same input
      const verifyPromise = credentialSubservice.verify(credential);
      const secondPromise = credentialSubservice.verify(credential);
      expect(verifyPromise).to.eq(secondPromise);

      // Result is a verified credential containing the expected values
      const verifiedCredential = await verifyPromise;
      expect(verifiedCredential.signatureClaim.identityCommitment).to.eq(
        identity.getCommitment().toString()
      );
      expect(verifiedCredential.emailClaim?.emailAddress).to.eq(emailAddress);
      expect(verifiedCredential.emailClaim?.semaphoreId).to.eq(
        identity.getCommitment().toString()
      );
      expectToExist(verifiedCredential.emailSignatureClaim);
      expect(
        isEqualEdDSAPublicKey(
          verifiedCredential.emailSignatureClaim.publicKey,
          zupassPublicKey
        )
      ).to.be.true;

      // Verifying this with the expectation of a valid email should produce
      // the same result, as the credential has a valid EmailPCD.
      const verifiedCredentialWithEmail =
        await credentialSubservice.verifyAndExpectZupassEmail(credential);
      expect(verifiedCredentialWithEmail).to.deep.eq(verifiedCredential);
    }
    {
      const credential = await makeTestCredential(
        identity,
        // Credentials for Zupass feeds do not include Email PCDs
        ZUPASS_CREDENTIAL_REQUEST
      );

      // Same promise will be returned for the same input
      const verifyPromise = credentialSubservice.verify(credential);
      const secondPromise = credentialSubservice.verify(credential);
      expect(verifyPromise).to.eq(secondPromise);

      // Result is a verified credential containing the expected values
      const verifiedCredential = await verifyPromise;
      expect(verifiedCredential.signatureClaim.identityCommitment).to.eq(
        identity.getCommitment().toString()
      );
      expect(verifiedCredential.emailClaim).to.be.undefined;
      expect(verifiedCredential.emailSignatureClaim).to.be.undefined;

      // Verifying this with the expectation of a valid email should throw,
      // since the credential does not have an EmailPCD.
      try {
        expect(
          await credentialSubservice.verifyAndExpectZupassEmail(credential)
        ).to.throw;
      } catch (e) {
        expect(e instanceof VerificationError).to.be.true;
      }
    }
  });

  /**
   * Very similar tests are carried out in Lemonade/Pretix pipelines, but these
   * tests focus specifically on the fact that CredentialSubservice should
   * throw an exception.
   */
  step("credential subservice won't verify invalid credentials", async () => {
    const emailAddress = "test@example.com";
    const identity = new Identity();
    const badEmailPCD = await proveEmailPCD(
      emailAddress,
      // Not the Zupass private key!
      newEdDSAPrivateKey(),
      identity
    );
    const goodEmailPCD = await proveEmailPCD(
      emailAddress,
      ZUPASS_EDDSA_PRIVATE_KEY,
      identity
    );
    // Credential containing an invalid EmailPCD
    const badEmailCredential = await signCredentialPayload(
      identity,
      createCredentialPayload(await EmailPCDPackage.serialize(badEmailPCD))
    );
    const mismatchedIdentityCredential = await signCredentialPayload(
      // Semaphore identity is different from that used by the Email PCD
      new Identity(),
      createCredentialPayload(await EmailPCDPackage.serialize(goodEmailPCD))
    );
    MockDate.set(Date.now() - ONE_DAY_MS);
    const expiredCredential = await signCredentialPayload(
      identity,
      createCredentialPayload(await EmailPCDPackage.serialize(goodEmailPCD))
    );
    MockDate.set(Date.now() + ONE_DAY_MS);

    const badCredentials = [
      badEmailCredential,
      mismatchedIdentityCredential,
      expiredCredential
    ];

    for (const credential of badCredentials) {
      try {
        expect(await credentialSubservice.verify(credential)).to.throw;
      } catch (e) {
        expect(e instanceof VerificationError).to.be.true;
      }
    }
  });
});
