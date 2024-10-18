import { proofConfigToJSON, revealedClaimsToJSON } from "@pcd/gpc";
import { GPCPCD, GPCPCDPackage } from "@pcd/gpc-pcd";
import {
  Button,
  ErrorContainer,
  FieldLabel,
  Separator,
  Spacer,
  TextContainer,
  styled
} from "@pcd/passport-ui";
import { PCDUI } from "@pcd/pcd-types";
import { getErrorMessage } from "@pcd/util";
import { useState } from "react";

export const GPCPCDUI: PCDUI<GPCPCD> = {
  renderCardBody: GPCCardBody
};

const Container = styled.div`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;

function GPCCardBody({ pcd }: { pcd: GPCPCD }): JSX.Element {
  const [error, setError] = useState<string | undefined>();
  const [verifyStatus, setVerifyStatus] = useState<number>(0);

  const proofButtonColor: React.CSSProperties = {};
  if (verifyStatus > 0) {
    proofButtonColor.color = "white";
    proofButtonColor.background = "green";
  } else if (verifyStatus < 0) {
    proofButtonColor.color = "white";
    proofButtonColor.background = "var(--danger)";
  }

  return (
    <Container>
      <p>
        This is a ZK proof of info about PODs using a General Purpose Circuit.
        You can learn more about PODs and GPCs{" "}
        <a href="https://zupass.org/pod">here</a>.
      </p>

      <Separator />

      <FieldLabel>Proof Config</FieldLabel>
      <p>This specifies what has been proven and revealed.</p>
      <TextContainer
        style={{ overflowX: "auto", maxHeight: "200px", overflowY: "auto" }}
      >
        <pre>
          {JSON.stringify(proofConfigToJSON(pcd.claim.config), null, 2)}
        </pre>
      </TextContainer>
      <Spacer h={8} />

      <FieldLabel>Revealed Claims</FieldLabel>
      <p>These are the entries and metadata revealed in the proof.</p>
      <TextContainer
        style={{ overflowX: "auto", maxHeight: "200px", overflowY: "auto" }}
      >
        <pre>
          {JSON.stringify(revealedClaimsToJSON(pcd.claim.revealed), null, 2)}
        </pre>
      </TextContainer>
      <Spacer h={8} />
      <Button
        style="primary"
        size="small"
        onClick={async (): Promise<void> => {
          const verifyResult = await verifyProof(pcd);
          setError(verifyResult.errorMessage);
          setVerifyStatus(verifyResult.isValid ? 1 : -1);
        }}
        styles={{ float: "right", ...proofButtonColor }}
      >
        {verifyStatus === 0
          ? "Check proof"
          : verifyStatus > 0
          ? "Valid proof"
          : error !== undefined
          ? "Verification error!"
          : "Invalid proof!"}
      </Button>
      {error === undefined ? null : <ErrorContainer>{error}</ErrorContainer>}
    </Container>
  );
}

async function verifyProof(pcd: GPCPCD): Promise<{
  isValid: boolean;
  errorMessage?: string;
}> {
  try {
    const isValid = await GPCPCDPackage.verify(pcd);
    return { isValid };
  } catch (e) {
    return { isValid: false, errorMessage: getErrorMessage(e) };
  }
}
