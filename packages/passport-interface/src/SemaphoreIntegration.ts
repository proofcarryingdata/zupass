import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreGroupPCDPackage } from "@pcd/semaphore-group-pcd";
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
