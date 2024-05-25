import { FieldLabel, HiddenText, Separator, Spacer } from "@pcd/passport-ui";
import { podEntriesToSimplifiedJSON } from "@pcd/pod";
import { PODPCD, PODPCDPackage } from "@pcd/pod-pcd";
import { useState } from "react";
import { Container } from "../CardBody";

export function DefaultPODPCDCardBody({ pcd }: { pcd: PODPCD }): JSX.Element {
  const [sigStatus, setSigStatus] = useState("unvalidated");

  return (
    <Container>
      <p>This PCD represents a signed POD (Provable Object Data)</p>
      <Separator />
      <FieldLabel>POD Entries</FieldLabel>
      <pre>{podEntriesToSimplifiedJSON(pcd.claim.entries, 2)}</pre>
      <Spacer h={8} />
      <FieldLabel>EdDSA Public Key</FieldLabel>
      <HiddenText text={pcd.claim.signerPublicKey} />
      <FieldLabel>EdDSA Signature</FieldLabel>
      <HiddenText text={pcd.proof.signature} />
      <label>
        <button
          style={{
            marginRight: "8px"
          }}
          onClick={async (): Promise<void> =>
            setSigStatus(
              (await PODPCDPackage.verify(pcd)) ? "valid ✅" : "invalid ❌"
            )
          }
        >
          Check
        </button>
        Signature is {sigStatus}
      </label>
    </Container>
  );
}
