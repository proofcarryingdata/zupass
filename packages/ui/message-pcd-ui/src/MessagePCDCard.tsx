import { MessagePCD } from "@pcd/message-pcd";
import { styled } from "@pcd/passport-ui";
import { PCDUI } from "@pcd/pcd-types";
import Markdown from "react-markdown";

export const MessagePCDUI: PCDUI<MessagePCD> = {
  renderCardBody: EdDSAMessageCardBody
};

export function EdDSAMessageCardBody({
  pcd
}: {
  pcd: MessagePCD;
}): JSX.Element {
  return (
    <Container>
      {pcd.claim.mdBody ? (
        <Markdown>{pcd.claim.mdBody}</Markdown>
      ) : (
        <div style={{ opacity: 0.5 }}></div>
      )}
    </Container>
  );
}

const Container = styled.div`
  padding: 16px;
  overflow: hidden;
  width: 100%;

  p {
  }

  img {
    margin-top: 8px;
    box-sizing: border-box;
    border-radius: 16px;
    overflow: hidden;
  }
`;
