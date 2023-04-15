import { ArgumentTypeName } from "@pcd/pcd-types";
import {
  deserializeSemaphoreGroup,
  SemaphoreGroupPCD,
  SemaphoreGroupPCDPackage,
  SerializedSemaphoreGroup,
} from "@pcd/semaphore-group-pcd";
import { useEffect, useState } from "react";
import { constructPassportPcdGetRequestUrl } from "./PassportInterface";
import { openPassportPopup } from "./PassportPopup";
import { useSerializedPCD } from "./SerializedPCDIntegration";

/**
 * Opens a passport popup to generate a Zuzalu membership proof.
 *
 * popUrl must be the route where the usePassportPopupSetup hook is being served from.
 */
export function openZuzaluMembershipPopup(
  urlToPassportWebsite: string,
  popupUrl: string,
  urlToSemaphoreGroup: string,
  externalNullifier?: string,
  signal?: string,
  proveOnServer?: boolean
) {
  const proofUrl = constructPassportPcdGetRequestUrl<
    typeof SemaphoreGroupPCDPackage
  >(
    urlToPassportWebsite,
    popupUrl,
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

  openPassportPopup(popupUrl, proofUrl);
}

/**
 * React hook which can be used on 3rd party application websites that
 * parses and verifies a PCD representing a Semaphore group membership proof.
 */
export function useSemaphorePassportProof(
  semaphoreGroupUrl: string,
  pcdStr: string
) {
  const [error, setError] = useState<Error | undefined>();
  const semaphoreGroupPCD = useSerializedPCD(SemaphoreGroupPCDPackage, pcdStr);

  // Meanwhile, load the group so that we can verify against it
  const [semaphoreGroup, setGroup] = useState<SerializedSemaphoreGroup>();
  useEffect(() => {
    (async () => {
      if (!semaphoreGroupPCD) return;

      try {
        const res = await fetch(semaphoreGroupUrl);
        const json = await res.text();
        const group = JSON.parse(json) as SerializedSemaphoreGroup;
        setGroup(group);
      } catch (e) {
        setError(e as Error);
      }
    })();
  }, [semaphoreGroupPCD, semaphoreGroupUrl]);

  // Verify the proof
  const [semaphoreProofValid, setValid] = useState<boolean | undefined>();
  useEffect(() => {
    if (semaphoreGroupPCD && semaphoreGroup) {
      verifyProof(semaphoreGroupPCD, semaphoreGroup).then(setValid);
    }
  }, [semaphoreGroupPCD, semaphoreGroup, setValid]);

  return {
    proof: semaphoreGroupPCD,
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

  return expectedGroup.root.toString() === pcd.claim.merkleRoot;
}
