import {
  requestSignedZuzaluUUID,
  useFetchParticipant,
  useSemaphoreSignatureProof,
} from "@pcd/passport-interface";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { PASSPORT_SERVER_URL, PASSPORT_URL } from "../src/util";

export default function Web() {
  const { signatureProof, signatureProofValid } = useSemaphoreSignatureProof();
  const [uuid, setUuid] = useState<string | undefined>();

  useEffect(() => {
    if (signatureProofValid && signatureProof) {
      const userUuid = signatureProof.claim.signedMessage;
      setUuid(userUuid);

      const url = new URL(window.location.href);
      url.searchParams.delete("proof");
      window.history.replaceState(null, "", url);
    }
  }, [signatureProofValid, signatureProof]);

  const { participant, error, loading } = useFetchParticipant(
    PASSPORT_SERVER_URL,
    uuid
  );

  return (
    <Container>
      <h1>consumer-client</h1>
      <Container>
        <h2>Zuzalu UUID-revealing proof (SemaphoreSignaturePCD)</h2>
        <button
          onClick={() => {
            const RETURN_URL = window.location.href;
            requestSignedZuzaluUUID(PASSPORT_URL, RETURN_URL, (url) => {
              window.location.href = url;
            });
          }}
        >
          Request UUID
        </button>
        {signatureProof != null && (
          <>
            <h3>Got Semaphore Signature Proof from Passport</h3>
            <pre>{JSON.stringify(signatureProof, null, 2)}</pre>
            <p>{`Message signed: ${signatureProof.claim.signedMessage}`}</p>
            {signatureProofValid === undefined && <p>❓ Proof verifying</p>}
            {signatureProofValid === false && <p>❌ Proof is invalid</p>}
            {signatureProofValid === true && <p>✅ Proof is valid</p>}
          </>
        )}
        {participant && <pre>{JSON.stringify(participant, null, 2)}</pre>}
      </Container>
    </Container>
  );
}

const Container = styled.div`
  font-family: system-ui, sans-serif;
`;
