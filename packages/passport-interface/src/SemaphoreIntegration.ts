import { ArgumentTypeName } from "@pcd/pcd-types";
import {
  SemaphoreGroupPCD,
  SemaphoreGroupPCDPackage,
  SerializedSemaphoreGroup,
} from "@pcd/semaphore-group-pcd";
import { Group } from "@semaphore-protocol/group";
import { useEffect, useState } from "react";
import { constructPassportPcdGetRequestUrl } from "./PassportInterface";
import { useProof } from "./PCDIntegration";

/**  */
export function requestSemaphoreUrl(
  urlToPassportWebsite: string,
  returnUrl: string,
  urlToSemaphoreGroup: string,
  externalNullifier: string = "1",
  signal: string = "1"
) {
  const url = constructPassportPcdGetRequestUrl<
    typeof SemaphoreGroupPCDPackage
  >(urlToPassportWebsite, returnUrl, SemaphoreGroupPCDPackage.name, {
    externalNullifier: {
      argumentType: ArgumentTypeName.BigInt,
      value: externalNullifier,
      userProvided: false,
    },
    group: {
      argumentType: ArgumentTypeName.Object,
      remoteUrl: urlToSemaphoreGroup,
      userProvided: false,
    },
    identity: {
      argumentType: ArgumentTypeName.PCD,
      value: undefined,
      userProvided: true,
    },
    signal: {
      argumentType: ArgumentTypeName.BigInt,
      value: signal,
      userProvided: false,
    },
  });

  return url;
}
