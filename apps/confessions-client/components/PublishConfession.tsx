import {
  constructPassportPcdGetRequestUrl,
  usePassportPCD,
  useSemaphorePassportProof,
} from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreGroupPCDPackage } from "@pcd/semaphore-group-pcd";
import { generateMessageHash } from "@pcd/semaphore-signature-pcd";
import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { sha256 } from "js-sha256";
import { PASSPORT_URL, SEMAPHORE_GROUP_URL, requestProofFromPassport } from "../src/util";
import { postConfession } from "../src/api";

/**
 * The use input a new confession, generate a semaphore proof for the confession.
 * Post the semaphore group url, confession and the proof to the /new-confession
 * endpoint on the server.
 * Because the proof already claims that the user belongs to the specified semaphore grorup,
 * jwt is not needed in this case.
 * @param onPublished a callback function which will be called after the new confession is
 * published to the server.
 */
export function PublishConfession({
  onPublished,
}: {
  onPublished: (newConfession: string) => void;
}) {
  const [confession, setConfession] = useState<string>("");

  const pcdStr = usePassportPCD()
  const { proof, valid, error } = useSemaphoreProof(
    SEMAPHORE_GROUP_URL!,
    confession,
    pcdStr
  )

  useEffect(() =>  {
    if (valid === undefined) return; // verifying

    if (error) {
      // TODO: display error to the user
      console.error("error using semaphore passport proof", error);
      return;
    }

    if (!valid) {
      // TODO: display error to the user
      console.error("proof is invalid");
      return;
    }

    console.log(proof);

    (async () => {
      const res = await postConfession(SEMAPHORE_GROUP_URL!, confession, pcdStr);
      if (!res.ok) {
        // TODO: display error to the user
        const err = await res.text();
        console.error("error posting confession to the server:", err);
      }
    })().then(
      () => {
        onPublished(confession)
      }
    )
  }, [proof, valid, error, confession, pcdStr, onPublished]);

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
    </>
  );
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
        value: generateMessageHash(confession).toString(),
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
      proof.claim.signal ===
      generateMessageHash(confession).toString();
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
