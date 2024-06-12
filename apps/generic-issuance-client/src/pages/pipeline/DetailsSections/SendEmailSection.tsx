import { Button } from "@chakra-ui/react";
import {
  GenericIssuanceSendPipelineEmailResult,
  PipelineDefinition,
  PipelineEmailType,
  requestGenericIssuanceSendPipelineEmail
} from "@pcd/passport-interface";
import { ReactNode, useCallback, useState } from "react";
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
      this is the pipeline send section for the pipeline{" "}
      <Button onClick={sendEmail} disabled={sending}>
        {sending ? "Sending..." : "Send Esmeralda One Click Email"}
      </Button>
      {result ? (result.success ? "success" : "error") : null}
    </div>
  );
}
