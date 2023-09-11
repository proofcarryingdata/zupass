import { FieldLabel, Separator, Spacer, TextContainer } from "@pcd/passport-ui";
import styled from "styled-components";
// import { SemaphoreGroupPCD } from "./EzklSecretPCD";
import { EzklSecretPCD } from "./EzklSecretPCD";

export function EzklSecretCardBody({ pcd }: { pcd: EzklSecretPCD }) {
  return (
    <Container>
      {/* <p>EZKL Secret PCD</p>

      <Separator /> */}

      <FieldLabel>Secret</FieldLabel>
      <TextContainer>{pcd.proof.clearSecret}</TextContainer>
    </Container>
  );
}

const Container = styled.div`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;
