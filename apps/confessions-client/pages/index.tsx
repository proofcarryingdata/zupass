import {
  constructPassportPcdGetRequestUrl,
  useSemaphorePassportProof,
} from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreGroupPCDPackage } from "@pcd/semaphore-group-pcd";
import { useCallback, useEffect, useState } from "react";
import { sha256 } from "js-sha256";
import styled from "styled-components";
import { IS_PROD, PASSPORT_URL, requestProofFromPassport } from "../src/util";
import { postConfession, listConfessions } from "../src/api";

const SEMAPHORE_GROUP_URL = IS_PROD
  ? "https://api.pcd-passport.com/semaphore/1"
  : "http://localhost:3002/semaphore/1";

export default function Web() {
  // Raw string-encoded PCD
  const [pcdStr, setPcdStr] = useState("");

  // Semaphore Group PCD
  const {
    proof: semaphoreProof,
    valid: groupProofValid,
    error: semaphoreError,
  } = useSemaphorePassportProof(SEMAPHORE_GROUP_URL, pcdStr);

  const [semaphoreProofValid, setSemaphoreProofValid] = useState<boolean | undefined>();

  useEffect(() => {
    if (semaphoreError) {
      console.error("error using semaphore passport proof", semaphoreError);
    }

    // Also check whether the proof signal matches the confession string
    const proofValid = groupProofValid &&
      semaphoreProof &&
      semaphoreProof.proof.proof.signal.toString() ===
      generateMessageHashStr(confession);

    setSemaphoreProofValid(proofValid);
  }, [semaphoreError, semaphoreProof, groupProofValid]);

  useEffect(() =>  {
    if (!semaphoreProofValid) return;

    // TODO: send real proof
    const res = postConfession(SEMAPHORE_GROUP_URL, confession, "proofasdfasdfs");
    console.log(res);
    // TODO: handle error
    // if (!res.ok) {
    //   console.error("error sending confession to the server");
    // }
    const response = listConfessions(1, 20);
    console.log(response);
  }, [semaphoreProofValid]);

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
      <h1>Confessions Board</h1>
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
          Publish
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

function generateMessageHashStr(message: string): string {
  return (BigInt("0x" + sha256(message)) >> BigInt(8)).toString();
}

// Show the Passport popup
function requestSemaphoreProof(confession: string) {
  const proofUrl = constructPassportPcdGetRequestUrl<
    typeof SemaphoreGroupPCDPackage
  >(
    PASSPORT_URL,
    window.location.origin + "/popup",
    SemaphoreGroupPCDPackage.name,
    {
      externalNullifier: {
        argumentType: ArgumentTypeName.BigInt,
        value: "1",
        userProvided: false,
      },
      group: {
        argumentType: ArgumentTypeName.Object,
        remoteUrl: SEMAPHORE_GROUP_URL,
        userProvided: false,
      },
      identity: {
        argumentType: ArgumentTypeName.PCD,
        value: undefined,
        userProvided: true,
      },
      signal: {
        argumentType: ArgumentTypeName.BigInt,
        value: generateMessageHashStr(confession),
        userProvided: false,
      }
    },
    {
      genericProveScreen: true,
      title: "Zuzalu Member Confession Group",
      debug: false,
    }
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
