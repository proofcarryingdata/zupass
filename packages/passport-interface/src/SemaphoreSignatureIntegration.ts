import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { useEffect, useState } from "react";
import { constructPassportPcdGetRequestUrl } from "./PassportInterface";
import { useProof } from "./PCDIntegration";

export function requestSemaphoreSignatureUrl(
  urlToPassportWebsite: string,
  returnUrl: string,
  messageToSign: string,
  serverProving?: boolean
) {
  const url = constructPassportPcdGetRequestUrl<
    typeof SemaphoreSignaturePCDPackage
  >(
    urlToPassportWebsite,
    returnUrl,
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
      server: serverProving,
    }
  );

  return url;
}

/**
 * A function specifically for zuzalu apps - requests a sempahore signature
 * PCD from the passport which contains the user's uuid, which can be used
 * to fetch user details from the passport server.
 */
export function requestSignedZuzaluUUIDUrl(
  urlToPassportWebsite: string,
  returnUrl: string,
  serverProving?: boolean
) {
  const url = constructPassportPcdGetRequestUrl<
    typeof SemaphoreSignaturePCDPackage
  >(
    urlToPassportWebsite,
    returnUrl,
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
      server: serverProving,
    }
  );
  return url;
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
