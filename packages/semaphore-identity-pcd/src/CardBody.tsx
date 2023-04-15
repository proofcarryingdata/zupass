import { HiddenText } from "@pcd/passport-ui";
import { SemaphoreIdentityPCD } from "@pcd/semaphore-identity-pcd";
import styled from "styled-components";

export function SemaphoreIdentityCardBody({
  pcd,
}: {
  pcd: SemaphoreIdentityPCD;
}) {
  return (
    <Container>
      <HiddenText
        text={pcd.claim.identity.commitment.toString()}
        label="commitment"
      />
    </Container>
  );
}

const Container = styled.div`
  padding: 0px 16px 16px 16px;
  overflow: hidden;
  width: 100%;
`;
