import { ArgumentTypeName } from "@pcd/pcd-types";
import {
  SemaphoreGroupPCD,
  SemaphoreGroupPCDPackage,
  SerializedSemaphoreGroup,
} from "@pcd/semaphore-group-pcd";
import { Group } from "@semaphore-protocol/group";
import { useEffect, useState } from "react";
import { constructPassportPcdGetRequestUrl } from "./PassportInterface";

export function requestZuzaluMembershipProof(
  urlToPassportWebsite: string,
  returnUrl: string,
  urlToSemaphoreGroup: string,
  navigate: (url: string) => void
) {
  const url = constructPassportPcdGetRequestUrl<
    typeof SemaphoreGroupPCDPackage
  >(urlToPassportWebsite, returnUrl, SemaphoreGroupPCDPackage.name, {
    externalNullifier: {
      argumentType: ArgumentTypeName.BigInt,
      userProvided: false,
      value: "1",
    },
    group: {
      argumentType: ArgumentTypeName.Object,
      userProvided: false,
      remoteUrl: urlToSemaphoreGroup,
    },
    identity: {
      argumentType: ArgumentTypeName.PCD,
      value: undefined,
      userProvided: true,
    },
    signal: {
      argumentType: ArgumentTypeName.BigInt,
      value: "1",
      userProvided: false,
    },
  });

  navigate(url);
}

/**
 * React hook which can be used on 3rd party application websites that
 * parses and verifies a PCD representing a Semaphore group membership proof.
 */
export function useSemaphorePassportProof(semaphoreGroupUrl: string) {
  const [error, setError] = useState<Error | undefined>();
  const [semaphoreProof, setProof] = useState<SemaphoreGroupPCD>();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const proofEnc = params.get("proof");
    if (proofEnc) {
      const parsedPCD = JSON.parse(decodeURIComponent(proofEnc));
      SemaphoreGroupPCDPackage.deserialize(parsedPCD.pcd).then((pcd) => {
        setProof(pcd);
        window.history.replaceState(null, document.title, "/");
      });
    }
  }, [setProof]);

  // Meanwhile, load the group so that we can verify against it
  const [semaphoreGroup, setGroup] = useState<SerializedSemaphoreGroup>();
  useEffect(() => {
    (async () => {
      if (!semaphoreProof) return;

      try {
        const res = await fetch(semaphoreGroupUrl);
        const json = await res.text();

        const group = JSON.parse(json) as SerializedSemaphoreGroup;
        setGroup(group);
      } catch (e) {
        setError(e as Error);
      }
    })();
  }, [semaphoreProof]);

  // Verify the proof
  const [semaphoreProofValid, setValid] = useState<boolean | undefined>();
  useEffect(() => {
    if (semaphoreProof && semaphoreGroup) {
      verifyProof(semaphoreProof, semaphoreGroup).then(setValid);
    }
  }, [semaphoreProof, semaphoreGroup, setValid]);

  return {
    proof: semaphoreProof,
    group: semaphoreGroup,
    valid: semaphoreProofValid,
    error,
  };
}

async function verifyProof(
  proof: SemaphoreGroupPCD,
  semaGroup: SerializedSemaphoreGroup
): Promise<boolean> {
  const { deserialize, verify } = SemaphoreGroupPCDPackage;
  const deserialized = await deserialize(JSON.stringify(proof));
  const verified = await verify(deserialized);
  if (!verified) return false;

  const group = new Group(1, 16);
  group.addMembers(semaGroup.members);
  const root = deserialized.proof.proof.merkleTreeRoot;

  return root.toString() === group.root.toString();
}
