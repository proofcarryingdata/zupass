import {
  requestSignedZuzaluUUIDUrl,
  useFetchParticipant,
  useListenToPCDMessage,
  useSemaphoreSignatureProof,
} from "@pcd/passport-interface";
import { useEffect, useState } from "react";
import { CollapsableCode, HomeLink } from "../../components/Core";
import { ExampleContainer } from "../../components/ExamplePage";
import { PASSPORT_SERVER_URL, PASSPORT_URL } from "../../src/constants";
import { requestProofFromPassport } from "../../src/util";

export default function Page() {
  const pcdStr = useListenToPCDMessage();
  const { signatureProof, signatureProofValid } =
    useSemaphoreSignatureProof(pcdStr);

  // Extract UUID, the signed message of the returned PCD
  const [uuid, setUuid] = useState<string | undefined>();
  useEffect(() => {
    if (signatureProofValid && signatureProof) {
      const userUuid = signatureProof.claim.signedMessage;
      setUuid(userUuid);
    }
  }, [signatureProofValid, signatureProof]);

  // Finally, once we have the UUID, fetch the participant data from Passport.
  const { participant } = useFetchParticipant(PASSPORT_SERVER_URL, uuid);

  return (
    <>
      <HomeLink />
      <h2>Zuzalu UUID-revealing proof </h2>
      <p>
        This proof type is almost the same as <code>SempahoreSignaturePCD</code>
        , except one key feature: the message that is 'signed' within this PCD
        is the user's unique identifier according the the Zuzalu application.
        This uuid can be used to download information about the user from the
        Passport Server, including their name, email, and role.
      </p>
      <ExampleContainer>
        <button onClick={requestSignedZuID}>Request UUID</button>
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
        {participant && (
          <>
            {participant.commitment ===
            signatureProof?.claim.identityCommitment ? (
              <p>✅ Commitment matches</p>
            ) : (
              <p>❌ Commitment does not match</p>
            )}
            <CollapsableCode
              label="Participant Response"
              code={JSON.stringify(participant, null, 2)}
            />
          </>
        )}
      </ExampleContainer>
    </>
  );
}

// Show the Passport popup. Ask for the user's Zuzalu ID.
function requestSignedZuID() {
  const proofUrl = requestSignedZuzaluUUIDUrl(
    PASSPORT_URL,
    window.location.origin + "/popup"
  );
  requestProofFromPassport(proofUrl);
}
