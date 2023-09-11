import styled from "styled-components";
import { EmailPCD } from "./EmailPCD";
import { getEmailData } from "./utils";

export function EmailCardBody({ pcd }: { pcd: EmailPCD }) {
  const emailData = getEmailData(pcd);

  return (
    <Container>
      <EmailInfo>
        <span>{emailData?.emailAddress}</span>
      </EmailInfo>
    </Container>
  );
}

const Container = styled.span`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;

const EmailInfo = styled.div`
  margin-top: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
`;
