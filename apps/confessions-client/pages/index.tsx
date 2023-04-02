import {
  constructPassportPcdGetRequestUrl,
  usePassportPCD,
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
  const [confession, setConfession] = useState<string>("");
  const [confessions, setConfessions] = useState<any>(null);

  const pcdStr = usePassportPCD()
  const { proof, valid, error } = useSemaphoreProof(
    SEMAPHORE_GROUP_URL,
    confession,
    pcdStr
  )

  useEffect(() =>  {
    if (error) {
      // TODO: display error to the user
      console.error("error using semaphore passport proof", error);
      return;
    }

    if (!valid) return;

    const post = async () => {
      const res = await postConfession(SEMAPHORE_GROUP_URL, confession, pcdStr);
      if (!res.ok) {
        // TODO: display error to the user
        const err = await res.text();
        console.error("error posting confession to the server:", err);
      }
    }
    post()
      .then(() => {
         // TODO: paging
        const list = async () => {
          const conf = await listConfessions(1, 30);
          setConfessions(conf);
        };
        list().catch((e) => {
          console.error(e);
        })
      })
      .catch((e) => {
        console.error(e);
      })
  }, [valid, error, confession, pcdStr]);

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
        {proof != null && (
          <>
            <h3>Got Zuzalu Member Confession Proof from Passport</h3>
            <pre>{JSON.stringify(proof, null, 2)}</pre>
            {valid === undefined && <p>❓ Proof verifying</p>}
            {valid === false && <p>❌ Proof is invalid</p>}
            {valid === true && <p>✅ Proof is valid</p>}
          </>
        )}
      </Container>
      <Container>
        <h2>Confessions</h2>
        {confessions != null && (
          <pre>{JSON.stringify(confessions, null, 2)}</pre>
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

function useSemaphoreProof(
  semaphoreGroupUrl: string,
  confession: string,
  proofStr: string
){
  const { proof, valid: proofValid, error }
    = useSemaphorePassportProof(semaphoreGroupUrl, proofStr);

  // Also check whether the proof signal matches the confession string
  const [valid, setValid] = useState<boolean | undefined>();
  useEffect(() => {
    const valid = proofValid &&
      proof &&
      proof.proof.proof.signal.toString() ===
      generateMessageHashStr(confession);
    setValid(valid);
  }, [proof, confession, proofValid, setValid])
  return { proof, valid, error };
}

const Container = styled.div`
  font-family: system-ui, sans-serif;
  border: 1px solid black;
  border-radius: 8px;
  padding: 8px;
  margin-bottom: 8px;
`;
