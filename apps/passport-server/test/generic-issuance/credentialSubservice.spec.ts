import {
  EdDSAPublicKey,
  getEdDSAPublicKey,
  isEqualEdDSAPublicKey
} from "@pcd/eddsa-pcd";
import { PODBOX_CREDENTIAL_REQUEST } from "@pcd/passport-interface";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import "mocha";
import { step } from "mocha-steps";
import { CredentialSubservice } from "../../src/services/generic-issuance/subservices/CredentialSubservice";
import { overrideEnvironment, testingEnv } from "../util/env";
import { startTestingApp } from "../util/startTestingApplication";
import { expectToExist } from "../util/util";
import { makeCredential } from "./util";

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

  step("credential subservice can verify credentials", async () => {
    const identity = new Identity();
    const emailAddress = "test@example.com";
    {
      const credential = await makeCredential(
        ZUPASS_EDDSA_PRIVATE_KEY,
        emailAddress,
        identity,
        PODBOX_CREDENTIAL_REQUEST
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
      const credential = await makeCredential(
        ZUPASS_EDDSA_PRIVATE_KEY,
        emailAddress,
        identity,
        // No Email PCD requested, so even though we include an email
        // address above, no EmailPCD will exist in the payload
        { signatureType: "sempahore-signature-pcd" }
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
      } catch (_e) {
        // Do nothing
      }
    }
  });
});
