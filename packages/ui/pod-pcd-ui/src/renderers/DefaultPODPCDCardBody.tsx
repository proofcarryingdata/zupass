import { Card, HiddenText, styled, TextContainer } from "@pcd/passport-ui";
import { podEntriesToJSON } from "@pcd/pod";
import { PODPCD } from "@pcd/pod-pcd";

const StyledPre = styled.pre`
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 400;
  line-height: 135%;
`;

export function DefaultPODPCDCardBody({ pcd }: { pcd: PODPCD }): JSX.Element {
  return (
    <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
      <TextContainer
        style={{
          overflow: "auto",
          maxHeight: "280px",
          backgroundColor: "#F6F8FD"
        }}
      >
        <StyledPre>
          {JSON.stringify(podEntriesToJSON(pcd.claim.entries), null, 2)}
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
