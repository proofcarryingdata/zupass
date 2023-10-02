import {
  PCDGetRequest,
  PCDRequestType,
  ProveOptions,
  useSemaphoreSignatureProof,
  useZupassPopupMessages
} from "@pcd/passport-interface";
import { ArgsOf, ArgumentTypeName, PCDPackage } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { useCallback, useState } from "react";
import { CollapsableCode } from "../components/Core";
import { ExampleContainer } from "../components/ExamplePage";
import { KUDOSBOT_SERVER_UPLOAD_URL, ZUPASS_URL } from "../constants";

export function constructZupassPcdGetRequestUrl<T extends PCDPackage>(
  zupassClientUrl: string,
  returnUrl: string,
  pcdType: T["name"],
  args: ArgsOf<T>,
  options?: ProveOptions
) {
  const req: PCDGetRequest<T> = {
    type: PCDRequestType.Get,
    returnUrl: returnUrl,
    args: args,
    pcdType,
    options
  };
  const encReq = encodeURIComponent(JSON.stringify(req));
  return `${zupassClientUrl}#/prove?request=${encReq}`;
}

const openSemaphoreSignaturePopup = (
  urlToZupassClient: string,
  popupUrl: string,
  returnUrl: string,
  messageToSign: string
) => {
  const proofUrl = constructZupassPcdGetRequestUrl<
    typeof SemaphoreSignaturePCDPackage
  >(urlToZupassClient, returnUrl, SemaphoreSignaturePCDPackage.name, {
    identity: {
      argumentType: ArgumentTypeName.PCD,
      pcdType: SemaphoreIdentityPCDPackage.name,
      value: undefined,
      userProvided: true
    },
    signedMessage: {
      argumentType: ArgumentTypeName.String,
      value: messageToSign,
      userProvided: false
    }
  });
  const url = `${popupUrl}?proofUrl=${encodeURIComponent(proofUrl)}`;
  window.open(url, "_blank", "width=450,height=600,top=100,popup");
};

export default function Page() {
  const [zupassPCDStr, _] = useZupassPopupMessages();
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
                KUDOSBOT_SERVER_UPLOAD_URL,
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
