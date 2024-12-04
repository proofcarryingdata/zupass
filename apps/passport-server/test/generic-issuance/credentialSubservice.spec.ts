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
import { assert, expect } from "chai";
import "mocha";
import { step } from "mocha-steps";
import MockDate from "mockdate";
import { CredentialSubservice } from "../../src/services/generic-issuance/subservices/CredentialSubservice";
import { MultiProcessService } from "../../src/services/multiProcessService";
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
    ZUPASS_EDDSA_PRIVATE_KEY = testingEnv.SERVER_EDDSA_PRIVATE_KEY as string;
    zupassPublicKey = await getEdDSAPublicKey(ZUPASS_EDDSA_PRIVATE_KEY);

    await overrideEnvironment({
      ...testingEnv,
      GENERIC_ISSUANCE_ZUPASS_PUBLIC_KEY: JSON.stringify(zupassPublicKey),
      STYTCH_BYPASS: "true",
      NODE_ENV: "test"
    });

    await startTestingApp({});
    credentialSubservice = new CredentialSubservice(
      zupassPublicKey,
      new MultiProcessService()
    );
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
      expect(verifiedCredential.semaphoreId).to.eq(
        identity.getCommitment().toString()
      );
      expect(verifiedCredential.emails?.[0].email).to.eq(emailAddress);
      expect(verifiedCredential.semaphoreId).to.eq(
        identity.getCommitment().toString()
      );
      expectToExist(verifiedCredential.emails?.[0].signer);
      expect(
        isEqualEdDSAPublicKey(
          verifiedCredential.emails?.[0].signer,
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
      expect(verifiedCredential.semaphoreId).to.eq(
        identity.getCommitment().toString()
      );
      expect(verifiedCredential.emails?.[0]).to.be.undefined;
      expect(verifiedCredential.authKey).to.be.undefined;

      // Verifying this with the expectation of a valid email should throw,
      // since the credential does not have an EmailPCD.
      try {
        await credentialSubservice.verifyAndExpectZupassEmail(credential);
        assert(false); // Should not reach here due to thrown exception
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
    const notZupassEmailPCD = await proveEmailPCD(
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
    // Credential containing an EmailPCD not from Zupass
    const notZupassEmailCredential = await signCredentialPayload(
      identity,
      createCredentialPayload(
        await EmailPCDPackage.serialize(notZupassEmailPCD)
      )
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

    const badCredentials = {
      badEmailCredential: notZupassEmailCredential,
      mismatchedIdentityCredential,
      expiredCredential
    };

    for (const [key, credential] of Object.entries(badCredentials)) {
      try {
        await credentialSubservice.verifyAndExpectZupassEmail(credential);
        assert(false, `${key} did not throw exception during verification`);
      } catch (e) {
        expect(e instanceof VerificationError).to.be.true;
      }
    }

    // Calling `verify` on a credential containing an Email PCD not from
    // Zupass will succeed (assuming credential is otherwise valid).
    // To check if the Email PCD is from Zupass, call
    // verifyAndExpectZupassEmail() as shown above
    expect(
      isEqualEdDSAPublicKey(
        // Verify will return a VerifiedCredential containing an
        // emailSignatureClaim
        (await credentialSubservice.verify(notZupassEmailCredential))
          .emails?.[0].signer as EdDSAPublicKey,
        zupassPublicKey
      )
      // But this is not the Zupass public key!
    ).to.be.false;
  });
});
