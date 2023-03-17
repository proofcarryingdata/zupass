import {
  receivePassportProof,
  requestZuzaluMembershipProof,
} from "@pcd/passport-interface";
import styled from "styled-components";
import { IS_PROD } from "../src/util";

const SEMAPHORE_GROUP_URL = IS_PROD
  ? "https://api.pcd-passport.com/semaphore/1"
  : "http://localhost:3002/semaphore/1";

const PASSPORT_URL = IS_PROD
  ? "https://pcd-passport.com/"
  : "http://localhost:3000/";

export default function Web() {
  const {
    semaphoreProof: proof,
    semaphoreGroup: group,
    semaphoreProofValid: valid,
  } = receivePassportProof(SEMAPHORE_GROUP_URL);

  return (
    <Container>
      <h1>Welcome to Zuzalu!</h1>
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
        Prove Residency
      </button>
      {proof != null && (
        <>
          <h2>Got Zuzalu Membership Proof from Passport</h2>
          <pre>{JSON.stringify(proof, null, 2)}</pre>
          <h2>Verifying proof...</h2>
          {group && <p>✅ Loaded group, {group.members.length} members</p>}
          {valid === false && <p>❓ Proof verifying</p>}
          {valid === false && <p>❌ Proof is invalid</p>}
          {valid === true && <p>✅ Proof is valid</p>}
        </>
      )}
      {valid && <h2>Welcome, anon</h2>}
    </Container>
  );
}

const Container = styled.div`
  font-family: system-ui, sans-serif;
`;
