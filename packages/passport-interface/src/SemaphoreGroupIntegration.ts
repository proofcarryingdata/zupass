import { ArgumentTypeName } from "@pcd/pcd-types";
import {
  deserializeSemaphoreGroup,
  generateMessageHash,
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
 * @param urlToPassportWebsite URL of passport website
 * @param popupUrl Route where the usePassportPopupSetup hook is being served from
 * @param urlToSemaphoreGroup URL where Zuzalu semaphore group is being served from
 * @param originalSiteName Name of site requesting proof
 * @param signal Optional signal that user is anonymously attesting to
 * @param externalNullifier Optional unique identifier for this SemaphoreGroupPCD
 */
export function openZuzaluMembershipPopup(
  urlToPassportWebsite: string,
  srcId: string,
  popupUrl: string,
  urlToSemaphoreGroup: string,
  originalSiteName: string,
  signal?: string,
  externalNullifier?: string
) {
  const proofUrl = constructPassportPcdGetRequestUrl<
    typeof SemaphoreGroupPCDPackage
  >(
    urlToPassportWebsite,
    srcId,
    popupUrl,
    SemaphoreGroupPCDPackage.name,
    {
      externalNullifier: {
        argumentType: ArgumentTypeName.BigInt,
        userProvided: false,
        value:
          externalNullifier ?? generateMessageHash(originalSiteName).toString(),
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
      title: "Zuzalu Anon Auth",
      description: originalSiteName,
    }
  );

  openPassportPopup(popupUrl, proofUrl);
}

/**
 * React hook which can be used on 3rd party application websites that
 * parses and verifies a PCD representing a Semaphore group membership proof.
 * Params match those used in openZuzaluMembershipPopup.
 */
export function useSemaphoreGroupProof(
  pcdStr: string,
  semaphoreGroupUrl: string,
  originalSiteName: string,
  onVerified: (valid: boolean) => void,
  externalNullifier?: string
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

  useEffect(() => {
    if (semaphoreGroupPCD && semaphoreGroup) {
      const proofExternalNullifier =
        externalNullifier ?? generateMessageHash(originalSiteName).toString();

      verifyProof(
        semaphoreGroupPCD,
        semaphoreGroup,
        proofExternalNullifier
      ).then(onVerified);
    }
  }, [
    semaphoreGroupPCD,
    semaphoreGroup,
    externalNullifier,
    originalSiteName,
    onVerified,
  ]);

  return {
    proof: semaphoreGroupPCD,
    group: semaphoreGroup,
    error,
  };
}

async function verifyProof(
  pcd: SemaphoreGroupPCD,
  serializedExpectedGroup: SerializedSemaphoreGroup,
  externalNullifier: string
): Promise<boolean> {
  const { verify } = SemaphoreGroupPCDPackage;
  const verified = await verify(pcd);
  if (!verified) return false;

  // verify the claim is for the correct externalNullifier and group
  const sameExternalNullifier =
    pcd.claim.externalNullifier === externalNullifier;

  const expectedGroup = deserializeSemaphoreGroup(serializedExpectedGroup);
  const sameRoot = expectedGroup.root.toString() === pcd.claim.merkleRoot;

  return sameExternalNullifier && sameRoot;
}
