import { Button } from "@chakra-ui/react";
import {
  PipelineEmailType,
  PipelineInfoResponseValue,
  requestGenericIssuanceSendPipelineEmail
} from "@pcd/passport-interface";
import { sleep } from "@pcd/util";
import { ReactNode, useCallback, useState } from "react";
import { ZUPASS_SERVER_URL } from "../../../constants";
import { useJWT } from "../../../helpers/userHooks";

export function SendEmailSection({
  pipelineInfo
}: {
  pipelineInfo: PipelineInfoResponseValue;
}): ReactNode {
  const jwt = useJWT();
  const [sending, setSending] = useState(false);
  const sendEmail = useCallback(async () => {
    if (!jwt) {
      alert("you need to be logged in to be able to send an email");
      return;
    }

    setSending(true);
    requestGenericIssuanceSendPipelineEmail(
      ZUPASS_SERVER_URL,
      jwt,
      PipelineEmailType.EsmeraldaOneClick
    );
    await sleep(2000);
    setSending(false);
  }, [jwt]);

  return (
    <div>
      this is the pipeline send section for the pipeline{" "}
      <Button onClick={sendEmail} disabled={sending}>
        {sending ? "Sending..." : "Send Esmeralda One Click Email"}
      </Button>
    </div>
  );
}
