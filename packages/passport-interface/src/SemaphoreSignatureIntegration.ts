import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { useEffect, useState } from "react";
import { constructPassportPcdGetRequestUrl } from "./PassportInterface";
import { openPassportPopup } from "./PassportPopup";
import { useProof } from "./PCDIntegration";

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
 * A function specifically for Zuzalu apps - requests a sempahore signature
 * PCD from the passport which contains the user's uuid, which can be used
 * to fetch user details from the passport server.
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
export function useSemaphoreSignatureProof(proofEnc: string) {
  const signatureProof = useProof(SemaphoreSignaturePCDPackage, proofEnc);

  // verify proof
  const [signatureProofValid, setValid] = useState<boolean | undefined>();
  useEffect(() => {
    if (signatureProof) {
      const { verify } = SemaphoreSignaturePCDPackage;
      verify(signatureProof).then((verified) => {
        setValid(verified);
      });
    }
  }, [signatureProof]);

  return {
    signatureProof,
    signatureProofValid,
  };
}
