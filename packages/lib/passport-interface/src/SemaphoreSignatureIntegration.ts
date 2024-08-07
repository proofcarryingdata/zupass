import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import {
  SemaphoreSignaturePCD,
  SemaphoreSignaturePCDPackage
} from "@pcd/semaphore-signature-pcd";
import { useEffect } from "react";
import { constructZupassPcdGetRequestUrl } from "./PassportInterface";
import { openZupassPopup } from "./PassportPopup/core";
import { useSerializedPCD } from "./SerializedPCDIntegration";

/**
 * Opens a Zupass popup to generate a Semaphore signature proof.
 *
 * @param urlToZupassClient URL of the Zupass client
 * @param popupUrl Route where the useZupassPopupSetup hook is being served from
 * @param messageToSign Message being attested to
 * @param proveOnServer Boolean indicating whether proof should be generated on server
 */
export function openSemaphoreSignaturePopup(
  urlToZupassClient: string,
  popupUrl: string,
  messageToSign: string,
  proveOnServer?: boolean
): void {
  const proofUrl = constructZupassPcdGetRequestUrl<
    typeof SemaphoreSignaturePCDPackage
  >(
    urlToZupassClient,
    popupUrl,
    SemaphoreSignaturePCDPackage.name,
    {
      identity: {
        argumentType: ArgumentTypeName.PCD,
        pcdType: SemaphoreIdentityPCDPackage.name,
        value: undefined,
        userProvided: true
      },
      signedMessage: {
        argumentType: ArgumentTypeName.String,
        value: messageToSign,
        userProvided: false
      }
    },
    {
      proveOnServer: proveOnServer
    }
  );

  openZupassPopup(popupUrl, proofUrl);
}

/**
 * WARNING: Deprecated for sign-in purposes!
 *
 * Opens a Zupass popup to generate a Semaphore signature proof on the user's
 * Zuzalu DB uuid, which can then be used to fetch user details from the Zupass
 * server. Built specifically for Zuzalu apps.
 *
 * @param urlToZupassClient URL of the Zupass client
 * @param popupUrl Route where the useZupassPopupSetup hook is being served from
 * @param originalSiteName Name of site requesting proof
 *
 * @deprecated
 */
export function openSignedZuzaluUUIDPopup(
  urlToZupassClient: string,
  popupUrl: string,
  originalSiteName: string
): void {
  const proofUrl = constructZupassPcdGetRequestUrl<
    typeof SemaphoreSignaturePCDPackage
  >(
    urlToZupassClient,
    popupUrl,
    SemaphoreSignaturePCDPackage.name,
    {
      identity: {
        argumentType: ArgumentTypeName.PCD,
        pcdType: SemaphoreIdentityPCDPackage.name,
        value: undefined,
        userProvided: true
      },
      signedMessage: {
        argumentType: ArgumentTypeName.String,
        userProvided: true,
        value: undefined
      }
    },
    {
      title: "Zuzalu Auth",
      description: originalSiteName
    }
  );

  openZupassPopup(popupUrl, proofUrl);
}

/**
 * Opens a Zupass popup to generate a Semaphore signature proof on the user's
 * Zuzalu DB uuid and website referer, which can then be used to fetch user details
 * from the Zupass server, and ensure that the sign in signature was meant for this
 * website. Built specifically for Zuzalu apps.
 *
 * @param zupassClientUrl URL of the Zupass client
 * @param popupUrl Route where the useZupassPopupSetup hook is being served from
 * @param originalSiteName Name of site requesting proof
 */
export function openSignedZuzaluSignInPopup(
  zupassClientUrl: string,
  popupUrl: string,
  originalSiteName: string
): void {
  const proofUrl = constructZupassPcdGetRequestUrl<
    typeof SemaphoreSignaturePCDPackage
  >(
    zupassClientUrl,
    popupUrl,
    SemaphoreSignaturePCDPackage.name,
    {
      identity: {
        argumentType: ArgumentTypeName.PCD,
        pcdType: SemaphoreIdentityPCDPackage.name,
        value: undefined,
        userProvided: true
      },
      signedMessage: {
        argumentType: ArgumentTypeName.String
      }
    },
    {
      title: "Zuzalu Auth",
      description: originalSiteName,
      signIn: true
    }
  );

  openZupassPopup(popupUrl, proofUrl);
}

/**
 * React hook which can be used on 3rd party application websites that
 * parses and verifies a PCD representing a Semaphore signature proof.
 */
export function useSemaphoreSignatureProof(
  pcdStr: string,
  onVerified: (valid: boolean) => void
): { signatureProof: SemaphoreSignaturePCD | undefined } {
  const semaphoreSignaturePCD = useSerializedPCD(
    SemaphoreSignaturePCDPackage,
    pcdStr
  );

  useEffect(() => {
    if (semaphoreSignaturePCD) {
      const { verify } = SemaphoreSignaturePCDPackage;
      verify(semaphoreSignaturePCD).then(onVerified);
    }
  }, [semaphoreSignaturePCD, onVerified]);

  return {
    signatureProof: semaphoreSignaturePCD
  };
}
