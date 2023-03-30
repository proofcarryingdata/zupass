import { ArgumentTypeName } from "@pcd/pcd-types";
import {
  SemaphoreGroupPCDPackage,
} from "@pcd/semaphore-group-pcd";
import { constructPassportPcdGetRequestUrl } from "./PassportInterface";

/**  */
export function requestSemaphoreUrl(
  urlToPassportWebsite: string,
  returnUrl: string,
  urlToSemaphoreGroup: string,
  externalNullifier = "1",
  signal = "1"
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
