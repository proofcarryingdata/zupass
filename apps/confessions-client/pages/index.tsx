import {
  requestSemaphoreUrl,
  useSemaphorePassportProof,
  useSemaphoreSignatureProof,
} from "@pcd/passport-interface";
import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { IS_PROD, PASSPORT_URL, requestProofFromPassport } from "../src/util";

const SEMAPHORE_GROUP_URL = IS_PROD
  ? "https://api.pcd-passport.com/semaphore/1"
  : "http://localhost:3002/semaphore/1";

export default function Web() {
  // Raw string-encoded PCD
  const [pcdStr, setPcdStr] = useState("");

  // Semaphore Group PCD
  const {
    proof: semaphoreProof,
    group: semaphoreGroup,
    valid: semaphoreProofValid,
    error: semaphoreError,
  } = useSemaphorePassportProof(SEMAPHORE_GROUP_URL, pcdStr);
  useEffect(() => {
    if (semaphoreError) {
      console.error("error using semaphore passport proof", semaphoreError);
    }
  }, [semaphoreError]);

  // Semaphore Grorup PCD
  const [confession, setConfession] = useState<string>("");

  // Listen for PCDs coming back from the Passport popup
  useEffect(() => {
    window.addEventListener("message", receiveMessage, false);
    function receiveMessage(ev: MessageEvent<any>) {
      // This next line is important. Extensions including Metamask apparently
      // send messages to every page. Ignore those.
      if (!ev.data.encodedPcd) return;
      console.log("Received message", ev.data);
      setPcdStr(ev.data.encodedPcd);
    }
  }, []);

  return (
    <>
      <h1>Confessions board</h1>
      <Container>
        <h2>Publish confession</h2>
        <input
          placeholder="Confession"
          type="text"
          value={confession}
          onChange={(e) => setConfession(e.target.value)}
        />
        <br />
        <br />
        <button
          onClick={useCallback(
            () => requestSemaphoreProof(confession),
            [confession]
          )}
        >
          Publish confession
        </button>
        {semaphoreProof != null && (
          <>
            <h3>Got Zuzalu Member Confession Proof from Passport</h3>
            <pre>{JSON.stringify(semaphoreProof, null, 2)}</pre>
            {semaphoreProofValid === undefined && <p>❓ Proof verifying</p>}
            {semaphoreProofValid === false && <p>❌ Proof is invalid</p>}
            {semaphoreProofValid === true && <p>✅ Proof is valid</p>}
          </>
        )}
      </Container>
    </>
  );
}

// Show the Passport popup
function requestSemaphoreProof(confession: string) {
  const proofUrl = requestSemaphoreUrl(
    PASSPORT_URL,
    window.location.origin + "/popup",
    SEMAPHORE_GROUP_URL,
    "1",
    confession,
  );
  requestProofFromPassport(proofUrl);
}

const Container = styled.div`
  font-family: system-ui, sans-serif;
  border: 1px solid black;
  border-radius: 8px;
  padding: 8px;
  margin-bottom: 8px;
`;
