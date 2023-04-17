import {
  openSemaphoreSignaturePopup,
  usePassportPopupMessages,
  usePCDMultiplexer,
  usePendingPCD,
  useSemaphoreSignatureProof,
} from "@pcd/passport-interface";
import { useCallback, useState } from "react";
import { CollapsableCode, HomeLink } from "../../components/Core";
import { ExampleContainer } from "../../components/ExamplePage";
import { PendingPCDStatusDisplay } from "../../components/PendingPCDStatusDisplay";
import { PASSPORT_SERVER_URL, PASSPORT_URL } from "../../src/constants";

/**
 * Example page which shows how to use a Zuzalu-specific prove screen to
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

  const [signatureProofValid, setSignatureProofValid] = useState<
    boolean | undefined
  >();
  const onProofVerified = (valid: boolean) => {
    setSignatureProofValid(valid);
  };

  const { signatureProof } = useSemaphoreSignatureProof(
    pcdStr,
    onProofVerified
  );

  const [messageToSign, setMessageToSign] = useState<string>("");
  const [serverProving, setServerProving] = useState(false);

  return (
    <>
      <HomeLink />
      <h2>Zuzalu Semaphore Signature Proof</h2>
      <p>
        This page shows a working example of an integration with the Zuzalu
        Passport application which requests and verifies that a particular user
        is a member of the Zuzalu Participants Semaphore Group. Although the
        data that is returned is not specific for Zuzalu, this specific request
        shows a specific screen within the passport which was specifically
        designed for Zuzalu.
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
            () =>
              openSemaphoreSignaturePopup(
                PASSPORT_URL,
                window.location.origin + "/popup",
                messageToSign,
                serverProving
              ),
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
