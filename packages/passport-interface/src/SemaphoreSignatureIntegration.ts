import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { useEffect, useState } from "react";
import { constructPassportPcdGetRequestUrl } from "./PassportInterface";
import { retrieveProof } from "./PCDIntegration";

export function requestSemaphoreSignatureProof(
  urlToPassportWebsite: string,
  returnUrl: string,
  messageToSign: string,
  navigate: (url: string) => void
) {
  const url = constructPassportPcdGetRequestUrl<
    typeof SemaphoreSignaturePCDPackage
  >(urlToPassportWebsite, returnUrl, SemaphoreSignaturePCDPackage.name, {
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
  });

  navigate(url);
}

/**
 * A function specifically for zuzalu apps - requests a sempahore signature
 * PCD from the passport which contains the user's uuid, which can be used
 * to fetch user details from the passport server.
 */
export function requestSignedZuzaluUUID(
  urlToPassportWebsite: string,
  returnUrl: string,
  navigate: (url: string) => void
) {
  const url = constructPassportPcdGetRequestUrl<
    typeof SemaphoreSignaturePCDPackage
  >(urlToPassportWebsite, returnUrl, SemaphoreSignaturePCDPackage.name, {
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
  });

  navigate(url);
}

/**
 * React hook which can be used on 3rd party application websites that
 * parses and verifies a PCD representing a Semaphore signature proof.
 */
export function useSemaphoreSignatureProof() {
  const signatureProof = retrieveProof<typeof SemaphoreSignaturePCDPackage>(
    SemaphoreSignaturePCDPackage
  );

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
