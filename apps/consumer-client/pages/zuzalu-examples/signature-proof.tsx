import {
  requestSemaphoreSignatureUrl,
  requestZuzaluMembershipUrl,
  useSemaphoreSignatureProof,
} from "@pcd/passport-interface";
import { useCallback, useEffect, useState } from "react";
import { HomeLink } from "../../components/Core";
import {
  IS_PROD,
  PASSPORT_URL,
  requestProofFromPassport,
} from "../../src/util";

const SEMAPHORE_GROUP_URL = IS_PROD
  ? "https://api.pcd-passport.com/semaphore/1"
  : "http://localhost:3002/semaphore/1";

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
      <h2>Semaphore Signature Proof (SemaphoreSignaturePCD)</h2>
      <input
        placeholder="Message to sign"
        type="text"
        value={messageToSign}
        onChange={(e) => setMessageToSign(e.target.value)}
      />
      <br />
      <br />
      <button
        onClick={useCallback(
          () => requestSemaphoreSignature(messageToSign),
          [messageToSign]
        )}
      >
        Request Semaphore Signature
      </button>
      {signatureProof != null && (
        <>
          <h3>Got Semaphore Signature Proof from Passport</h3>
          <pre>{JSON.stringify(signatureProof, null, 2)}</pre>
          <p>{`Message signed: ${signatureProof.claim.signedMessage}`}</p>
          {signatureProofValid === undefined && <p>❓ Proof verifying</p>}
          {signatureProofValid === false && <p>❌ Proof is invalid</p>}
          {signatureProofValid === true && <p>✅ Proof is valid</p>}
        </>
      )}
    </>
  );
}

// Show the Passport popup, ask the user to show anonymous membership.
function requestZuzaluMembershipProof() {
  const proofUrl = requestZuzaluMembershipUrl(
    PASSPORT_URL,
    window.location.origin + "/popup",
    SEMAPHORE_GROUP_URL
  );
  requestProofFromPassport(proofUrl);
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
