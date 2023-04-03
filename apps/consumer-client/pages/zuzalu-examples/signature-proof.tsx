import {
  requestSemaphoreSignatureUrl,
  usePassportOutput,
  useSemaphoreSignatureProof,
} from "@pcd/passport-interface";
import { useCallback, useState } from "react";
import { CollapsableCode, HomeLink } from "../../components/Core";
import { ExampleContainer } from "../../components/ExamplePage";
import { PendingPCDLoader } from "../../components/PendingPCDLoader";
import { PASSPORT_URL } from "../../src/constants";
import { requestProofFromPassport } from "../../src/util";

/**
 * Example page which shows how to use a Zuzalu-specific prove screen to
 * request a Semaphore Signature PCD as a third party developer.
 */
export default function Page() {
  const [pcdStr, pendingPCDStr] = usePassportOutput();
  const [serverProving, setServerProving] = useState(false);
  const { signatureProof, signatureProofValid } =
    useSemaphoreSignatureProof(pcdStr);
  const [messageToSign, setMessageToSign] = useState<string>("");

  return (
    <>
      <HomeLink />
      <h2>Zuzalu Semaphore Signature Proof</h2>
      <p>
        This page shows a working example of an integration with the Zuzalu
        Passport application which requests and verifies that a particular user
        is a member of the Zuzalu Residents Semaphore Group. Although the data
        that is returned is not specific for Zuzalu, this specific request shows
        a specific screen within the passport which was specifically designed
        for Zuzalu.
      </p>
      <ExampleContainer>
        <input
          style={{ marginBottom: "8px" }}
          placeholder="Message to sign"
          type="text"
          value={messageToSign}
          onChange={(e) => setMessageToSign(e.target.value)}
        />
        <br />
        <button
          disabled={signatureProofValid}
          onClick={useCallback(
            () => requestSemaphoreSignature(messageToSign, serverProving),
            [messageToSign, serverProving]
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
        {pendingPCDStr != "" && (
          <>
            <PendingPCDLoader pendingPCDStr={pendingPCDStr} />
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

// Show the Passport popup, ask the user to sign a message with their sema key.
function requestSemaphoreSignature(
  messageToSign: string,
  serverProving: boolean
) {
  const proofUrl = requestSemaphoreSignatureUrl(
    PASSPORT_URL,
    window.location.origin + "/popup",
    messageToSign,
    serverProving
  );
  requestProofFromPassport(proofUrl);
}
