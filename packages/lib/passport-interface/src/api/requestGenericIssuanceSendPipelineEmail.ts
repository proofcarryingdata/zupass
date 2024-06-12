import urlJoin from "url-join";
import {
  GenericIssuanceSendPipelineEmailRequest,
  GenericIssuanceSendPipelineEmailResponseValue,
  PipelineEmailType
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Asks the server to send a particular type of email to the users of
 * the given pipeline. Only Podbox admins can invoke this action.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestGenericIssuanceSendPipelineEmail(
  zupassServerUrl: string,
  jwt: string,
  pipelineId: string,
  email: PipelineEmailType
): Promise<GenericIssuanceSendPipelineEmailResult> {
  return httpPostSimple(
    urlJoin(zupassServerUrl, "/generic-issuance/api/send-email"),
    async (resText) => {
      return {
        success: true,
        value: JSON.parse(
          resText
        ) as GenericIssuanceSendPipelineEmailResponseValue
      };
    },
    {
      jwt,
      pipelineId,
      email
    } satisfies GenericIssuanceSendPipelineEmailRequest
  );
}

export type GenericIssuanceSendPipelineEmailResult =
  APIResult<GenericIssuanceSendPipelineEmailResponseValue>;
