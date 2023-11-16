import { styled } from "@pcd/passport-ui";
import { EmailPCD } from "./EmailPCD";
import { getEmailAddress } from "./utils";

export function EmailCardBody({ pcd }: { pcd: EmailPCD }) {
  const emailAddress = getEmailAddress(pcd);

  return (
    <Container>
      <EmailInfo>
        <span>{emailAddress}</span>
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
