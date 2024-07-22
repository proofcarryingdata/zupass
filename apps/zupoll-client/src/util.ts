import { constructZupassPcdGetRequestUrl } from "@pcd/passport-interface/PassportInterface";
import { openZupassPopup } from "@pcd/passport-interface/PassportPopup/core";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreGroupPCDPackage } from "@pcd/semaphore-group-pcd";
import { SemaphoreGroupPCDTypeName } from "@pcd/semaphore-group-pcd/SemaphoreGroupPCD";
import { SemaphoreIdentityPCDTypeName } from "@pcd/semaphore-identity-pcd/SemaphoreIdentityPCD";
import { generateSnarkMessageHash } from "@pcd/util";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en";

export const USE_CREATE_BALLOT_REDIRECT = true;

export function openGroupMembershipPopup(
  urlToZupassClient: string,
  popupUrl: string,
  urlToSemaphoreGroup: string,
  originalSiteName: string,
  signal?: string,
  externalNullifier?: string,
  returnUrl?: string,
  requesterUrl?: string
) {
  const proofUrl = constructZupassPcdGetRequestUrl<
    typeof SemaphoreGroupPCDPackage
  >(
    urlToZupassClient,
    returnUrl || popupUrl,
    SemaphoreGroupPCDTypeName,
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
        pcdType: SemaphoreIdentityPCDTypeName,
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
      title: "SIGN IN WITH ZUPASS",
      description: originalSiteName,
      requesterUrl
    }
  );

  if (returnUrl) {
    window.location.href = proofUrl;
  } else {
    openZupassPopup(popupUrl, proofUrl);
  }
}

export function removeQueryParameters(paramsToRemove?: string[]) {
  if (window?.location) {
    const currentUrl = new URL(window.location.href);

    // If no parameters to remove are provided, redirect to root
    if (!paramsToRemove || paramsToRemove.length === 0) {
      currentUrl.pathname = "/";
      currentUrl.search = ""; // Clear any existing query parameters
    } else {
      // Loop through the list and remove each parameter
      paramsToRemove.forEach((param) => {
        currentUrl.searchParams.delete(param);
      });
    }

    // Update the browser's address bar without refreshing the page
    window.history.replaceState({}, document.title, currentUrl.toString());
  }
}

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");
export function fmtTimeAgo(date: Date): string {
  return timeAgo.format(date);
}
export function fmtTimeFuture(date: Date): string {
  return timeAgo.format(date, { future: true });
}
