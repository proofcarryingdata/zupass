import {
  requestSemaphoreSignatureUrl,
  useSemaphoreSignatureProof,
} from "@pcd/passport-interface";
import { useCallback, useEffect, useState } from "react";
import { CollapsableCode, HomeLink } from "../../components/Core";
import { ExampleContainer } from "../../components/ExamplePage";
import { PASSPORT_URL } from "../../src/constants";
import { requestProofFromPassport } from "../../src/util";

export default function Web() {
  // Raw string-encoded PCD
  const [pcdStr, setPcdStr] = useState("");

  // Semaphore Signature PCD
  const [messageToSign, setMessageToSign] = useState<string>("");
  const { signatureProof, signatureProofValid } =
    useSemaphoreSignatureProof(pcdStr);

  // Listen for PCDs coming back from the Passport popup
  useEffect(() => {
    window.addEventListener("message", receiveMessage, false);
    function receiveMessage(ev: MessageEvent<any>) {
      // This next line is important. Extensions including Metamask apparently
      // send messages to every page. Ignore those.
      if (!ev.data.encodedPcd) return;
      console.log("Received message", ev.data);
      setPcdStr(ev.data.encodedPcd);
    }
  }, []);

  return (
    <>
      <HomeLink />
      <h2>Semaphore Signature Proof</h2>
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
            () => requestSemaphoreSignature(messageToSign),
            [messageToSign]
          )}
        >
          Request Semaphore Signature
        </button>
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
function requestSemaphoreSignature(messageToSign: string) {
  const proofUrl = requestSemaphoreSignatureUrl(
    PASSPORT_URL,
    window.location.origin + "/popup",
    messageToSign
  );
  requestProofFromPassport(proofUrl);
}
