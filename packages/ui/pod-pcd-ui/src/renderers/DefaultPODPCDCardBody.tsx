import { FieldLabel, HiddenText, Separator, Spacer } from "@pcd/passport-ui";
import { podEntriesToSimplifiedJSON } from "@pcd/pod";
import { PODPCD } from "@pcd/pod-pcd";
import { Container } from "../shared";

export function DefaultPODPCDCardBody({ pcd }: { pcd: PODPCD }): JSX.Element {
  return (
    <Container>
      <p>
        A piece of signed Provable Object Data <br />
        Learn more about PODs <a href="https://zupass.org/pod">here</a>
      </p>
      <Separator />
      <FieldLabel>POD Entries</FieldLabel>
      <pre style={{ overflowX: "auto" }}>
        {podEntriesToSimplifiedJSON(pcd.claim.entries, 2)}
      </pre>
      <Spacer h={8} />
      <FieldLabel>EdDSA Public Key</FieldLabel>
      <HiddenText
        text={pcd.claim.signerPublicKey}
        style={{ overflowX: "auto" }}
      />
      <FieldLabel>EdDSA Signature</FieldLabel>
      <HiddenText text={pcd.proof.signature} style={{ overflowX: "auto" }} />
    </Container>
  );
}
