import {
  openSemaphoreSignaturePopup,
  useSemaphoreSignatureProof,
  useZupassPopupMessages
} from "@pcd/passport-interface";
import React, { useCallback, useState } from "react";
import { CollapsableCode } from "../components/Core";
import { ExampleContainer } from "../components/ExamplePage";
import { ZUPASS_URL } from "../constants";

export default function Page() {
  const [zupassPCDStr, zupassPendingPCDStr] = useZupassPopupMessages();
  const [signatureProofValid, setSignatureProofValid] = useState<
    boolean | undefined
  >();
  const onProofVerified = (valid: boolean) => {
    setSignatureProofValid(valid);
  };
  const { signatureProof } = useSemaphoreSignatureProof(
    zupassPCDStr,
    onProofVerified
  );
  const [messageToSign, setMessageToSign] = useState<string>("");

  return (
    <>
      <h2>Kudosbot Proof</h2>
      <p>
        This page shows a working example of an integration with Zupass which
        requests and verifies a signed kudos from a holder of Zupass to another
        holder.
      </p>
      <ExampleContainer>
        <input
          style={{ marginBottom: "8px" }}
          placeholder="User to give kudos to"
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
                ZUPASS_URL,
                window.location.origin + "#/popup",
                messageToSign
              ),
            [messageToSign]
          )}
        >
          Request Kudosbot Proof
        </button>
        {signatureProof != null && (
          <>
            <p>Got Kudosbot Proof from Zupass</p>

            <p>{`Kudos receiver: ${signatureProof.claim.signedMessage}`}</p>
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
