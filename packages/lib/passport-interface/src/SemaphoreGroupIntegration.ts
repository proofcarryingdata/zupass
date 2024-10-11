import { ArgumentTypeName } from "@pcd/pcd-types";
import {
  deserializeSemaphoreGroup,
  SemaphoreGroupPCD,
  SemaphoreGroupPCDPackage,
  SerializedSemaphoreGroup
} from "@pcd/semaphore-group-pcd";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { generateSnarkMessageHash } from "@pcd/util";
import { useCallback, useEffect, useState } from "react";
import { requestSemaphoreGroup } from "./api/requestSemaphoreGroup";
import { constructZupassPcdGetRequestUrl } from "./PassportInterface";
import { openZupassPopup } from "./PassportPopup/core";
import { useSerializedPCD } from "./SerializedPCDIntegration";

/**
 * Opens a Zupass popup to generate a Zuzalu membership proof.
 *
 * @param urlToZupassClient URL of the Zupass client
 * @param popupUrl Route where the useZupassPopupSetup hook is being served from
 * @param urlToSemaphoreGroup URL where Zuzalu semaphore group is being served from
 * @param originalSiteName Name of site requesting proof
 * @param signal Optional signal that user is anonymously attesting to
 * @param externalNullifier Optional unique identifier for this SemaphoreGroupPCD
 */
export function openGroupMembershipPopup(
  urlToZupassClient: string,
  popupUrl: string,
  urlToSemaphoreGroup: string,
  originalSiteName: string,
  signal?: string,
  externalNullifier?: string
): void {
  const proofUrl = constructZupassPcdGetRequestUrl<
    typeof SemaphoreGroupPCDPackage
  >(
    urlToZupassClient,
    popupUrl,
    SemaphoreGroupPCDPackage.name,
    {
      externalNullifier: {
        argumentType: ArgumentTypeName.BigInt,
        userProvided: false,
        value:
          externalNullifier ??
          generateSnarkMessageHash(originalSiteName).toString()
      },
      group: {
        argumentType: ArgumentTypeName.Object,
        userProvided: false,
        remoteUrl: urlToSemaphoreGroup
      },
      identity: {
        argumentType: ArgumentTypeName.PCD,
        pcdType: SemaphoreIdentityPCDPackage.name,
        value: undefined,
        userProvided: true
      },
      signal: {
        argumentType: ArgumentTypeName.BigInt,
        userProvided: false,
        value: signal ?? "1"
      }
    },
    {
      title: "Zuzalu Anon Auth",
      description: originalSiteName
    }
  );

  openZupassPopup(popupUrl, proofUrl);
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
): {
  proof: SemaphoreGroupPCD | undefined;
  group: SerializedSemaphoreGroup | undefined;
  error: string | undefined;
} {
  const semaphoreGroupPCD = useSerializedPCD(SemaphoreGroupPCDPackage, pcdStr);
  const [error, setError] = useState<string | undefined>();
  const [semaphoreGroup, setGroup] = useState<SerializedSemaphoreGroup>();

  const loadSemaphoreGroup = useCallback(async () => {
    if (!semaphoreGroupPCD) return;
    const groupResult = await requestSemaphoreGroup(semaphoreGroupUrl);
    if (groupResult.success) {
      setGroup(groupResult.value);
    } else {
      setError(groupResult.error);
    }
  }, [semaphoreGroupPCD, semaphoreGroupUrl]);

  useEffect(() => {
    loadSemaphoreGroup();
  }, [loadSemaphoreGroup]);

  useEffect(() => {
    if (semaphoreGroupPCD && semaphoreGroup) {
      const proofExternalNullifier =
        externalNullifier ??
        generateSnarkMessageHash(originalSiteName).toString();

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
    onVerified
  ]);

  return {
    proof: semaphoreGroupPCD,
    group: semaphoreGroup,
    error
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

  const expectedGroup = await deserializeSemaphoreGroup(
    serializedExpectedGroup
  );
  const sameRoot = expectedGroup.root.toString() === pcd.claim.merkleRoot;

  return sameExternalNullifier && sameRoot;
}
