import { ArgumentTypeName } from "@pcd/pcd-types";
import {
  deserializeSemaphoreGroup,
  SemaphoreGroupPCD,
  SemaphoreGroupPCDPackage,
  SerializedSemaphoreGroup,
} from "@pcd/semaphore-group-pcd";
import { useEffect, useState } from "react";
import { constructPassportPcdGetRequestUrl } from "./PassportInterface";
import { useProof } from "./PCDIntegration";

export function requestZuzaluMembershipUrl(
  urlToPassportWebsite: string,
  returnUrl: string,
  urlToSemaphoreGroup: string,
  externalNullifier?: string,
  signal?: string,
  proveOnServer?: boolean
) {
  const url = constructPassportPcdGetRequestUrl<
    typeof SemaphoreGroupPCDPackage
  >(
    urlToPassportWebsite,
    returnUrl,
    SemaphoreGroupPCDPackage.name,
    {
      externalNullifier: {
        argumentType: ArgumentTypeName.BigInt,
        userProvided: false,
        value: externalNullifier ?? "1",
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
        userProvided: false,
        value: signal ?? "1",
      },
    },
    {
      proveOnServer: proveOnServer,
    }
  );

  return url;
}

/**
 * React hook which can be used on 3rd party application websites that
 * parses and verifies a PCD representing a Semaphore group membership proof.
 */
export function useSemaphorePassportProof(
  semaphoreGroupUrl: string,
  proofStr: string
) {
  const [error, setError] = useState<Error | undefined>();
  const semaphoreProof = useProof(SemaphoreGroupPCDPackage, proofStr);

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
  }, [semaphoreProof, semaphoreGroupUrl]);

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
  pcd: SemaphoreGroupPCD,
  serializedExpectedGroup: SerializedSemaphoreGroup
): Promise<boolean> {
  const { verify } = SemaphoreGroupPCDPackage;
  const verified = await verify(pcd);
  if (!verified) return false;

  const expectedGroup = deserializeSemaphoreGroup(serializedExpectedGroup);
  const pcdGroup = deserializeSemaphoreGroup(pcd.claim.group);

  return expectedGroup.root.toString() === pcdGroup.root.toString();
}
