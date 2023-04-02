import {
  constructPassportPcdGetRequestUrl,
  usePassportPCD,
  useSemaphorePassportProof,
} from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreGroupPCDPackage } from "@pcd/semaphore-group-pcd";
import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { sha256 } from "js-sha256";
import { IS_PROD, PASSPORT_URL, requestProofFromPassport } from "../src/util";
import { postConfession } from "../src/api";

const SEMAPHORE_GROUP_URL = IS_PROD
  ? "https://api.pcd-passport.com/semaphore/1"
  : "http://localhost:3002/semaphore/1";

export function PublishConfession({
  onPublished,
}: {
  onPublished: () => void;
}) {
  const [confession, setConfession] = useState<string>("");

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

    (async () => {
      const res = await postConfession(SEMAPHORE_GROUP_URL, confession, pcdStr);
      if (!res.ok) {
        // TODO: display error to the user
        const err = await res.text();
        console.error("error posting confession to the server:", err);
      }
    })().then(onPublished)
  }, [valid, error, confession, pcdStr, onPublished]);

  return (
    <>
      <h2>Publish confession</h2>
      <BigInput
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

const BigInput = styled.input`
  width: 80%;
  height: 46px;
  padding: 8px;
  font-size: 16px;
  font-weight: 300;
`;
