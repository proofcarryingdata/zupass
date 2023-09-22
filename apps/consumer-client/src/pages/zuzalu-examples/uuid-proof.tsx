import {
  openSignedZuzaluUUIDPopup,
  useFetchUser,
  usePassportPopupMessages,
  useSemaphoreSignatureProof
} from "@pcd/passport-interface";
import { useEffect, useState } from "react";
import { CollapsableCode, HomeLink } from "../../components/Core";
import { ExampleContainer } from "../../components/ExamplePage";
import { ZUPASS_SERVER_URL, ZUPASS_URL } from "../../constants";

/**
 * Example page which shows how to use a Zuzalu-specific prove screen to
 * request a Semaphore Signature PCD containing the user's uuid as a third
 * party developer.
 */
export default function Page() {
  // We only do client-side proofs for Zuzalu UUID proofs, which means we can
  // ignore any PendingPCDs that would result from server-side proving
  const [pcdStr, _passportPendingPCDStr] = usePassportPopupMessages();

  const [signatureProofValid, setSignatureProofValid] = useState<
    boolean | undefined
  >();
  const onProofVerified = (valid: boolean) => {
    setSignatureProofValid(valid);
  };

  const { signatureProof } = useSemaphoreSignatureProof(
    pcdStr,
    onProofVerified
  );

  // Extract UUID, the signed message of the returned PCD
  const [uuid, setUuid] = useState<string | undefined>();
  useEffect(() => {
    if (signatureProofValid && signatureProof) {
      const userUuid = signatureProof.claim.signedMessage;
      setUuid(userUuid);
    }
  }, [signatureProofValid, signatureProof]);

  // Finally, once we have the UUID, fetch the user data from Passport.
  const { user } = useFetchUser(ZUPASS_SERVER_URL, uuid);

  return (
    <>
      <HomeLink />
      <h2>[DEPRECATED] Zuzalu UUID-revealing proof </h2>
      <p>
        This proof type is almost the same as <code>SempahoreSignaturePCD</code>
        , except one key feature: the message that is 'signed' within this PCD
        is the user's unique identifier according the the Zuzalu application.
        This uuid can be used to download information about the user from the
        Passport Server, including their name, email, and role.
      </p>
      <ExampleContainer>
        <button
          disabled={signatureProofValid}
          onClick={() =>
            openSignedZuzaluUUIDPopup(
              ZUPASS_URL,
              window.location.origin + "#/popup",
              "consumer-client"
            )
          }
        >
          Request UUID
        </button>
        {signatureProof != null && (
          <>
            <h3>Got Semaphore Signature Proof from Passport</h3>
            <p>{`Message signed: ${signatureProof.claim.signedMessage}`}</p>
            {signatureProofValid === undefined && <p>❓ Proof verifying</p>}
            {signatureProofValid === false && <p>❌ Proof is invalid</p>}
            {signatureProofValid === true && <p>✅ Proof is valid</p>}
            <CollapsableCode
              label="PCD Response"
              code={JSON.stringify(signatureProof, null, 2)}
            />
          </>
        )}
        {user && (
          <>
            {user.commitment === signatureProof?.claim.identityCommitment ? (
              <p>✅ Commitment matches</p>
            ) : (
              <p>❌ Commitment does not match</p>
            )}
            <CollapsableCode
              label="User Response"
              code={JSON.stringify(user, null, 2)}
            />
          </>
        )}
      </ExampleContainer>
    </>
  );
}
