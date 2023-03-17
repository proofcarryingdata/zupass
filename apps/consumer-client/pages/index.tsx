import {
  requestSemaphoreSignatureProof,
  requestZuzaluMembershipProof,
  useSemaphorePassportProof,
  useSemaphoreSignatureProof,
} from "@pcd/passport-interface";
import { useState } from "react";
import styled from "styled-components";
import { IS_PROD } from "../src/util";

const SEMAPHORE_GROUP_URL = IS_PROD
  ? "https://api.pcd-passport.com/semaphore/1"
  : "http://localhost:3002/semaphore/1";

const PASSPORT_URL = IS_PROD
  ? "https://pcd-passport.com/"
  : "http://localhost:3000/";

export default function Web() {
  const [messageToSign, setMessageToSign] = useState<string>("");

  const {
    semaphoreProof: proof,
    semaphoreGroup: group,
    semaphoreProofValid: valid,
  } = useSemaphorePassportProof(SEMAPHORE_GROUP_URL);

  const { signatureProof, signatureProofValid } = useSemaphoreSignatureProof();

  return (
    <Container>
      <h1>consumer-client</h1>
      <Container>
        <h2>Zuzalu Membership Proof (SemaphoreGroupPCD) </h2>
        <button
          onClick={() => {
            const RETURN_URL = window && window.location.href;
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
        {proof != null && (
          <>
            <h3>Got Zuzalu Membership Proof from Passport</h3>
            <pre>{JSON.stringify(proof, null, 2)}</pre>
            {group && <p>✅ Loaded group, {group.members.length} members</p>}
            {valid === undefined && <p>❓ Proof verifying</p>}
            {valid === false && <p>❌ Proof is invalid</p>}
            {valid === true && <p>✅ Proof is valid</p>}
          </>
        )}
        {valid && <h3>Welcome, anon</h3>}
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
            const RETURN_URL = window && window.location.href;
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
            <pre>{JSON.stringify(proof, null, 2)}</pre>
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
