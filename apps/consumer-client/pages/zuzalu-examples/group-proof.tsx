import {
  requestZuzaluMembershipUrl,
  useSemaphorePassportProof,
} from "@pcd/passport-interface";
import { useEffect, useState } from "react";
import { Container } from "../../components/Core";
import {
  IS_PROD,
  PASSPORT_URL,
  requestProofFromPassport,
} from "../../src/util";

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
      <h1>Example PCD-Consuming Client Application</h1>
      <Container>
        <h2>Zuzalu Membership Proof (SemaphoreGroupPCD)</h2>
        <button onClick={requestZuzaluMembershipProof}>
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
    </>
  );
}

// Show the Passport popup, ask the user to show anonymous membership.
function requestZuzaluMembershipProof() {
  const proofUrl = requestZuzaluMembershipUrl(
    PASSPORT_URL,
    window.location.origin + "/popup",
    SEMAPHORE_GROUP_URL
  );

  requestProofFromPassport(proofUrl);
}
