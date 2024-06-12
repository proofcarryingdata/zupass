import { Button } from "@chakra-ui/react";
import {
  GenericIssuanceSendPipelineEmailResult,
  PipelineDefinition,
  PipelineEmailType,
  requestGenericIssuanceSendPipelineEmail
} from "@pcd/passport-interface";
import { ReactNode, useCallback, useState } from "react";
import styled from "styled-components";
import { ZUPASS_SERVER_URL } from "../../../constants";
import { useJWT } from "../../../helpers/userHooks";

export function SendEmailSection({
  pipeline
}: {
  pipeline: PipelineDefinition;
}): ReactNode {
  const jwt = useJWT();
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<
    GenericIssuanceSendPipelineEmailResult | undefined
  >();
  const sendEmail = useCallback(async () => {
    if (!jwt) {
      alert("you need to be logged in to be able to send an email");
      return;
    }

    setSending(true);
    const result = await requestGenericIssuanceSendPipelineEmail(
      ZUPASS_SERVER_URL,
      jwt,
      pipeline.id,
      PipelineEmailType.EsmeraldaOneClick
    );
    setResult(result);
    setSending(false);
  }, [jwt, pipeline.id]);

  return (
    <div>
      <Button onClick={sendEmail} disabled={sending}>
        {sending ? "Sending..." : "Send Esmeralda One Click Email"}
      </Button>
      {result ? (
        <ResultContainer>
          {result.success
            ? `${result.value.queued} email sends queued`
            : `emails failed to send: ${result.error}`}
        </ResultContainer>
      ) : null}
    </div>
  );
}

const ResultContainer = styled.div`
  margin: 4px;
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.1);
  border-color: 1px solid rgba(255, 255, 255, 0.1);
`;
