import { serializeGPCBoundConfig, serializeGPCRevealedClaims } from "@pcd/gpc";
import { GPCPCD, GPCPCDPackage } from "@pcd/gpc-pcd";
import { FieldLabel, Separator, Spacer, styled } from "@pcd/passport-ui";
import { PCDUI } from "@pcd/pcd-types";
import { useState } from "react";

export const GPCPCDUI: PCDUI<GPCPCD> = {
  renderCardBody: GPCCardBody
};

function GPCCardBody({ pcd }: { pcd: GPCPCD }): JSX.Element {
  const [verifyStatus, setVerifyStatus] = useState("unverified");

  return (
    <Container>
      <p>
        This PCD represents ZK proof about one or more POD (Provable Object
        Data) objects, generated using a GPC (General Purpose Circuit). The
        proof configuration determines what specifically has been proven. This
        may include revealing some of the POD data, or keeping it all hidden.
      </p>

      <Separator />

      <FieldLabel>GPC Proof Config</FieldLabel>
      <pre>{serializeGPCBoundConfig(pcd.claim.config, 2)}</pre>
      <Spacer h={8} />

      <FieldLabel>Revealed Claims</FieldLabel>
      <pre>{serializeGPCRevealedClaims(pcd.claim.revealed, 2)}</pre>
      <Spacer h={8} />
      <label>
        <button
          onClick={async (): Promise<void> =>
            setVerifyStatus(
              (await GPCPCDPackage.verify(pcd)) ? "valid ✅" : "invalid ❌"
            )
          }
        >
          Check
        </button>
        Proof is {verifyStatus}
      </label>
    </Container>
  );
}

const Container = styled.div`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;
