import {
  requestSemaphoreSignatureProof,
  requestZuzaluMembershipProof,
  useSemaphorePassportProof,
  useSemaphoreSignatureProof,
} from "@pcd/passport-interface";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { IS_PROD } from "../src/util";

const SEMAPHORE_GROUP_URL = IS_PROD
  ? "https://api.pcd-passport.com/semaphore/1"
  : "http://localhost:3002/semaphore/1";

const PASSPORT_URL = IS_PROD
  ? "https://pcd-passport.com/"
  : "http://localhost:3000/";

export default function Web() {
  // Semaphore Group PCD
  const {
    proof: semaphoreProof,
    group: semaphoreGroup,
    valid: semaphoreProofValid,
    error: semaphoreError,
  } = useSemaphorePassportProof(SEMAPHORE_GROUP_URL);
  useEffect(() => {
    if (semaphoreError) {
      console.log("error using semaphore passport proof", semaphoreError);
    }
  }, [semaphoreError]);

  // Semaphore Signature PCD
  const [messageToSign, setMessageToSign] = useState<string>("");
  const { signatureProof, signatureProofValid } = useSemaphoreSignatureProof();

  // Remove proof from URL after we've used it
  useEffect(() => {
    if (
      semaphoreProofValid !== undefined ||
      signatureProofValid !== undefined
    ) {
      const url = new URL(window.location.href);
      url.searchParams.delete("proof");
      window.history.replaceState(null, "", url);
    }
  }, [semaphoreProofValid, signatureProofValid]);

  return (
    <Container>
      <h1>consumer-client</h1>
      <Container>
        <h2>Zuzalu Membership Proof (SemaphoreGroupPCD) </h2>
        <button
          onClick={() => {
            const RETURN_URL = window.location.href;
            requestZuzaluMembershipProof(
              PASSPORT_URL,
              RETURN_URL,
              SEMAPHORE_GROUP_URL,
              (url) => {
                window.location.href = url;
              }
            );
          }}
        >
          Request Zuzalu Membership Proof
        </button>
        {semaphoreProof != null && (
          <>
            <h3>Got Zuzalu Membership Proof from Passport</h3>
            <pre>{JSON.stringify(semaphoreProof, null, 2)}</pre>
            {semaphoreGroup && (
              <p>✅ Loaded group, {semaphoreGroup.members.length} members</p>
            )}
            {semaphoreProofValid === undefined && <p>❓ Proof verifying</p>}
            {semaphoreProofValid === false && <p>❌ Proof is invalid</p>}
            {semaphoreProofValid === true && <p>✅ Proof is valid</p>}
          </>
        )}
        {semaphoreProofValid && <h3>Welcome, anon</h3>}
      </Container>
      <Container>
        <h2>Signature or Identity Reveal Proof (SemaphoreSignaturePCD)</h2>
        <input
          placeholder="Message to sign"
          type="text"
          value={messageToSign}
          onChange={(e) => setMessageToSign(e.target.value)}
        />
        <br />
        <br />
        <button
          onClick={() => {
            const RETURN_URL = window.location.href;
            requestSemaphoreSignatureProof(
              PASSPORT_URL,
              RETURN_URL,
              messageToSign,
              (url) => {
                window.location.href = url;
              }
            );
          }}
        >
          Request Semaphore Signature
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
      </Container>
    </Container>
  );
}

const Container = styled.div`
  font-family: system-ui, sans-serif;
`;
