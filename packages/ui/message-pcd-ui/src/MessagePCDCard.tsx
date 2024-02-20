import { MessagePCD, getMessage } from "@pcd/message-pcd";
import { styled } from "@pcd/passport-ui";
import { PCDUI } from "@pcd/pcd-types";
import { useMemo } from "react";
import Markdown from "react-markdown";

export const MessagePCDUI: PCDUI<MessagePCD> = {
  renderCardBody: EdDSAMessageCardBody
};

export function EdDSAMessageCardBody({
  pcd
}: {
  pcd: MessagePCD;
}): JSX.Element {
  const mdBody = useMemo(() => {
    return getMessage(pcd)?.mdBody;
  }, [pcd]);

  return (
    <Container>
      {mdBody ? (
        <Markdown>{mdBody}</Markdown>
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

  img {
    box-sizing: border-box;
    border-radius: 16px;
    overflow: hidden;
  }
`;
