import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { useEffect, useState } from "react";
import { constructPassportPcdGetRequestUrl } from "./PassportInterface";
import { openPassportPopup } from "./PassportPopup";
import { useDeserializedPCD } from "./PCDIntegration";

/**
 * Opens a passport popup to generate a Semaphore signature proof. popUrl must be
 * the route where the usePassportPopupSetup hook is being served from.
 */
export function openSemaphoreSignaturePopup(
  urlToPassportWebsite: string,
  popupUrl: string,
  messageToSign: string,
  proveOnServer?: boolean
) {
  const proofUrl = constructPassportPcdGetRequestUrl<
    typeof SemaphoreSignaturePCDPackage
  >(
    urlToPassportWebsite,
    popupUrl,
    SemaphoreSignaturePCDPackage.name,
    {
      identity: {
        argumentType: ArgumentTypeName.PCD,
        value: undefined,
        userProvided: true,
      },
      signedMessage: {
        argumentType: ArgumentTypeName.String,
        value: messageToSign,
        userProvided: false,
      },
    },
    {
      proveOnServer: proveOnServer,
    }
  );

  openPassportPopup(popupUrl, proofUrl);
}

/**
 * Opens a passport popup to generate a Semaphore signature proof on the user's
 * Zuzalu DB uuid, which can then be used to fetch user details from the passport
 * server. Built specifically for Zuzalu apps. popUrl must be the route where the
 * usePassportPopupSetup hook is being served from.
 */
export function openSignedZuzaluUUIDPopup(
  urlToPassportWebsite: string,
  popupUrl: string,
  proveOnServer?: boolean
) {
  const proofUrl = constructPassportPcdGetRequestUrl<
    typeof SemaphoreSignaturePCDPackage
  >(
    urlToPassportWebsite,
    popupUrl,
    SemaphoreSignaturePCDPackage.name,
    {
      identity: {
        argumentType: ArgumentTypeName.PCD,
        value: undefined,
        userProvided: true,
      },
      signedMessage: {
        argumentType: ArgumentTypeName.String,
        userProvided: true,
        value: undefined,
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
 * parses and verifies a PCD representing a Semaphore signature proof.
 */
export function useSemaphoreSignatureProof(pcdStr: string) {
  const semaphoreSignaturePCD = useDeserializedPCD(
    SemaphoreSignaturePCDPackage,
    pcdStr
  );

  // verify proof
  const [signatureProofValid, setValid] = useState<boolean | undefined>();
  useEffect(() => {
    if (semaphoreSignaturePCD) {
      const { verify } = SemaphoreSignaturePCDPackage;
      verify(semaphoreSignaturePCD).then((verified) => {
        setValid(verified);
      });
    }
  }, [semaphoreSignaturePCD]);

  return {
    semaphoreSignaturePCD,
    signatureProofValid,
  };
}
