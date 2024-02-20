import { EdDSAMessagePCD, getEdDSAMessageBody } from "@pcd/eddsa-message-pcd";
import { styled } from "@pcd/passport-ui";
import { PCDUI } from "@pcd/pcd-types";
import { useMemo } from "react";
import Markdown from "react-markdown";

export const EdDSAMessagePCDUI: PCDUI<EdDSAMessagePCD> = {
  renderCardBody: EdDSAMessageCardBody
};

export function EdDSAMessageCardBody({
  pcd
}: {
  pcd: EdDSAMessagePCD;
}): JSX.Element {
  const strMessage = useMemo(() => {
    const body = getEdDSAMessageBody(pcd);
    return body?.message;
  }, [pcd]);

  return (
    <Container>
      <Markdown>{strMessage}</Markdown>
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
