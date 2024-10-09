import {
  Card,
  FieldLabel,
  HiddenText,
  Separator,
  Spacer,
  styled,
  TextContainer
} from "@pcd/passport-ui";
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
      <TextContainer
        style={{ overflowX: "auto", maxHeight: "300px", overflowY: "auto" }}
      >
        <pre>{podEntriesToSimplifiedJSON(pcd.claim.entries, 2)}</pre>
      </TextContainer>
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

const StyledPre = styled.pre`
  color: var(--text-primary);
  // TODO: check about this font-family
  // font-family: "Roboto Mono";
  font-size: 14px;
  font-weight: 400;
  line-height: 135%; /* 18.9px */
`;

export function DefaultPODPCDCardBody2({ pcd }: { pcd: PODPCD }): JSX.Element {
  return (
    <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
      <TextContainer
        style={{
          overflowX: "auto",
          maxHeight: "300px",

          overflowY: "auto",
          backgroundColor: "#F6F8FD"
        }}
      >
        <StyledPre>
          {podEntriesToSimplifiedJSON(pcd.claim.entries, 2)}
        </StyledPre>
      </TextContainer>
      <Card title="EdDSA PUBLIC KEY">
        <HiddenText
          text={pcd.claim.signerPublicKey}
          style={{ overflowX: "auto" }}
        />
      </Card>
      <Card title="EdDSA SIGNATURE">
        <HiddenText text={pcd.proof.signature} style={{ overflowX: "auto" }} />
      </Card>
    </div>
  );
}
