import {
  constructPassportPcdGetRequestUrl,
  openPassportPopup,
  usePassportPopupMessages,
  usePCDMultiplexer,
  usePendingPCD,
  useSemaphoreSignatureProof,
} from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { useCallback, useState } from "react";
import { CollapsableCode, HomeLink } from "../../components/Core";
import { ExampleContainer } from "../../components/ExamplePage";
import { PendingPCDStatusDisplay } from "../../components/PendingPCDStatusDisplay";
import { PASSPORT_SERVER_URL, PASSPORT_URL } from "../../src/constants";

/**
 * Example page which shows how to use the generic prove screen to
 * request a Semaphore Signature PCD as a third party developer.
 */
export default function Page() {
  // Populate PCD from either client-side or server-side proving using passport popup
  const [passportPCDStr, passportPendingPCDStr] = usePassportPopupMessages();
  const [pendingPCDStatus, pendingPCDError, serverPCDStr] = usePendingPCD(
    passportPendingPCDStr,
    PASSPORT_SERVER_URL
  );
  const pcdStr = usePCDMultiplexer(passportPCDStr, serverPCDStr);
  
  const [signatureProofValid, setSignatureProofValid] = useState<boolean | undefined>();
  const onProofVerified = (valid: boolean) => {
    setSignatureProofValid(valid);
  };
  const { signatureProof } =
    useSemaphoreSignatureProof(pcdStr, onProofVerified);

  const [serverProving, setServerProving] = useState(false);

  return (
    <>
      <HomeLink />
      <h2>Generic Semaphore Signature Proof</h2>
      <p>
        This page shows a working example of an integration with the Zuzalu
        Passport application which requests and verifies that a particular user
        is a member of the Zuzalu Residents Semaphore Group. Although the data
        that is returned is not specific for Zuzalu, this specific request shows
        a specific screen within the passport which was specifically designed
        for Zuzalu.
      </p>
      <ExampleContainer>
        <button
          disabled={signatureProofValid}
          onClick={useCallback(
            () => requestSemaphoreSignature(serverProving),
            [serverProving]
          )}
        >
          Request Semaphore Signature
        </button>
        <label>
          <input
            type="checkbox"
            checked={serverProving}
            onChange={() => {
              setServerProving((checked: boolean) => !checked);
            }}
          />
          server-side proof
        </label>
        {passportPendingPCDStr && (
          <>
            <PendingPCDStatusDisplay
              status={pendingPCDStatus}
              pendingPCDError={pendingPCDError}
            />
          </>
        )}
        {signatureProof != null && (
          <>
            <p>Got Semaphore Signature Proof from Passport</p>

            <p>{`Message signed: ${signatureProof.claim.signedMessage}`}</p>
            {signatureProofValid === undefined && <p>❓ Proof verifying</p>}
            {signatureProofValid === false && <p>❌ Proof is invalid</p>}
            {signatureProofValid === true && <p>✅ Proof is valid</p>}
            <CollapsableCode
              label="PCD Response"
              code={JSON.stringify(signatureProof, null, 2)}
            />
          </>
        )}
      </ExampleContainer>
    </>
  );
}

function requestSemaphoreSignature(proveOnServer: boolean) {
  const popupUrl = window.location.origin + "/popup";
  const proofUrl = constructPassportPcdGetRequestUrl<
    typeof SemaphoreSignaturePCDPackage
  >(
    PASSPORT_URL,
    popupUrl,
    SemaphoreSignaturePCDPackage.name,
    {
      identity: {
        argumentType: ArgumentTypeName.PCD,
        value: undefined,
        userProvided: true,
        description: "The identity with which to sign a message.",
      },
      signedMessage: {
        argumentType: ArgumentTypeName.String,
        value: "1",
        userProvided: true,
        description: "The message you want to sign.",
      },
    },
    {
      genericProveScreen: true,
      title: "Semaphore Signature Proof",
      description: "Sign any message with your Semaphore identity.",
      proveOnServer: proveOnServer,
    }
  );

  openPassportPopup(popupUrl, proofUrl);
}
